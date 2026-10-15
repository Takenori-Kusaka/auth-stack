// AuthZEN client for the PDP façade (CON-03). Everything that is not a well-formed, echoed, fresh-enough
// decision is "no decision" (CON-16 §2.6) and is denied by the caller (OB-05).
import { opaqueId } from './jwt.js';

const MODE_RANK = { minimize_latency: 0, at_least_as_fresh: 1, fully_consistent: 2 };
const REASON_RE = /^(allow|deny_no_relation|deny_indeterminate|deny_unavailable|unsupported_profile|deny_guardrail:[a-z0-9][a-z0-9._-]{0,63})$/;
const NO_DECISION_REASONS = new Set(['deny_unavailable', 'deny_indeterminate', 'unsupported_profile']);
const OPAQUE = (v) => typeof v === 'string' && /^[\x21-\x7E]{1,64}$/.test(v);

// CON-02 x-subject-type-map (copy; the canon is CON-02). null = undecided -> PEP rejects without calling PDP.
export const SUBJECT_TYPE_MAP = { human: 'core/user', workload: 'core/workload', service_account: 'core/client', ai_agent: null };

export class PdpClient {
  constructor(cfg, log) { this.cfg = cfg; this.log = log; this.base = cfg.pdpBaseUrl; this.calls = 0; }

  // AUTHZ_PDP_BASE_URL -> metadata; policy_decision_point must equal the URL we used (AuthZEN §9.2.3, CON-11 §11.4)
  async init() {
    const r = await fetch(`${this.base}/.well-known/authzen-configuration`, { signal: AbortSignal.timeout(3000) });
    if (r.status !== 200) throw new Error(`pdp metadata ${r.status}`);
    const m = await r.json();
    if (m.policy_decision_point !== this.base) throw new Error(`pdp metadata: policy_decision_point ${m.policy_decision_point} != ${this.base}`);
    const sameOrigin = (u) => typeof u === 'string' && new URL(u).origin === new URL(this.base).origin;
    this.evalUrl = sameOrigin(m.access_evaluation_endpoint) ? m.access_evaluation_endpoint : `${this.base}/access/v1/evaluation`;
    this.evalsUrl = sameOrigin(m.access_evaluations_endpoint) ? m.access_evaluations_endpoint : `${this.base}/access/v1/evaluations`;
  }

  tierPolicy(tier) {
    const cls = tier.split('/')[0];
    const p = this.cfg.failmode.pdp[cls];
    if (!p) throw new Error(`no fail-mode for tier ${tier}`);
    return p;
  }

  async post(url, body, { tier, txnToken }) {
    const requestId = `r-${opaqueId()}`;
    const policy = this.tierPolicy(tier);
    const headers = { 'content-type': 'application/json', 'x-request-id': requestId };
    if (txnToken) headers['txn-token'] = txnToken;          // CON-03 TxnToken header, unchanged
    this.calls++;
    let res, text;
    try {
      // D(t) covers DNS, connect, TLS, send, wait, receive (ARC-06 §3.6 via CON-16 §2.5). AbortSignal covers all of it.
      const signal = AbortSignal.timeout(policy.deadline_ms);
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
      text = await res.text();
    } catch (e) {
      const cause = e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'pdp_timeout' : 'pdp_unreachable';
      return { noDecision: cause, requestId };
    }
    if (res.status !== 200) return { noDecision: 'pdp_response_invalid', requestId, detail: `status_${res.status}` };
    if (res.headers.get('x-request-id') !== requestId) return { noDecision: 'pdp_response_invalid', requestId, detail: 'request_id_mismatch' };
    let json;
    try { json = JSON.parse(text); } catch { return { noDecision: 'pdp_response_invalid', requestId, detail: 'json' }; }
    return { json, requestId };
  }

  // Validate one decision object against what we asked for. Returns {allow, decisionId, reason, mode, token} or {noDecision}
  checkDecision(d, requestedMode) {
    if (!d || typeof d.decision !== 'boolean') return { noDecision: 'pdp_response_invalid', detail: 'decision' };
    const prof = d.context?.['x-authz-profile'];
    if (!prof || !OPAQUE(prof.decision_id)) return { noDecision: 'pdp_response_invalid', detail: 'decision_id' };
    if (typeof prof.reason !== 'string' || !REASON_RE.test(prof.reason)) return { noDecision: 'pdp_response_invalid', decisionId: prof.decision_id, detail: 'reason' };
    const mode = prof.consistency?.mode;
    if (!(mode in MODE_RANK) || MODE_RANK[mode] < MODE_RANK[requestedMode]) return { noDecision: 'pdp_response_invalid', decisionId: prof.decision_id, detail: 'consistency_weaker' };
    if (d.decision === true && prof.reason !== 'allow') return { noDecision: 'pdp_response_invalid', decisionId: prof.decision_id, detail: 'allow_reason' };
    if (d.decision === true && Array.isArray(prof.obligations) && prof.obligations.length) return { noDecision: 'pdp_response_invalid', decisionId: prof.decision_id, detail: 'unknown_obligation' };
    if (d.decision === false && NO_DECISION_REASONS.has(prof.reason)) return { noDecision: 'pdp_response_invalid', decisionId: prof.decision_id, detail: prof.reason, pdpReason: prof.reason };
    return { allow: d.decision, decisionId: prof.decision_id, reason: prof.reason, mode, token: prof.consistency?.token ?? null };
  }

  profile(tier, txn, consistencyToken) {
    const mode = tier === 'read-sensitive' ? (consistencyToken ? 'at_least_as_fresh' : 'fully_consistent') : 'fully_consistent';
    const consistency = { mode };
    if (mode === 'at_least_as_fresh') consistency.token = consistencyToken;
    const p = { profile_version: '1.0', consistency };
    if (txn) p.txn = txn;
    return { p, mode };
  }

  async evaluate({ subject, action, resource, tier, txn, txnToken, consistencyToken }) {
    const { p, mode } = this.profile(tier, txn?.txn, consistencyToken);
    const body = { subject, action: { name: action }, resource, context: { 'x-authz-profile': p } };
    const r = await this.post(this.evalUrl, body, { tier, txnToken });
    if (r.noDecision) return { ...r, requestedMode: mode };
    return { ...this.checkDecision(r.json, mode), requestId: r.requestId, requestedMode: mode };
  }

  // evaluations with execute_all; result count must equal request count (CON-16 §2.5)
  async evaluateBatch({ subject, action, resources, tier, txn, txnToken }) {
    const { p, mode } = this.profile(tier, txn?.txn, null);
    const body = {
      subject, action: { name: action }, context: { 'x-authz-profile': p },
      evaluations: resources.map((resource) => ({ resource })),
      options: { evaluations_semantic: 'execute_all' },
    };
    const r = await this.post(this.evalsUrl, body, { tier, txnToken });
    if (r.noDecision) return { ...r, requestedMode: mode };
    const list = r.json?.evaluations;
    if (!Array.isArray(list) || list.length !== resources.length) return { noDecision: 'pdp_response_invalid', detail: 'count', requestId: r.requestId };
    const items = list.map((d) => this.checkDecision(d, mode));
    return { items, requestId: r.requestId, batchDecisionId: r.json?.context?.['x-authz-profile']?.batch_decision_id ?? null };
  }
}
