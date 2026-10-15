// TC-020 reference implementation of account recovery and authenticator management (ADR-003 RC2〜RC7, DL-08 SM-R /
// SM-A, ADR-002 step-up freshness). Platform effects on cancel / compromise: SEC suspension in the revocation state,
// AS account status, AS grant revocation (all sessions and refresh tokens, RC4-5 / CH-ESPA-05).
import crypto from 'node:crypto';
import { opaqueId } from '../../../lib/ids.js';

const H = (x) => crypto.createHash('sha256').update(x).digest('hex');
const AAL = { password: 1, sms: 1, totp: 2, passkey: 3 }; // AAL-ish rank: passkey = phishing resistant (PR)

export class Recovery {
  constructor({ s, waitMs = 1500, restrictMs = 1500, newAddressQuarantineMs = 2000, maxAgeMs = 2000, notifier }) {
    Object.assign(this, { s, waitMs, restrictMs, newAddressQuarantineMs, maxAgeMs });
    this.accounts = new Map();
    this.cases = new Map();
    this.notifier = notifier || (() => true); // returns false to simulate a notification failure
    this.log = [];
    this.helpdesk = new Set();
  }
  rec(e) { const r = { t: Date.now(), ...e }; this.log.push(r); return r; }
  refuse(why, extra = {}) { return this.rec({ ok: false, why, ...extra }); }
  createAccount(sub, { authenticators = [{ type: 'password' }, { type: 'totp' }], proofed = false, addresses = ['addr-1', 'addr-2'], notify = ['notify-1', 'notify-2'], storedCodes = 2, admin = false } = {}) {
    const acct = { sub, state: 'active', proofed, admin, authenticators: new Map(), addresses: new Map(addresses.map((a) => [a, { addedAt: 0 }])), notify: new Set(notify), storedCodes: new Map(), issued: new Map() };
    for (const a of authenticators) { const id = opaqueId(10); acct.authenticators.set(id, { id, type: a.type, state: 'active' }); }
    const codes = [];
    for (let i = 0; i < storedCodes; i++) { const c = crypto.randomBytes(10).toString('base64url'); acct.storedCodes.set(H(c), { used: false }); codes.push(c); } // ≥ 64 bit, hashed, single use
    this.accounts.set(sub, acct);
    return { acct, codes };
  }
  maxAal(acct) { return Math.max(0, ...[...acct.authenticators.values()].filter((a) => a.state === 'active').map((a) => AAL[a.type])); }
  hasPr(acct) { return [...acct.authenticators.values()].some((a) => a.state === 'active' && a.type === 'passkey'); }
  authenticate(sub, authId) { const a = this.accounts.get(sub); const au = a?.authenticators.get(authId); if (!a || a.state !== 'active' || !au || au.state !== 'active') return this.refuse('auth_failed'); return this.rec({ ok: true, aal: AAL[au.type] }); }
  /** issued-type code to a recovery address (RC2-6 / RC2-8: a newly added address is quarantined) */
  issueCode(sub, address) {
    const a = this.accounts.get(sub);
    const ad = a.addresses.get(address);
    if (!ad) return this.refuse('unknown_address');
    if (Date.now() - ad.addedAt < this.newAddressQuarantineMs) return this.refuse('address_in_quarantine');
    const c = crypto.randomBytes(10).toString('base64url');
    a.issued.set(H(c), { address, used: false, exp: Date.now() + 60_000 });
    return this.rec({ ok: true, code: c, address });
  }
  addAddress(sub, address) { this.accounts.get(sub).addresses.set(address, { addedAt: Date.now() }); return this.rec({ ok: true }); }
  /**
   * Start a recovery with the presented evidence. evidence: { stored: [codes], issued: [codes], authenticator: id, reproofed: bool }
   * RC2-2: only (a) stored + issued, (b) issued + a remaining single-factor authenticator, (c) re-proofing of a proofed account.
   */
  startRecovery(sub, evidence, { approvals = [], requester } = {}) {
    const a = this.accounts.get(sub);
    if (!a || a.state !== 'active') return this.refuse('account_not_active');
    const stored = (evidence.stored || []).filter((c) => a.storedCodes.get(H(c)) && !a.storedCodes.get(H(c)).used);
    const issued = (evidence.issued || []).filter((c) => a.issued.get(H(c)) && !a.issued.get(H(c)).used && a.issued.get(H(c)).exp > Date.now());
    const auth = evidence.authenticator && a.authenticators.get(evidence.authenticator)?.state === 'active' ? a.authenticators.get(evidence.authenticator) : null;
    let path = null;
    if (stored.length >= 1 && issued.length >= 1) path = 'a';
    else if (issued.length >= 1 && auth && AAL[auth.type] === 1) path = 'b';
    else if (evidence.reproofed && a.proofed) path = 'c';
    if (!path) return this.refuse('three_choice_not_met', { stored: stored.length, issued: issued.length });
    if (issued.length) { // RC2-6: a notification target other than the code destination must exist
      const dest = a.issued.get(H(issued[0])).address;
      if (![...a.notify].some((n) => n !== dest)) return this.refuse('no_independent_notification_target');
    }
    if (a.admin) { // RC5: R-B..R-D need two-person approval, approver != requester, not helpdesk, not provider staff
      const ok = approvals.length >= 2 && new Set(approvals.map((x) => x.id)).size >= 2 && approvals.every((x) => x.id !== requester && !this.helpdesk.has(x.id) && x.kind === 'tenant_admin');
      if (!ok) return this.refuse('two_person_approval_required');
    }
    for (const c of stored) a.storedCodes.get(H(c)).used = true;
    for (const c of issued) a.issued.get(H(c)).used = true;
    const k = { id: opaqueId(), sub, path, state: 'waiting', since: Date.now() };
    this.cases.set(k.id, k);
    if (!this.notifyAll(a, 'recovery_started')) { k.state = 'rejected'; return this.refuse('notification_failed'); }
    return this.rec({ ok: true, case: k.id, path });
  }
  notifyAll(a, what) { let ok = true; for (const n of a.notify) ok = this.notifier(n, what) && ok; return ok; }
  /** complete after the waiting period: bind a new authenticator, revoke every other session (RC4-5) */
  async complete(caseId, newType = 'totp') {
    const k = this.cases.get(caseId);
    if (!k || k.state !== 'waiting') return this.refuse(`case_${k?.state}`);
    if (Date.now() - k.since < this.waitMs) return this.refuse('waiting_period');
    const a = this.accounts.get(k.sub);
    if (a.state !== 'active') return this.refuse('account_not_active');
    const id = opaqueId(10);
    a.authenticators.set(id, { id, type: newType, state: 'active', fromRecovery: caseId });
    k.state = 'restricted'; k.restrictedSince = Date.now(); k.newAuth = id;
    await this.s.req(`${this.s.topo.urls.asA}/admin/revoke-account-grants`, { body: { sub: k.sub, reason: 'recovery_completed' } });
    return this.rec({ ok: true, newAuth: id });
  }
  /** RC4-3: denial from an existing notification target cancels in waiting / approval / restriction */
  async deny(caseId, from) {
    const k = this.cases.get(caseId);
    const a = this.accounts.get(k.sub);
    if (!a.notify.has(from)) return this.refuse('not_existing_target');
    if (!['waiting', 'restricted'].includes(k.state)) return this.refuse(`case_${k.state}`);
    if (k.state === 'restricted' && Date.now() - k.restrictedSince > this.restrictMs) return this.refuse('restriction_over');
    k.state = 'cancelled';
    a.state = 'suspended_sec';
    if (k.newAuth) a.authenticators.get(k.newAuth).state = 'revoked';
    const t0 = Date.now();
    await this.s.setStatus('subject', k.sub, 'suspended');
    await this.s.req(`${this.s.topo.urls.asA}/admin/user-status`, { body: { sub: k.sub, status: 'suspended' } });
    await this.s.req(`${this.s.topo.urls.asA}/admin/revoke-account-grants`, { body: { sub: k.sub, reason: 'recovery_denied' } });
    await this.s.revoke('sub', k.sub, { reason: 'recovery_denied' });
    return this.rec({ ok: true, cancel_api_ms: Date.now() - t0 });
  }
  /** helpdesk operations (RC3-3): none of these may succeed */
  helpdeskOp(operator, op) { if (!this.helpdesk.has(operator)) return this.refuse('not_helpdesk'); return this.refuse(`helpdesk_cannot_${op}`); }
  /** RC6-1: add an authenticator — authenticate at min(account max AAL, new AAL); PR accounts must use PR; notify or do not bind */
  addAuthenticator(sub, { usingAuth, newType, authTime }) {
    const a = this.accounts.get(sub);
    const au = a.authenticators.get(usingAuth);
    if (!au || au.state !== 'active') return this.refuse('auth_failed');
    const need = Math.min(this.maxAal(a), AAL[newType]);
    if (this.hasPr(a) && au.type !== 'passkey') return this.refuse('pr_account_no_fallback');
    if (AAL[au.type] < need) return this.refuse('insufficient_aal_for_binding');
    if (authTime !== undefined && Date.now() - authTime > this.maxAgeMs) return this.refuse('not_fresh');
    if (!this.notifyAll(a, 'authenticator_added')) return this.refuse('notification_failed_binding_not_confirmed');
    const id = opaqueId(10); a.authenticators.set(id, { id, type: newType, state: 'active' });
    return this.rec({ ok: true, id });
  }
  /** RC6-2: remove (+SEC: fresh full re-auth within max_age), the last one cannot be removed */
  removeAuthenticator(sub, id, { authTime }) {
    const a = this.accounts.get(sub);
    if (authTime === undefined || Date.now() - authTime > this.maxAgeMs) return this.refuse('max_age_exceeded');
    const active = [...a.authenticators.values()].filter((x) => x.state === 'active');
    if (active.length <= 1) return this.refuse('last_authenticator');
    a.authenticators.get(id).state = 'revoked';
    this.notifyAll(a, 'authenticator_removed');
    return this.rec({ ok: true });
  }
}
