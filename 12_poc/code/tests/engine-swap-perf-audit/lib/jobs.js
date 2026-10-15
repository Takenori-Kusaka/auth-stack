// Reference job platform for TC-023 / TC-028 (ADR-026 D26-02, D26-03, D26-03a, D26-11, D26-16): a file-based
// queue (at-least-once, FIFO by enqueue time, explicit ack to done/ or dlq/), a job ledger with acceptance
// records, and a reference consumer that re-authorizes every step:
//   1. internal-start Txn-Token from the TTS (job_run_id = acceptance reference; TTS checks revocation/suspension)
//   2. tenant context from the Txn-Token tctx.tid (never from the message), checked against the ledger
//   3. parameter hash of the message == ledger hash; message sub/tid == ledger (tamper detection)
//   4. PDP evaluation of the origin subject's current permission (façade, as the executor workload)
// Messages carry only opaque references (job_run_id, tid, sub, resource id, parameters), never tokens.
// The executor workload is tool-service (the registered internal-start requester in config/ledger.json); the
// harness acts with tool-service's SVID to emulate that workload's job runner.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { request } from '../../../lib/http.js';
import { clientTls } from '../../../lib/topology.js';
import { opaqueId } from '../../../lib/ids.js';

const URN_TXN = 'urn:ietf:params:oauth:token-type:txn_token';
const GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const INTERNAL_START = 'https://poc.test/token-types/internal-start-ref';
export const paramsHash = (p) => crypto.createHash('sha256').update(JSON.stringify(p)).digest('base64url');
const b64json = (seg) => JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'));

export class JobPlatform {
  constructor({ s, dir, executor = 'tool-service', log = () => {} }) {
    this.s = s;
    this.dir = dir;
    this.q = { pending: path.join(dir, 'queue', 'pending'), done: path.join(dir, 'queue', 'done'), dlq: path.join(dir, 'queue', 'dlq') };
    for (const d of Object.values(this.q)) fs.mkdirSync(d, { recursive: true });
    this.ledgerFile = path.join(dir, 'job-ledger.jsonl');
    this.eventsFile = path.join(dir, 'job-events.jsonl');
    this.outputFile = path.join(dir, 'job-output.jsonl');
    this.tls = clientTls(s.topo, executor);
    this.executor = executor;
    this.ledger = new Map();
    this.log = log;
  }
  ev(e) { const rec = { t: new Date().toISOString(), ...e }; fs.appendFileSync(this.eventsFile, JSON.stringify(rec) + '\n'); return rec; }

  /** D26-02 acceptance: PDP check of the origin subject for the job's operation, then acceptance record + message. */
  async enqueue({ sub, tid, gref, acr = 'L2', fileId, steps, op = 'op.file.write', scope = 'files.write', action = 'write', jobDef = 'jobdef.file-report', acceptanceWorkload }) {
    const dec = await this.evaluate({ sub, tid, acr }, action, fileId);
    if (!dec.allow) { this.ev({ ev: 'enqueue_rejected', sub_hash: h(sub), reason: dec.reason }); return { accepted: false, reason: dec.reason }; }
    const acc = await request(`${this.s.topo.urls.sts}/acceptance`, { tls: this.tls, body: { workload: acceptanceWorkload || this.executor, sub, tid, gref, scope, root_jti: opaqueId() } });
    if (acc.status !== 201) return { accepted: false, reason: `acceptance_${acc.status}` };
    const job_run_id = acc.json().ref;
    const params = { file_id: fileId, steps, action };
    const rec = { job_run_id, job_def: jobDef, sub, tid, gref, acr, op, scope, action, params_hash: paramsHash(params), accepted_at: new Date().toISOString(), accept_decision_id: dec.decision_id };
    this.ledger.set(job_run_id, rec);
    fs.appendFileSync(this.ledgerFile, JSON.stringify(rec) + '\n');
    const msg = { job_run_id, tid, sub, params, enqueued_at: Date.now() };
    const mf = path.join(this.q.pending, `${Date.now()}-${job_run_id}.json`);
    fs.writeFileSync(mf, JSON.stringify(msg));
    this.ev({ ev: 'enqueued', job_run_id });
    return { accepted: true, job_run_id, file: mf, msg };
  }

  /** raw message injection (tamper tests) */
  inject(msg, name = 'injected') { const mf = path.join(this.q.pending, `${Date.now()}-${name}-${opaqueId(8)}.json`); fs.writeFileSync(mf, JSON.stringify(msg)); return mf; }

