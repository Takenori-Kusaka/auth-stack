// PDP façade client (CON-03 AuthZEN evaluation / evaluations). CON-16 §2.5-§2.6.
// Any doubt -> "no decision" (OB-05). No allow cache (OB-11).
import { randomId } from './jose.js';

const REASON_RE = /^(allow|deny_no_relation|deny_indeterminate|deny_unavailable|unsupported_profile|deny_guardrail:[a-z0-9][a-z0-9._-]{0,63})$/;
const NO_DECISION_REASONS = new Set(['deny_unavailable', 'deny_indeterminate', 'unsupported_profile']);
const MODE_RANK = { minimize_latency: 0, at_least_as_fresh: 1, fully_consistent: 2 };

export class NoDecision extends Error {
  constructor(cause, info = {}) { super(cause); this.cause_ = cause; Object.assign(this, info); }
}

// Subject mapping (CON-02 x-subject-type-map copy; CON-16 §2.5; CON-18 §5). One place only (SM-4).
export const SUBJECT_TYPE = Object.freeze({ human: 'core/user', workload: 'core/workload', service_account: 'core/client', ai_agent: null });
export const ACTOR_TYPE = Object.freeze({ ai_agent: 'core/workload', workload: 'core/workload', service_account: 'core/client' });

function parseProfile(dec, requestedMode) {
  if (!dec || typeof dec.decision !== 'boolean') throw new NoDecision('pdp_response_invalid');
  const prof = dec.context?.['x-authz-profile'];
  if (!prof || typeof prof.decision_id !== 'string' || prof.decision_id.length < 16 || prof.decision_id.length > 64) throw new NoDecision('pdp_response_invalid', { reasonDetail: 'decision_id' });
  if (typeof prof.reason !== 'string' || !REASON_RE.test(prof.reason)) throw new NoDecision('pdp_response_invalid', { decisionId: prof.decision_id });
  const mode = prof.consistency?.mode;
  if (!(mode in MODE_RANK) || MODE_RANK[mode] < MODE_RANK[requestedMode]) throw new NoDecision('pdp_response_invalid', { decisionId: prof.decision_id, reasonDetail: 'consistency_weaker' });
  if (dec.decision === true && prof.reason !== 'allow') throw new NoDecision('pdp_response_invalid', { decisionId: prof.decision_id });
  return { allow: dec.decision, decisionId: prof.decision_id, reason: prof.reason, consistency: prof.consistency, externalGrantId: prof.external_grant_id ?? null };
}

export class PdpClient {
  constructor(cfg) { this.cfg = cfg; this.calls = 0; }

  async checkMetadata() {
    const r = await fetch(new URL('/.well-known/authzen-configuration', this.cfg.pdpBaseUrl), { signal: AbortSignal.timeout(2000) });
    if (!r.ok) throw new Error('pdp metadata unavailable');
    const m = await r.json();
    if (m.policy_decision_point !== this.cfg.pdpBaseUrl.replace(/\/$/, '')) throw new Error('pdp metadata policy_decision_point mismatch');
  }

  // write+ : fully_consistent. read-sensitive: at_least_as_fresh with a saved token, otherwise the tier default (omitted).
  modeFor(tier, consistencyToken) { return tier === 'read-sensitive' ? (consistencyToken ? 'at_least_as_fresh' : 'minimize_latency') : 'fully_consistent'; }

  async post(path, body, tier, requestId) {
    const tp = this.cfg.failmode.pdp[tier === 'read-sensitive' ? 'read-sensitive' : (tier.startsWith('privileged') ? 'privileged' : 'write')];
    this.calls++;
    let r, text;
    try {
      r = await fetch(new URL(path, this.cfg.pdpBaseUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(tp.deadline_ms), // D(t) covers connect..receive; late responses are discarded
      });
      text = await r.text();
    } catch (e) {
      throw new NoDecision(e?.name === 'TimeoutError' ? 'pdp_timeout' : 'pdp_unreachable');
    }
    if (r.status !== 200) throw new NoDecision('pdp_unreachable', { status: r.status });
    if (r.headers.get('x-request-id') !== requestId) throw new NoDecision('pdp_response_invalid', { reasonDetail: 'request_id_mismatch' });
    try { return JSON.parse(text); } catch { throw new NoDecision('pdp_response_invalid'); }
  }

  buildSubject(principal, tid) {
    const subjectType = SUBJECT_TYPE[principal.ptype];
    const props = { tid, principal_type: principal.ptype };
    if (principal.actor) props.actor = { type: ACTOR_TYPE[principal.actor.ptype], id: principal.actor.sub, principal_type: principal.actor.ptype };
    return { type: subjectType, id: principal.sub, properties: props };
  }

  profileCtx(tier, consistencyToken) {
    const mode = this.modeFor(tier, consistencyToken);
    const prof = { profile_version: this.cfg.profileVersion };
    if (mode !== 'minimize_latency') prof.consistency = consistencyToken && mode !== 'fully_consistent' ? { mode, token: consistencyToken } : { mode };
    return { 'x-authz-profile': prof };
  }

  async evaluate({ principal, tid, action, resourceType, resourceId, tier, txn, consistencyToken }) {
    const requestId = randomId();
    const body = {
      subject: this.buildSubject(principal, tid),
      action: { name: action },
      resource: { type: resourceType, id: resourceId, properties: { tid } },
      context: this.profileCtx(tier, consistencyToken),
    };
    if (txn) body.context['x-authz-profile'].txn = txn;
    const dec = parseProfile(await this.post('/access/v1/evaluation', body, tier, requestId), this.modeFor(tier, consistencyToken));
    if (NO_DECISION_REASONS.has(dec.reason)) throw new NoDecision('pdp_no_decision', { decisionId: dec.decisionId, reason: dec.reason });
    return { ...dec, requestId };
  }

  // execute_all post-check for lists (CON-16 §2.6 v1.2 element rule; INT-02 §3.8)
  async evaluateMany({ principal, tid, action, resourceType, ids, tier }) {
    if (ids.length === 0) return { items: [], requestId: null, decisionIds: [] };
    const requestId = randomId();
    const body = {
      subject: this.buildSubject(principal, tid),
      action: { name: action },
      context: this.profileCtx(tier),
      evaluations: ids.map((id) => ({ resource: { type: resourceType, id, properties: { tid } } })),
      options: { evaluations_semantic: 'execute_all' },
    };
    const res = await this.post('/access/v1/evaluations', body, tier, requestId);
    if (!Array.isArray(res.evaluations) || res.evaluations.length !== ids.length) throw new NoDecision('pdp_response_invalid', { reasonDetail: 'count_mismatch' });
    const out = res.evaluations.map((e) => parseProfile(e, this.modeFor(tier)));
    if (out.some((d) => NO_DECISION_REASONS.has(d.reason))) throw new NoDecision('pdp_no_decision', { decisionIds: out.map((d) => d.decisionId) });
    return { items: out, requestId, decisionIds: out.map((d) => d.decisionId) };
  }
}
