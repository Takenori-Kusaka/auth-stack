// (2) AuthZEN call, self-implemented PEP client for CON-03 (authorization-api.openapi.yaml 0.2.0).
// Rules: CON-03 §6/§7, CON-11 §4.4 (16 injections), INT-00 §6.3 PoC lesson (deadline covers connect).
import crypto from 'node:crypto';

const REASON_RE = /^(allow|deny_no_relation|deny_indeterminate|deny_unavailable|unsupported_profile|deny_guardrail:[a-z0-9][a-z0-9._-]{0,63})$/;
const KNOWN_OBLIGATIONS = new Set(); // we understand none -> any obligation on an allow = deny (CON-03 Obligation)
const MODE_RANK = { minimize_latency: 0, at_least_as_fresh: 1, fully_consistent: 2 };
export const PROFILE_VERSION = '1.0';

/** Outcome: {kind:'allow'|'deny'|'unavailable', decisionId?, reason?, consistency?} */
function interpretDecision(d, requestedMode) {
  if (!d || typeof d.decision !== 'boolean') return { kind: 'unavailable', why: 'no_decision_field' };
  const p = d.context && d.context['x-authz-profile'];
  if (!p || typeof p.decision_id !== 'string' || p.decision_id.length < 16) return { kind: 'unavailable', why: 'missing_decision_id' };
  if (typeof p.reason !== 'string' || !REASON_RE.test(p.reason)) return { kind: 'unavailable', why: 'unknown_reason', decisionId: p.decision_id };
  const mode = p.consistency && p.consistency.mode;
  if (!(mode in MODE_RANK)) return { kind: 'unavailable', why: 'bad_consistency', decisionId: p.decision_id };
  if (requestedMode && MODE_RANK[mode] < MODE_RANK[requestedMode]) return { kind: 'unavailable', why: 'consistency_downgraded', decisionId: p.decision_id };
  if (['deny_unavailable', 'deny_indeterminate', 'unsupported_profile'].includes(p.reason)) return { kind: 'unavailable', why: p.reason, decisionId: p.decision_id };
  if (d.decision === true) {
    if (p.reason !== 'allow') return { kind: 'unavailable', why: 'allow_with_deny_reason', decisionId: p.decision_id };
    for (const o of p.obligations || []) if (!KNOWN_OBLIGATIONS.has(o.type)) return { kind: 'deny', why: 'unknown_obligation', decisionId: p.decision_id, reason: p.reason };
    return { kind: 'allow', decisionId: p.decision_id, reason: p.reason, consistency: p.consistency };
  }
  return { kind: 'deny', decisionId: p.decision_id, reason: p.reason };
}

export class PdpClient {
  constructor(cfg, log = () => {}) {
    this.cfg = cfg;
    this.log = log;
    this.calls = []; // call record (used by tests to validate outgoing requests against the contract)
  }

  async post(path, body, { txnToken, traceparent } = {}) {
    const requestId = crypto.randomUUID();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.cfg.pdpDeadlineMs); // D(t): whole request incl. connect/TLS/body
    const headers = { 'content-type': 'application/json', 'x-request-id': requestId };
    if (txnToken) headers['txn-token'] = txnToken; // forwarded unmodified (CON-03 §4.3 (a))
    if (traceparent) headers.traceparent = traceparent;
    this.calls.push({ path, body, headers });
    try {
      const r = await fetch(new URL(path, this.cfg.pdpBaseUrl), { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
      const text = await r.text(); // body read also inside the deadline
      if (ctrl.signal.aborted) return { kind: 'unavailable', why: 'deadline' };
      if (r.headers.get('deprecation')) this.log({ level: 'warn', msg: 'pdp deprecation header', value: r.headers.get('deprecation'), sunset: r.headers.get('sunset') });
      if (r.status !== 200) return { kind: 'unavailable', why: `http_${r.status}`, retryAfter: r.headers.get('retry-after') };
      if (r.headers.get('x-request-id') !== requestId) return { kind: 'unavailable', why: 'request_id_mismatch' };
      let json;
      try { json = JSON.parse(text); } catch { return { kind: 'unavailable', why: 'bad_json' }; }
      return { kind: 'ok', json };
    } catch (e) {
      return { kind: 'unavailable', why: ctrl.signal.aborted ? 'deadline' : `network:${e.cause?.code || e.name}` };
    } finally {
      clearTimeout(timer);
    }
  }

  static profile(mode, token) {
    const c = { mode };
    if (token) c.token = token;
    return { 'x-authz-profile': { profile_version: PROFILE_VERSION, consistency: c } };
  }

  /** evaluateAccess. tier: 'read_sensitive' | 'write' */
  async evaluate({ subject, action, resource, tier, consistencyToken, txnToken, traceparent }) {
    const mode = tier === 'read_sensitive' ? 'at_least_as_fresh' : 'fully_consistent';
    const body = { subject, action, resource, context: PdpClient.profile(mode, tier === 'read_sensitive' ? consistencyToken : undefined) };
    if (mode === 'at_least_as_fresh' && !consistencyToken) body.context['x-authz-profile'].consistency.mode = 'fully_consistent';
    const r = await this.post('/access/v1/evaluation', body, { txnToken, traceparent });
    if (r.kind !== 'ok') return r;
    return interpretDecision(r.json, body.context['x-authz-profile'].consistency.mode);
  }

  /** evaluateAccessBatch, execute_all; returns array aligned to resources (P-09 post-check). */
  async evaluateBatch({ subject, action, resources, txnToken }) {
    const body = {
      subject, action,
      context: PdpClient.profile('fully_consistent'),
      evaluations: resources.map((resource) => ({ resource })),
      options: { evaluations_semantic: 'execute_all' },
    };
    const r = await this.post('/access/v1/evaluations', body, { txnToken });
    if (r.kind !== 'ok') return { kind: 'unavailable', why: r.why };
    const ev = r.json.evaluations;
    const batchId = r.json.context?.['x-authz-profile']?.batch_decision_id;
    if (!Array.isArray(ev) || ev.length !== resources.length) return { kind: 'unavailable', why: 'evaluations_length_mismatch', batchId };
    return { kind: 'ok', batchId, items: ev.map((d) => interpretDecision(d, 'fully_consistent')) };
  }

  /** searchResources (preview, "SDK list-helper internal only"). Used only as a candidate generator. */
  async searchCandidates({ subject, action, resourceType, tid, pageToken, limit }) {
    const body = { subject, action, resource: { type: resourceType, properties: { tid } }, context: PdpClient.profile('at_least_as_fresh'), page: { limit } };
    delete body.context['x-authz-profile'].consistency.token;
    if (pageToken) body.page.token = pageToken;
    const r = await this.post('/access/v1/search/resource', body);
    if (r.kind !== 'ok') return { kind: 'unavailable', why: r.why };
    const j = r.json;
    if (!Array.isArray(j.results) || !j.page || typeof j.page.next_token !== 'string') return { kind: 'unavailable', why: 'bad_search_response' };
    const comp = j.context?.['x-authz-profile']?.completeness;
    if (!comp || !['complete', 'incomplete'].includes(comp.status)) return { kind: 'unavailable', why: 'bad_completeness' };
    if (comp.status === 'incomplete' && !comp.reason) return { kind: 'unavailable', why: 'x-constraint_violation' };
    return { kind: 'ok', results: j.results, nextToken: j.page.next_token, completeness: comp };
  }
}