  async evaluate({ sub, tid, acr }, action, fileId, txn) {
    const rid = opaqueId();
    let r;
    try {
      r = await request(`${this.s.topo.urls.pdp}/access/v1/evaluation`, { tls: this.tls, timeoutMs: 2000, headers: { 'x-request-id': rid }, body: { subject: { type: 'core/user', id: sub, properties: { tid, principal_type: 'human', acr, actor: { type: 'workload', id: this.s.topo.workloads[this.executor].sub } } }, action: { name: action }, resource: { type: 'files/file', id: fileId, properties: { tid } }, context: { 'x-authz-profile': { profile_version: '1.0', ...(txn ? { txn } : {}) } } } });
    } catch (e) { return { allow: false, unavailable: `pdp_unreachable:${e.code || e.message}` }; }
    if (r.status !== 200 || r.headers['x-request-id'] !== rid) return { allow: false, unavailable: `pdp_status_${r.status}` };
    const p = r.json()?.context?.['x-authz-profile'];
    if (!p?.decision_id) return { allow: false, unavailable: 'no_decision_id' };
    if (['deny_unavailable', 'deny_indeterminate', 'unsupported_profile'].includes(p.reason)) return { allow: false, unavailable: p.reason, decision_id: p.decision_id };
    return { allow: r.json().decision === true && p.reason === 'allow', reason: p.reason, decision_id: p.decision_id };
  }

  async txnToken(job_run_id, op) {
    let r;
    try {
      r = await request(`${this.s.topo.urls.sts}/txn-token`, { tls: this.tls, timeoutMs: 2000, form: { grant_type: GRANT, requested_token_type: URN_TXN, audience: this.s.topo.txnAudience, scope: op, subject_token: job_run_id, subject_token_type: INTERNAL_START } });
    } catch (e) { return { error: `tts_unreachable:${e.code || e.message}`, unavailable: true }; }
    if (r.status !== 200) return { error: `tts_${r.status}:${r.json()?.error}`, unavailable: r.status >= 500 };
    const tok = r.json().access_token;
    return { claims: b64json(tok.split('.')[1]), token: tok };
  }

  /**
   * Process one step of a message. Returns { executed, reason, t_auth_start, t_auth_end, decision_id }.
   * Steps are re-authorized one by one (D26-03, write: per item).
   */
  async step(msg, k) {
    const t0 = Date.now();
    const L = this.ledger.get(msg.job_run_id);
    const base = { job_run_id: msg.job_run_id, step: k, t_auth_start: t0 };
    if (!L) return this.ev({ ev: 'step_rejected', ...base, reason: 'unknown_job_run_id', executed: false });
    if (msg.sub !== L.sub || msg.tid !== L.tid) return this.ev({ ev: 'step_rejected', ...base, reason: 'message_sub_or_tid_mismatch', executed: false });
    if (paramsHash(msg.params) !== L.params_hash) return this.ev({ ev: 'step_rejected', ...base, reason: 'params_hash_mismatch', executed: false });
    const tt = await this.txnToken(msg.job_run_id, L.op);
    if (tt.error) return this.ev({ ev: tt.unavailable ? 'step_waiting' : 'step_rejected', ...base, reason: tt.error, executed: false, unavailable: !!tt.unavailable });
    const ctxTid = tt.claims.tctx?.tid;
    if (ctxTid !== L.tid || tt.claims.sub !== L.sub) return this.ev({ ev: 'step_rejected', ...base, reason: 'tctx_mismatch', executed: false });
    const dec = await this.evaluate({ sub: tt.claims.sub, tid: ctxTid, acr: L.acr }, L.action, msg.params.file_id, tt.claims.txn);
    const t1 = Date.now();
    if (dec.unavailable) return this.ev({ ev: 'step_waiting', ...base, t_auth_end: t1, reason: dec.unavailable, executed: false, unavailable: true });
    if (!dec.allow) return this.ev({ ev: 'step_rejected', ...base, t_auth_end: t1, reason: dec.reason, decision_id: dec.decision_id, executed: false });
    fs.appendFileSync(this.outputFile, JSON.stringify({ t: new Date().toISOString(), job_run_id: msg.job_run_id, step: k, txn: tt.claims.txn, decision_id: dec.decision_id }) + '\n');
    return this.ev({ ev: 'step_executed', ...base, t_auth_end: t1, decision_id: dec.decision_id, txn: tt.claims.txn, executed: true });
  }

  /** Run a job message: steps every intervalMs; stop at the first rejection (dead letter), wait on unavailability. */
  async runMessage(file, { intervalMs = 300, maxWaitMs = 10_000, onStep } = {}) {
    const msg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const steps = msg.params?.steps || 1;
    const out = [];
    let waited = 0;
    for (let k = 0; k < steps; k++) {
      const r = await this.step(msg, k);
      out.push(r);
      if (onStep) await onStep(r, k);
      if (r.unavailable) { // fail-closed: back off and retry the same step, never execute without a decision
        if (waited >= maxWaitMs) { this.ack(file, 'dlq', 'wait_exhausted'); return { out, final: 'dlq_wait_exhausted' }; }
        waited += intervalMs; k--; await new Promise((ok) => setTimeout(ok, intervalMs)); continue;
      }
      if (!r.executed) { this.ack(file, 'dlq', r.reason); return { out, final: `dlq:${r.reason}` }; }
      await new Promise((ok) => setTimeout(ok, intervalMs));
    }
    this.ack(file, 'done');
    return { out, final: 'done' };
  }

  ack(file, where, reason) { const dst = path.join(this.q[where], path.basename(file)); fs.renameSync(file, dst); this.ev({ ev: `ack_${where}`, file: path.basename(file), reason }); }
}
const h = (x) => crypto.createHash('sha256').update(String(x)).digest('hex').slice(0, 12);
