// (4) audit, self-implemented producer of CON-08 events (audit-event.schema.json).
// The transport to the "cell 内の耐久ジャーナル" has no contract in 11_contracts (only the event schema and
// MK-07 in the kit spec), so events go to an in-memory/JSONL sink selected by AUDIT_SINK_URL.
import crypto from 'node:crypto';
import fs from 'node:fs';

export class AuditProducer {
  constructor(cfg) {
    this.cfg = cfg;
    this.seq = 0;
    this.prevFp = null;
    this.events = [];
  }

  keyedRef(prefix, value) {
    // CON-08 KeyedRef (rr_k<n>.<43 base64url>) and SubjRef (sr_<26-40 [a-z0-9]>). Who issues SubjRef and with
    // which key is not stated to integrators (DL-77) -> local trial key, hex for sr_.
    const mac = crypto.createHmac('sha256', this.cfg.auditRefKey).update(value);
    return prefix === 'sr_' ? `sr_${mac.digest('hex').slice(0, 40)}` : `${prefix}${mac.digest('base64url')}`;
  }

  /** pep.enforce (family enforcement). result: 'allowed' | 'denied' | 'unavailable' */
  enforce({ tid, tier, sub, resourceType, resourceId, action, decisionId, requestId, traceId, txn, reason, entryPointId, result }) {
    const now = new Date().toISOString();
    const ev = {
      schema_ver: '1.0.0-draft.1',
      ocsf_map_ver: '1.9.0',
      record_stage: 'produced',
      event_id: crypto.randomBytes(16).toString('hex').slice(0, 26),
      family: 'enforcement',
      event_type: 'pep.enforce',
      event_time: now,
      observed_time: now,
      integrity: {
        producer_id: this.cfg.workloadId,
        producer_seq: ++this.seq,
        // genesis value of the hash chain is not defined by CON-08 -> sha-256 of the empty string (our guess)
        prev_fp: this.prevFp || `sha-256:${crypto.createHash('sha256').update('').digest('base64url')}`,
        producer_sdk_ver: '0.1.0',
      },
      cell_id: 'c000', // cell id is not known to a dependent service (no contract) -> placeholder
      jurisdiction: 'jp',
      tid,
      tier: tier.replace('_', '-'), // CON-04 CamPermission uses read_sensitive, CON-08 uses read-sensitive
      outcome: result === 'allowed' ? 'success' : 'failure',
      reason_code: reason || 'deny_indeterminate',
      data_class: { base: 'CUS', labels: ['PII'] },
      subject: { type: 'human', subj_ref: this.keyedRef('sr_', sub) },
      actor: { mode: 'delegated', chain: [{ type: 'workload', nhi_id: this.cfg.workloadId }], on_behalf_of: { type: 'human', subj_ref: this.keyedRef('sr_', sub) } },
      resource: { type: resourceType, res_ref: this.keyedRef('rr_k1.', `${resourceType}:${resourceId}`) },
      action: { name: action },
      corr: { request_id: requestId, trace_id: traceId },
      // DetailEnforcement.result enum is permitted|denied|degraded; "no decision" is recorded as denied
      detail: { entry_point_id: entryPointId, result: result === 'allowed' ? 'permitted' : 'denied', pep_id: this.cfg.workloadId, pep_sdk_version: '0.1.0' },
    };
    if (decisionId) ev.corr.decision_id = decisionId;
    if (txn) ev.corr.txn = txn;
    const fp = crypto.createHash('sha256').update(JSON.stringify(ev)).digest('base64url');
    this.prevFp = `sha-256:${fp}`;
    this.emit(ev);
    return ev;
  }

  emit(ev) {
    this.events.push(ev);
    if (this.cfg.auditSinkUrl.startsWith('file:')) fs.appendFileSync(new URL(this.cfg.auditSinkUrl), JSON.stringify(ev) + '\n');
  }
}
