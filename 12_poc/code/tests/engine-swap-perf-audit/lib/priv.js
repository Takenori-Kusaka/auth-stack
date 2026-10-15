// TC-022 reference implementation of JIT elevation, approval and the support tool (ADR-029 D29-02, D29-03, D29-10,
// D29-21〜D29-25, D29-30〜D29-31, D29-62, D29-72〜D29-74). Platform-owned elevation-grant store; every privileged
// action is recorded synchronously in the cell audit journal (E7 privileged_access, tier privileged/P) before it
// takes effect; break-glass additionally requires an out-of-band record.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { request } from '../../../lib/http.js';
import { AuditProducer } from '../../../lib/audit.js';
import { clientTls } from '../../../lib/topology.js';
import { opaqueId } from '../../../lib/ids.js';
import { CONTRACTS_DIR } from '../../../lib/jwt.js';

export const PREAPPROVED_OPS = new Set(['view_file_metadata', 'view_file_content', 'list_folder']); // JEA-type catalog (D29-22)
const SECRET_OPS = new Set(['read_auth_secret', 'export_credentials']); // never in the catalog
const staffRef = (id) => 'st_' + crypto.createHash('sha256').update(id).digest('hex').slice(0, 32);

export class PrivilegedAccess {
  constructor({ topo, secrets, dataset, oobUrl, maxConsecutivePair = 2, log = () => {} }) {
    this.topo = topo;
    this.ds = dataset;
    this.oobUrl = oobUrl;
    this.maxConsecutivePair = maxConsecutivePair;
    this.audit = new AuditProducer({ topo, secrets, workload: 'admin', tls: clientTls(topo, 'admin') });
    this.staff = new Map(); // id -> { kind: support|sre|ciso|approver|ai_agent, qualified }
    this.customerApprovers = new Map(); // tid -> Set(user ids)
    this.cases = new Map(); // ticket -> 'open' | 'closed'
    this.incidents = new Set();
    this.grants = new Map();
    this.pairs = []; // approval history [approver, requester]
    this.breakGlassApprovals = []; // [personA, personB]
    this.sessions = new Map(); // grantId -> { active, endedAt, reason }
    this.events = [];
    this.bgSeq = 0;
    const schema = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'schemas/audit-event.schema.json'), 'utf8'));
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    this.validate = ajv.compile(schema);
    this.timer = setInterval(() => this.expireTick(), 100);
    this.timer.unref();
    this.log = log;
  }
  ev(e) { const r = { t: Date.now(), ...e }; this.events.push(r); return r; }
  refuse(reason, extra = {}) { return this.ev({ ok: false, reason, ...extra }); }

  async record(op, g, actorId, extra = {}) {
    const st = this.staff.get(actorId) || {};
    const subj = { type: st.kind === 'ai_agent' ? 'ai_agent' : 'human', ...(st.kind === 'ai_agent' ? { nhi_id: `spiffe://poc.test/agent/${actorId}` } : { subj_ref: this.audit.subjRef(actorId) }) };
    const fields = {
      family: 'privileged_access', event_type: op.startsWith('break_glass') ? 'priv.break_glass' : op === 'access' || op === 'preapproved_action' ? 'priv.access' : 'priv.jit',
      tid: g?.tid || '~platform', tier: 'privileged', tier_sub: 'P', outcome: extra.outcome || 'success', reason_code: extra.reason_code || op,
      purpose: { code: op.startsWith('break_glass') ? 'incident_response' : 'customer_support', basis_ref: g?.ticket || extra.incident || 'none-000' },
      actor: { mode: 'autonomous', chain: [subj] }, // staff act in their own name (no delegation)
      corr: {},
      detail: {
        staff_ref: staffRef(actorId), staff_org: 'provider', role: st.kind === 'ai_agent' ? 'ai_agent' : (st.kind || 'support'), support_level: 'SL2', operation: op,
        access_scope: g ? `files:${g.tid.slice(0, 20)}` : 'platform:break_glass',
        ...(g ? { elevation_grant_id: g.id, target_tid: g.tid } : {}),
        ...(extra.detail || {}),
      },
    };
    const probe = this.audit.build(fields);
    probe.integrity = { producer_id: this.audit.producerId, producer_seq: 1, prev_fp: null, producer_sdk_ver: '0.1.0' };
    probe.record_stage = 'journaled'; probe.received_time = new Date().toISOString();
    if (!this.validate(probe)) throw new Error(`test bug: invalid E7 record ${JSON.stringify(this.validate.errors.slice(0, 3))}`);
    return this.audit.emit(fields, { sync: true }); // privileged: synchronous acknowledgement required
  }

  requestElevation(actorId, { ticket, reason, tid, files, ops, durationMs }) {
    const st = this.staff.get(actorId);
    if (!st) return this.refuse('unknown_staff');
    if (st.kind === 'ai_agent') return this.refuse('ai_agent_cannot_request');
    if (this.cases.get(ticket) !== 'open') return this.refuse('ticket_not_open');
    if (!ops.every((o) => PREAPPROVED_OPS.has(o))) return this.refuse('op_not_preapproved');
    if (!reason || !tid || !files?.length) return this.refuse('missing_fields');
    const g = { id: opaqueId(), requester: actorId, ticket, reason, tid, files: [...files], ops: [...ops], durationMs, status: 'pending_internal', createdAt: Date.now() };
    this.grants.set(g.id, g);
    return this.ev({ ok: true, grantId: g.id });
  }
  approveInternal(approverId, grantId) {
    const st = this.staff.get(approverId);
    const g = this.grants.get(grantId);
    if (!g || g.status !== 'pending_internal') return this.refuse('not_pending');
    if (!st) return this.refuse('unknown_staff');
    if (st.kind === 'ai_agent') return this.refuse('ai_agent_cannot_approve');
    if (!st.qualified) return this.refuse('approver_not_qualified');
    if (approverId === g.requester) return this.refuse('self_approval');
    const recent = this.pairs.slice(-this.maxConsecutivePair);
    if (recent.length === this.maxConsecutivePair && recent.every(([a, r]) => a === approverId && r === g.requester)) return this.refuse('same_pair_consecutive');
    this.pairs.push([approverId, g.requester]);
    g.internalApprover = approverId; g.status = 'pending_customer';
    return this.ev({ ok: true });
  }
  approveCustomer(userId, grantId) {
    const g = this.grants.get(grantId);
    if (!g || g.status !== 'pending_customer') return this.refuse('not_pending_customer');
    if (this.staff.has(userId)) return this.refuse('provider_staff_cannot_customer_approve');
    if (!(this.customerApprovers.get(g.tid) || new Set()).has(userId)) return this.refuse('not_tenant_support_approver');
    g.customerApprover = userId; g.status = 'approved';
    g.frozen = JSON.stringify({ tid: g.tid, files: g.files, ops: g.ops, durationMs: g.durationMs });
    return this.ev({ ok: true });
  }
  modifyScope(actorId, grantId, { files, ops }) {
    const g = this.grants.get(grantId);
    if (!g) return this.refuse('unknown_grant');
    if (g.status !== 'pending_internal') return this.refuse('scope_change_after_approval');
    if (files) g.files = files; if (ops) g.ops = ops;
    return this.ev({ ok: true });
  }
  async activate(actorId, grantId, { amr = [] } = {}) {
    const g = this.grants.get(grantId);
    if (!g || g.status !== 'approved') return this.refuse('not_approved');
    if (actorId !== g.requester) return this.refuse('not_requester');
    if (!amr.includes('hwk')) return this.refuse('device_bound_reauth_required');
    const now = Date.now();
    const a = await this.record('jit_grant', g, actorId, { detail: { internal_approver: staffRef(g.internalApprover), customer_approver: staffRef(g.customerApprover), period: { start: new Date(now).toISOString(), end: new Date(now + g.durationMs).toISOString() } } });
    if (!a.ok) return this.refuse('audit_unavailable');
    g.status = 'active'; g.activatedAt = now; g.expiresAt = now + g.durationMs;
    this.sessions.set(g.id, { active: true });
    return this.ev({ ok: true, expiresAt: g.expiresAt });
  }
  expireTick() {
    const now = Date.now();
    for (const g of this.grants.values()) if (g.status === 'active' && now >= g.expiresAt) { g.status = 'expired'; const s = this.sessions.get(g.id); if (s) { s.active = false; s.endedAt = now; s.reason = 'time_limit'; } this.ev({ ev: 'expired', grantId: g.id, lag_ms: now - g.expiresAt }); }
  }
  closeCase(ticket) {
    this.cases.set(ticket, 'closed');
    for (const g of this.grants.values()) if (g.ticket === ticket && ['active', 'approved', 'pending_internal', 'pending_customer'].includes(g.status)) { g.status = 'closed'; const s = this.sessions.get(g.id); if (s) { s.active = false; s.endedAt = Date.now(); s.reason = 'case_closed'; } }
    return this.ev({ ok: true });
  }
  async access(actorId, grantId, op, fileId) {
    const g = grantId && this.grants.get(grantId);
    if (!g) return this.refuse('no_elevation_grant');
    if (actorId !== g.requester) return this.refuse('not_grant_holder');
    if (g.status !== 'active' || Date.now() >= g.expiresAt || !this.sessions.get(g.id)?.active) return this.refuse(`grant_${g.status}`);
    if (this.cases.get(g.ticket) !== 'open') return this.refuse('case_closed');
    if (SECRET_OPS.has(op)) return this.refuse('auth_secret_never_viewable');
    if (!g.ops.includes(op) || !PREAPPROVED_OPS.has(op)) return this.refuse('op_outside_grant');
    const f = this.ds.files.find((x) => x.id === fileId);
    if (!f || f.tid !== g.tid || !g.files.includes(fileId)) return this.refuse('resource_outside_grant');
    const a = await this.record('access', g, actorId, { detail: { preapproved_action_id: op } });
    if (!a.ok) return this.refuse('audit_unavailable'); // fail closed: no access without the synchronous record
    return this.ev({ ok: true, data: op === 'view_file_content' ? { id: f.id, content_sha256: crypto.createHash('sha256').update(f.content).digest('hex') } : { id: f.id, folder: f.folder } });
  }
  async breakGlass(personA, personB, incidentId, action) {
    for (const p of [personA, personB]) { const st = this.staff.get(p); if (!st) return this.refuse('unknown_staff'); if (st.kind === 'ai_agent') return this.refuse('ai_agent_cannot_break_glass'); }
    if (personA === personB) return this.refuse('same_person_both_approvals');
    const kinds = new Set([this.staff.get(personA).kind, this.staff.get(personB).kind]);
    if (!(kinds.has('sre') && kinds.has('ciso'))) return this.refuse('requires_sre_and_ciso_duty');
    if (!this.incidents.has(incidentId)) return this.refuse('no_declared_incident');
    const seq = ++this.bgSeq;
    try {
      const r = await request(this.oobUrl, { method: 'POST', body: { seq, incident: incidentId, action, a: staffRef(personA), b: staffRef(personB) }, timeoutMs: 1500 });
      if (r.status !== 201) return this.refuse('oob_record_failed');
    } catch { return this.refuse('oob_record_failed'); }
    const a = await this.record('break_glass_open', null, personA, { incident: incidentId, detail: { break_glass_seq: seq } });
    if (!a.ok) return this.refuse('audit_unavailable');
    this.breakGlassApprovals.push([personA, personB]);
    return this.ev({ ok: true, seq });
  }
  close() { clearInterval(this.timer); this.audit.close(); }
}
