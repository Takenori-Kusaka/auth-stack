// E2 enforcement records (CON-08). Sent on an independent path; never blocks the decision itself.
// Reference values (subj_ref/res_ref/jti_ref) must come from the cell's reference-value API, whose contract
// does not exist yet (CON-08 x-ref-derivation, handoff 3). Per CON-08 we use a fixed test table in the mock
// and NEVER compute keyed hashes with our own key.
import crypto from 'node:crypto';
import { opaqueId } from './jwt.js';

// txn: undefined/null = no Txn-Token header; {invalid:true} = presented but not verified
const args_txnAbsence = (txn) => (txn && txn.invalid ? 'unverified' : 'not_presented');

export class Audit {
  constructor(cfg, refValues) {
    this.cfg = cfg; this.refValues = refValues;      // refValues: {subjRef(tid,sub), resRef(tid,type,id)}
    this.seq = 0; this.prevFp = null; this.chainId = opaqueId(); this.spool = [];
    this.counters = new Map(); // entry point -> {handled, withDecision} (sampling-free counts, OB-12)
  }
  count(ep, withDecision) {
    const c = this.counters.get(ep) ?? { handled: 0, withDecision: 0 };
    c.handled++; if (withDecision) c.withDecision++;
    this.counters.set(ep, c);
  }
  build({ ep, tier, tid, principal, resource, action, result, decision, noDecisionCause, reasonCode, txn, requestId }) {
    const now = new Date().toISOString();
    this.seq++;
    const rec = {
      schema_ver: '1.1.0-draft.1', ocsf_map_ver: '1.9.0', record_stage: 'produced', event_id: opaqueId(),
      family: 'enforcement', event_type: 'pep.enforce', event_time: now, observed_time: now,
      integrity: { producer_id: this.cfg.workloadSpiffeId, producer_seq: this.seq, prev_fp: this.prevFp, producer_sdk_ver: this.cfg.pepVersion, chain_id: this.chainId },
      // cell_id / jurisdiction: no switch point or contract tells a dependent service its values (report.md L-4).
      cell_id: 'stub0', jurisdiction: 'jp',
      tid: tid ?? 'unknown', tier: tier.split('/')[0], outcome: 'success', reason_code: reasonCode,
      data_class: { base: 'CUS', labels: ['PII'] },   // unclassified -> CUS+PII (CON-08 DataClass)
      corr: { request_id: requestId ?? undefined },
      detail: { entry_point_id: ep, result, pep_id: this.cfg.workloadSpiffeId, pep_sdk_version: this.cfg.pepVersion },
    };
    if (principal) {
      rec.subject = { type: principal.ptype, subj_ref: this.refValues.subjRef(principal.tid, principal.sub) }; // CON-08: ptype as-is
      if (principal.actor) rec.actor = { mode: 'delegated', chain: [{ type: principal.actor.ptype, subj_ref: this.refValues.subjRef(principal.tid, principal.actor.sub) }], on_behalf_of: { type: principal.ptype, subj_ref: rec.subject.subj_ref } };
    }
    if (resource) rec.resource = { type: resource.type, res_ref: this.refValues.resRef(tid, resource.type, resource.id) };
    if (action) rec.action = { name: action };
    if (decision?.decisionId) { rec.corr.decision_id = decision.decisionId; rec.detail.decision_source = 'pdp'; }
    else { rec.detail.decision_source = 'none'; rec.detail.no_decision_cause = noDecisionCause; }
    if (noDecisionCause && ['pdp_unreachable', 'pdp_timeout', 'pdp_response_invalid'].includes(noDecisionCause)) rec.detail.fail_mode = 'deny';
    if (tier !== 'read-sensitive' && tier !== 'public') {
      if (txn?.txn) rec.corr.txn = txn.txn; else rec.corr.txn_absence = args_txnAbsence(txn);
    } else if (txn?.txn) rec.corr.txn = txn.txn;
    if (rec.corr.request_id === undefined) delete rec.corr.request_id;
    this.prevFp = 'sha-256:' + crypto.createHash('sha256').update(JSON.stringify(rec)).digest('base64url');
    return rec;
  }
  async emit(args) {
    const rec = this.build(args);
    this.count(args.ep, !!args.decision?.decisionId);
    try {
      const r = await fetch(this.cfg.auditSinkUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rec), signal: AbortSignal.timeout(1000) });
      if (r.status >= 300) this.spool.push(rec);
    } catch { this.spool.push(rec); }
    return rec;
  }
}
