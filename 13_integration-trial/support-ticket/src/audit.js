// E2 enforcement records (CON-08 audit-event.schema.json 0.4.0, CON-16 §2.8).
// Reference values (subj_ref/res_ref/jti_ref) come from a fixed test table (kit/README §5.5, CON-08 x-ref-derivation):
// no service-held key is used. The table generator below is a stand-in for the not-yet-contracted reference API.
import crypto from 'node:crypto';
import { randomId } from './jose.js';

const tableRef = (prefix, v, len) => prefix + crypto.createHash('sha256').update('ref-table:' + v).digest('base64url').slice(0, len);
const subjRef = (tid, sub) => 'sr_' + crypto.createHash('sha256').update(`${tid}|${sub}`).digest('hex').slice(0, 26);
const resRef = (id) => tableRef('rr_k1.', id, 43);
const jtiRef = (iss, jti) => tableRef('k1.', `${iss}|${jti}`, 43);

export class Audit {
  constructor(cfg) {
    this.cfg = cfg; this.seq = 0; this.prevFp = null; this.chain = Promise.resolve();
    this.counters = new Map(); // OB-12: per entry point counts, no sampling
  }
  count(ep, judged) {
    const c = this.counters.get(ep) || { handled: 0, judged: 0 };
    c.handled++; if (judged) c.judged++; this.counters.set(ep, c);
  }
  // r: { ep, tier, tid, principal, resourceType, resourceId, action, result, decisionSource, noDecisionCause,
  //      decisionId, reason, requestId, txn, txnAbsence, failMode, agent, toolId, externalGrantId }
  emit(r) {
    this.count(r.ep, r.decisionSource === 'pdp');
    const now = new Date().toISOString();
    const ev = {
      schema_ver: '1.0.0-draft.1', ocsf_map_ver: '1.9.0', record_stage: 'produced',
      event_id: randomId(), family: 'enforcement', event_type: 'pep.enforce',
      event_time: now, observed_time: now,
      integrity: { producer_id: this.cfg.spiffeId, producer_seq: ++this.seq, prev_fp: this.prevFp, producer_sdk_ver: '0.1.0' },
      cell_id: this.cfg.cellId, jurisdiction: this.cfg.jurisdiction,
      tid: r.tid || '~platform', tier: r.tier,
      outcome: 'success',
      reason_code: r.reasonCode,
      data_class: { base: 'CUS', labels: ['PII'] },
      resource: { type: r.resourceType, ...(r.resourceId ? { res_ref: resRef(r.resourceId) } : {}) },
      action: { name: r.action },
      corr: { request_id: r.requestId || randomId() },
      detail: {
        entry_point_id: r.ep, result: r.result, pep_id: this.cfg.spiffeId, pep_sdk_version: '0.1.0',
        decision_source: r.decisionSource,
      },
    };
    const p = r.principal;
    if (p && r.noDecisionCause !== 'token_invalid') {
      ev.subject = p.ptype === 'human' ? { type: 'human', subj_ref: subjRef(r.tid, p.sub) } : { type: p.ptype, nhi_id: p.sub };
      // CON-08 requires actor on every E2 except token_invalid (not stated in CON-16 §2.8; see report L-x).
      // Direct calls: the current actor is this service's workload acting for the subject (same shape as CON-08 examples).
      if (p.actor) {
        ev.actor = { mode: 'delegated', chain: [{ type: p.actor.ptype, nhi_id: p.actor.sub }, { type: 'workload', nhi_id: this.cfg.spiffeId }], on_behalf_of: ev.subject };
        ev.detail.agent_principal = p.actor.sub; ev.detail.delegation_mode = 'delegated';
      } else if (p.ptype === 'human') {
        ev.actor = { mode: 'delegated', chain: [{ type: 'workload', nhi_id: this.cfg.spiffeId }], on_behalf_of: ev.subject };
      } else {
        ev.actor = { mode: 'autonomous', chain: [{ type: p.ptype, nhi_id: p.sub }] };
      }
      ev.corr.iss = p.issuer; ev.corr.jti_ref = jtiRef(p.issuer, p.jti);
      if (p.sid) ev.corr.sid = p.sid; if (p.gref) ev.corr.grant_ref = p.gref;
    }
    if (r.toolId) ev.detail.tool_id = r.toolId;
    if (r.externalGrantId) ev.detail.external_grant_id = r.externalGrantId;
    if (r.decisionId) ev.corr.decision_id = r.decisionId;
    if (r.noDecisionCause) ev.detail.no_decision_cause = r.noDecisionCause;
    if (r.failMode) ev.detail.fail_mode = r.failMode;
    if (r.txn) ev.corr.txn = r.txn; else if (r.txnAbsence) ev.corr.txn_absence = r.txnAbsence;
    this.prevFp = 'sha-256:' + crypto.createHash('sha256').update(JSON.stringify(ev)).digest('base64url');
    // independent path (OB-12): fire and forget with ordered chain; failure is logged (spool is out of scope of this trial)
    this.chain = this.chain.then(() => fetch(this.cfg.auditSinkUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ev), signal: AbortSignal.timeout(1000),
    }).catch(() => console.error(JSON.stringify({ level: 'warn', msg: 'audit sink unreachable' }))));
    return ev;
  }
  flush() { return this.chain; }
}
