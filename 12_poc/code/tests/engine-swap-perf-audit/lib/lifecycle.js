// TC-018 reference implementation of the identity lifecycle (02_requirements/identity-lifecycle.md): SM-P (human
// subject, P-01..P-10), SM-I (invitations, I-01..I-07) and SM-M (membership, M-01..M-05, multi-membership MT-1..MT-7)
// with the platform effects: AS account status and memberships, AS grant revocation (INV-6, CH-ESPA-05), revocation
// state (sub, subject suspension), and the CAM membership tuples at the PDP façade.
import crypto from 'node:crypto';
import { opaqueId } from '../../../lib/ids.js';

export const SMP = {
  // from -> allowed targets (identity-lifecycle §4)
  none: ['pending', 'active'], pending: ['active', 'discarded'], active: ['suspended', 'pending_deletion'],
  suspended: ['active', 'pending_deletion'], pending_deletion: ['active', 'deleted'], deleted: [], discarded: [],
};

export class Lifecycle {
  constructor({ s, dataset, graceMs = 5_000, pendingTtlMs = 1_500 }) {
    this.s = s; this.ds = dataset; this.graceMs = graceMs; this.pendingTtlMs = pendingTtlMs;
    this.subjects = new Map(); // sub -> { state, reasons:Set, memberships: Map(tid -> {state, role}), contact, pendingSince, deletionAt }
    this.invites = new Map(); // id -> { token, tid, inviter, contact, role, expiresAt, state }
    this.log = [];
    for (const u of dataset.users) this.subjects.set(u.id, { state: u.status === 'active' ? 'active' : u.status, reasons: new Set(), memberships: new Map(u.memberships.map((m) => [m.tid, { state: 'active', kind: m.kind }])), contact: contactOf(u.id) });
  }
  rec(e) { const r = { t: Date.now(), ...e }; this.log.push(r); return r; }
  async asUser(sub) {
    const st = this.subjects.get(sub);
    const memberships = [...st.memberships.entries()].map(([tid, m]) => ({ tid, kind: m.kind, status: m.state }));
    const status = st.state === 'active' ? 'active' : st.state;
    return this.s.req(`${this.s.topo.urls.asA}/admin/user-status`, { body: { sub, status, memberships } });
  }
  async transition(sub, to, { reason } = {}) {
    let st = this.subjects.get(sub);
    const from = st ? st.state : 'none';
    if (!(SMP[from] || []).includes(to)) return this.rec({ sm: 'SM-P', sub_hash: h(sub), from, to, ok: false, why: 'not_allowed' });
    if (from === 'pending' && to === 'active' && Date.now() - st.pendingSince > this.pendingTtlMs) { st.state = 'discarded'; await this.asUser(sub); return this.rec({ sm: 'SM-P', from, to, ok: false, why: 'pending_expired' }); }
    if (from === 'pending_deletion' && to === 'active' && Date.now() > st.deletionAt) return this.rec({ sm: 'SM-P', from, to, ok: false, why: 'grace_over' });
    if (from === 'suspended' && to === 'active') { if (reason) st.reasons.delete(reason); if (st.reasons.size) { await this.asUser(sub); return this.rec({ sm: 'SM-P', from, to, ok: false, why: 'reasons_remaining', remaining: [...st.reasons] }); } }
    if (!st) { st = { state: 'none', reasons: new Set(), memberships: new Map(), contact: contactOf(sub) }; this.subjects.set(sub, st); }
    // reducing transitions: write the deny mark first (state), then propagate (INV-6, §2.4)
    if (to === 'suspended' || to === 'pending_deletion' || to === 'deleted') {
      if (reason) st.reasons.add(reason);
      st.state = to;
      if (to === 'pending_deletion') st.deletionAt = Date.now() + this.graceMs;
      await this.asUser(sub);
      await this.s.setStatus('subject', sub, 'suspended');
      await this.s.revoke('sub', sub, { reason: `lifecycle_${to}` });
      await this.s.req(`${this.s.topo.urls.asA}/admin/revoke-account-grants`, { body: { sub, reason: `lifecycle_${to}` } });
    } else {
      st.state = to;
      if (to === 'pending') st.pendingSince = Date.now();
      await this.asUser(sub);
      if (to === 'active') await this.s.setStatus('subject', sub, 'active');
    }
    return this.rec({ sm: 'SM-P', sub_hash: h(sub), from, to, ok: true });
  }
  async addMembership(sub, tid, { role = 'member' } = {}) {
    const st = this.subjects.get(sub);
    st.memberships.set(tid, { state: 'active', kind: role });
    await this.asUser(sub);
    const w = await this.s.writeTuples(tid, { writes: [{ resource: { type: 'core/tenant', id: tid }, relation: 'member', subject: { type: 'core/user', id: sub } }], on_duplicate: 'ignore' });
    return this.rec({ sm: 'SM-M', id: 'M-01', sub_hash: h(sub), ok: w.status === 200 });
  }
  /** M-05: remove the membership, the grants of that tenant context only (MT-6), and the user's tuples in the tenant */
  async removeMembership(sub, tid) {
    const st = this.subjects.get(sub);
    st.memberships.delete(tid);
    await this.asUser(sub);
    await this.s.req(`${this.s.topo.urls.asA}/admin/revoke-account-grants`, { body: { sub, tid, reason: 'membership_removed' } });
    // every relation of the subject in this tenant, as stored at the PDP (façade relationship read, tenant-filtered)
    const rd = await this.s.req(`${this.s.topo.urls.pdp}/v1/tenants/${tid}/relationships/read`, { body: { filter: { subject: { type: 'core/user', id: sub } } } });
    const split = (x) => { const i = x.indexOf(':'); return { type: x.slice(0, i), id: x.slice(i + 1) }; };
    const stored = (rd.json()?.tuples || []).map((k) => ({ resource: split(k.object), relation: k.relation, subject: split(k.user) }));
    const del = [{ resource: { type: 'core/tenant', id: tid }, relation: 'member', subject: { type: 'core/user', id: sub } }, ...stored.filter((x) => !(x.resource.type === 'core/tenant' && x.relation === 'member'))];
    for (let i = 0; i < del.length; i += 50) await this.s.req(`${this.s.topo.urls.pdp}/v1/tenants/${tid}/relationships/delete`, { body: { deletes: del.slice(i, i + 50), on_missing: 'ignore' } });
    return this.rec({ sm: 'SM-M', id: 'M-05', sub_hash: h(sub), ok: true, removed_tuples: del.length });
  }
  /** M-02 mover: remove the old group membership first, then add the new one (no window with both) */
  async moveGroup(sub, tid, fromGroup, toGroup) {
    const d = await this.s.deleteTuples(tid, [{ resource: { type: 'core/group', id: fromGroup }, relation: 'member', subject: { type: 'core/user', id: sub } }]);
    const w = await this.s.writeTuples(tid, { writes: [{ resource: { type: 'core/group', id: toGroup }, relation: 'member', subject: { type: 'core/user', id: sub } }], on_duplicate: 'ignore' });
    return this.rec({ sm: 'SM-M', id: 'M-02', ok: d.status === 200 && w.status === 200 });
  }
  // ---- invitations (SM-I) ----
  createInvite(inviter, tid, contact, { role = 'member', ttlMs = 60_000 } = {}) {
    const isAdmin = this.ds.tuples.some((t) => t.resource.type === 'core/tenant' && t.resource.id === tid && t.relation === 'admin' && t.subject.id === inviter);
    if (!isAdmin) return this.rec({ sm: 'SM-I', id: 'I-01', ok: false, why: 'no_invite_right' });
    const inv = { id: opaqueId(), token: crypto.randomBytes(24).toString('base64url'), tid, inviter, contact, role, expiresAt: Date.now() + ttlMs, state: 'sent' };
    this.invites.set(inv.id, inv);
    this.rec({ sm: 'SM-I', id: 'I-02', ok: true });
    return inv;
  }
  resend(id) { const inv = this.invites.get(id); inv.token = crypto.randomBytes(24).toString('base64url'); inv.expiresAt = Date.now() + 60_000; this.rec({ sm: 'SM-I', id: 'I-07', ok: true }); return inv; }
  revokeInvite(id) { const inv = this.invites.get(id); if (inv.state === 'sent') inv.state = 'revoked'; return this.rec({ sm: 'SM-I', id: 'I-04', ok: true }); }
  async accept(token, acceptorSub) {
    const inv = [...this.invites.values()].find((i) => i.token === token);
    if (!inv) return this.rec({ sm: 'SM-I', id: 'I-03', ok: false, why: 'unknown_or_superseded_token' });
    if (inv.state !== 'sent') return this.rec({ sm: 'SM-I', id: 'I-03', ok: false, why: `state_${inv.state}` });
    if (Date.now() > inv.expiresAt) { inv.state = 'expired'; return this.rec({ sm: 'SM-I', id: 'I-04', ok: false, why: 'expired' }); }
    const st = this.subjects.get(acceptorSub);
    if (!st || st.state !== 'active') return this.rec({ sm: 'SM-I', id: 'I-03', ok: false, why: 'acceptor_not_active' });
    if (st.contact !== inv.contact) { inv.state = 'held'; return this.rec({ sm: 'SM-I', id: 'I-05', ok: false, why: 'addressee_mismatch_held' }); }
    inv.state = 'accepted';
    await this.addMembership(acceptorSub, inv.tid, { role: inv.role });
    return this.rec({ sm: 'SM-I', id: 'I-03', ok: true });
  }
}
export const contactOf = (sub) => `c-${crypto.createHash('sha256').update(`contact:${sub}`).digest('hex').slice(0, 16)}`;
const h = (x) => crypto.createHash('sha256').update(String(x)).digest('hex').slice(0, 12);
