// PEP SDK (Node) — pep-contract.md (ARC-06) obligations OB-01..OB-14 for services behind the edge.
//   authenticate (OB-02: V1–V14 via lib/jwt.js, revocation state, privileged jti ledger, Txn-Token)
//   bindTenant   (OB-04: L0 three-way match token tid / signed route (tctx) / resource-derived tenant)
//   authorize    (OB-05..OB-08: AuthZEN evaluation through the façade, deny-by-default, decision_id, echo checks)
//   enforce      (OB-10 error mapping, OB-12 E2 enforcement record + sampling-independent counters)
//   propagate    (OB-09: Txn-Token and traceparent unchanged, access token re-exchanged per hop)
//   list         (ADR-025: façade search -> evaluations execute_all post-check; never an empty list on failure)
// There is deliberately no option to skip tenant binding, skip the decision or fail open (OB-15).
import fs from 'node:fs';
import path from 'node:path';
import { request, peerCert, send } from '../lib/http.js';
import { x5tS256 } from '../lib/pki.js';
import { opaqueId, jtiRef, parseTraceparent } from '../lib/ids.js';
import { verifyInternalToken, JwksCache } from '../lib/jwt.js';
import { RevocationClient } from '../lib/revocation.js';
import { AuditProducer, SDK_VER } from '../lib/audit.js';
import { clientTls } from '../lib/topology.js';

export const PEP_SDK_VERSION = SDK_VER;
const UNAVAILABLE = new Set(['deny_unavailable', 'deny_indeterminate', 'unsupported_profile']);

function routeMatch(pattern, pathname) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  const m = re.exec(pathname);
  if (!m) return null;
  return Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
}

export class Pep {
  /**
   * opts: { topo, secrets, workload, log, pdpUrl?, auditLimits?, failModes? }
   */
  constructor(opts) {
    this.topo = opts.topo;
    this.secrets = opts.secrets;
    this.workload = opts.workload;
    this.log = opts.log;
    this.tls = clientTls(this.topo, this.workload);
    this.ledger = JSON.parse(fs.readFileSync(this.topo.files.ledger, 'utf8'));
    this.entryPoints = this.ledger.entry_points.filter((e) => e.service === this.workload);
    const svc = this.ledger.services[this.workload];
    this.audience = this.topo.audiences[svc.audience_key];
    this.pdpUrl = opts.pdpUrl || process.env.PEP_PDP_URL || this.topo.urls.pdp;
    this.kCorr = Buffer.from(this.secrets.kCorr, 'hex');
    this.settings = this.topo.settings;
    this.jwks = new JwksCache({ tls: this.tls, ttlMs: Number(process.env.PEP_JWKS_TTL_MS || 300_000), unknownKidMinIntervalMs: 500 });
    this.rev = new RevocationClient({ url: this.topo.urls.state, tls: this.tls, pollMs: this.settings.revocationPollMs });
    this.audit = new AuditProducer({ topo: this.topo, secrets: this.secrets, workload: this.workload, tls: this.tls, limits: opts.auditLimits });
    this.counters = {}; // entry point -> { processed, with_decision, denied }
    const dir = path.join(this.topo.dataDir, 'pep');
    fs.mkdirSync(dir, { recursive: true });
    this.localLog = path.join(dir, `${this.workload}-enforce.jsonl`);
    this.pdpOk = false;
    this.spiffeId = this.topo.workloads[this.workload].spiffeId;
    this.algs = { at: ['ES256'], txn: ['ES256'], ...(this.settings.verifierAlgs || {}) };
    // RK-02 FM-13 known-answer probe (ADR-013 D13-27, fail-mode-matrix §6.13). Opt-in so that other groups' runs
    // are unchanged: PEP_KNOWN_ANSWER = JSON { intervalMs, allow: {subject, action, resource}, deny: {...} }.
    this.ka = process.env.PEP_KNOWN_ANSWER ? JSON.parse(process.env.PEP_KNOWN_ANSWER) : null;
    this.kaState = { suspect: null, okStreak: 0, registry: null, lastMatchAt: 0, probes: 0 };
  }

  /** RK-07: verifier alg allowlist from the distributed crypto profile (CP) when published, else static config. */
  algFor(kind) {
    const p = this.rev.status && this.rev.status.alg_policy;
    return p && Array.isArray(p[kind]) ? p[kind] : this.algs[kind];
  }

  alarm(rec) {
    fs.appendFileSync(path.join(this.topo.dataDir, 'pep', `${this.workload}-alarms.jsonl`), JSON.stringify({ t: new Date().toISOString(), svc: this.workload, ...rec }) + '\n');
    this.log?.warn('alarm', rec);
  }

  /** RK-02: expected model revision for a tenant from the façade registry snapshot (pin, else current). */
  expectedRevision(tid) {
    const reg = this.kaState.registry;
    if (!reg) return null;
    return (reg.pins && reg.pins[tid]) || reg.current;
  }

  revisionOk(mr, tid, pin) {
    if (!this.ka) return true;
    const got = mr && mr.model_revision;
    if (pin) return got === pin;
    const exp = this.expectedRevision(tid);
    return exp === null || got === exp;
  }

  async knownAnswerOnce() {
    const ka = this.ka;
    const rid = opaqueId();
    const item = (x) => ({ subject: x.subject, action: x.action, resource: x.resource, context: { 'x-authz-profile': { profile_version: '1.0' } } });
    let result = 'unreachable', reason = null;
    try {
      const m = await request(`${this.pdpUrl}/v1/models`, { tls: this.tls, timeoutMs: 1500 });
      if (m.status === 200 && m.json()) this.kaState.registry = m.json();
    } catch { /* keep the last snapshot */ }
    try {
      const r = await request(`${this.pdpUrl}/access/v1/evaluations`, {
        method: 'POST', tls: this.tls, timeoutMs: Number(process.env.PEP_PDP_TIMEOUT_MS || this.settings.pdpTimeoutMs || 2000), headers: { 'x-request-id': rid },
        body: { evaluations: [item(ka.allow), item(ka.deny)], options: { evaluations_semantic: 'execute_all' } },
      });
      if (r.status === 200 && r.headers['x-request-id'] === rid && r.json()) {
        const ev = r.json().evaluations || [];
        const a = Pep.interpret(ev[0]), d = Pep.interpret(ev[1]);
        if (a.unavailable || d.unavailable) { result = 'no_decision'; reason = a.unavailable || d.unavailable; }
        else if (a.allow !== true) { result = 'mismatch'; reason = 'known_allow_denied'; }
        else if (d.allow !== false) { result = 'mismatch'; reason = 'known_deny_allowed'; }
        else if (!this.revisionOk(a.model_revision, ka.allow.resource.properties.tid)) { result = 'mismatch'; reason = 'model_revision_regressed'; }
        else result = 'match';
      }
    } catch { /* unreachable: handled per request as deny_unavailable */ }
    this.kaState.probes++;
    fs.appendFileSync(path.join(this.topo.dataDir, 'pep', `${this.workload}-probe.jsonl`), JSON.stringify({ t: new Date().toISOString(), request_id: rid, result, reason }) + '\n');
    if (result === 'mismatch') {
      this.kaState.okStreak = 0;
      if (!this.kaState.suspect) {
        this.kaState.suspect = { since: Date.now(), reason };
        this.alarm({ type: 'fm13_wrong_answer', reason, action: 'pdp_treated_as_unavailable', freeze: 'requested_not_modelled', allow_widening: reason === 'known_deny_allowed' });
      }
    } else if (result === 'match') {
      this.kaState.lastMatchAt = Date.now();
      this.kaState.okStreak++;
      if (this.kaState.suspect && this.kaState.okStreak >= 2) {
        this.alarm({ type: 'fm13_cleared', reason: this.kaState.suspect.reason, suspect_ms: Date.now() - this.kaState.suspect.since });
        this.kaState.suspect = null;
      }
    }
    return { result, reason };
  }

  startKnownAnswer() {
    const iv = Number(this.ka.intervalMs || 250);
    const loop = async () => { try { await this.knownAnswerOnce(); } finally { this.kaTimer = setTimeout(loop, iv); this.kaTimer.unref?.(); } };
    return this.knownAnswerOnce().then(() => { this.kaTimer = setTimeout(loop, iv); this.kaTimer.unref?.(); });
  }

  async start() {
    await this.rev.start();
    await this.checkPdpMetadata();
    if (this.ka) await this.startKnownAnswer();
    return this;
  }

  /** AuthZEN §9.2.3: do not use metadata whose policy_decision_point differs from the configured identifier. */
  async checkPdpMetadata() {
    try {
      const r = await request(`${this.pdpUrl}/.well-known/authzen-configuration`, { tls: this.tls, timeoutMs: 2000 });
      const m = r.json();
      this.pdpOk = r.status === 200 && m && m.policy_decision_point === this.topo.issuers.pdp;
      if (!this.pdpOk) this.log?.warn('pdp metadata rejected', { got: m && m.policy_decision_point });
    } catch {
      this.pdpOk = false;
    }
    return this.pdpOk;
  }

  findEntryPoint(method, pathname) {
    for (const e of this.entryPoints) {
      if (e.method !== method) continue;
      const params = routeMatch(e.path, pathname);
      if (params) return { ep: e, params };
    }
    return null;
  }

  count(ep, k) {
    const c = (this.counters[ep] ||= { processed: 0, with_decision: 0, denied: 0, permitted: 0 });
    c[k]++;
  }

  local(rec) { fs.appendFileSync(this.localLog, JSON.stringify({ t: new Date().toISOString(), svc: this.workload, ...rec }) + '\n'); }

  // ---------------------------------------------------------------------------------------------
  // OB-02 authenticate
  // ---------------------------------------------------------------------------------------------
  async authenticate(req, ep) {
    const url = new URL(req.url, 'https://local');
    if (url.searchParams.has('access_token')) return { error: 'token_in_query' }; // V11
    const authz = req.headers.authorization || '';
    const m = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authz);
    if (!m) return { error: 'no_token' };
    const token = m[1];
    const pc = peerCert(req);
    const peerX5t = pc && pc.raw ? x5tS256(pc.raw) : undefined;
    let v;
    try {
      v = await verifyInternalToken(token, {
        kind: 'at', audience: this.audience,
        issuers: { [this.topo.issuers.sts]: { jwksUrl: `${this.topo.urls.sts}/jwks`, jwksPeer: this.topo.workloads.sts.spiffeId, algs: this.algFor('at'), cell: this.topo.cellId } },
        jwks: this.jwks, skewSec: this.settings.skewSec, acceptedMajors: [1], requireCnf: true,
        isKidRevoked: (kid) => this.rev.kidRevoked(kid), tenantCell: (tid) => this.rev.tenantCell(tid),
      }, { peerX5t });
    } catch (e) {
      return { error: `verify:${e.code}`, detail: String(e.message).slice(0, 300) };
    }
    const p = v.payload;
    const principal = {
      sub: p.sub, ptype: p.ptype, tid: p.tid, acr: p.acr, amr: p.amr, auth_time: p.auth_time, sid: p.sid, gref: p.gref,
      client_id: p.client_id, act: p.act, scope: p.scope, iss: p.iss, jti: p.jti, jti_ref: jtiRef(this.kCorr, p.iss, p.jti),
      accessToken: token, exp: p.exp,
    };
    // revocation state (ADR-006): stale state -> no decision for read-sensitive and above
    if (ep.tier !== 'public' && this.rev.stale(this.settings.mRevMs)) return { error: 'revocation_stale', unavailable: true };
    if (this.rev.revoked({ sub: p.sub, sid: p.sid, gref: p.gref, client_id: p.client_id, tid: p.tid, jti_ref: principal.jti_ref, act: p.act }, p.iat)) return { error: 'revoked' };
    // privileged: jti must be in the issuance ledger (ADR-005 D1-6)
    if (ep.tier === 'privileged' || ep.tier === 'break-glass') {
      try {
        const lr = await request(`${this.topo.urls.state}/ledger/${encodeURIComponent(principal.jti_ref)}`, { tls: this.tls, timeoutMs: 1500 });
        if (lr.status === 404) return { error: 'jti_not_issued', alarm: true };
        if (lr.status !== 200) return { error: 'ledger_unavailable', unavailable: true };
      } catch { return { error: 'ledger_unavailable', unavailable: true }; }
    }
    // Txn-Token: required for write and above; verified together with the access token (ADR-005 D9-3)
    const txnTok = req.headers['txn-token'];
    if (txnTok !== undefined) {
      try {
        const tv = await verifyInternalToken(txnTok, {
          kind: 'txn', audience: this.topo.txnAudience,
          issuers: { [this.topo.issuers.tts]: { jwksUrl: `${this.topo.urls.sts}/tts/jwks`, jwksPeer: this.topo.workloads.sts.spiffeId, algs: this.algFor('txn'), cell: this.topo.cellId } },
          jwks: this.jwks, skewSec: this.settings.skewSec, acceptedMajors: [1],
          isKidRevoked: (kid) => this.rev.kidRevoked(kid), tenantCell: (tid) => this.rev.tenantCell(tid),
        });
        const t = tv.payload;
        if (t.sub !== p.sub) return { error: 'txn_sub_mismatch' };
        principal.txn = t.txn;
        principal.tctx = t.tctx;
        principal.txnToken = txnTok;
        principal.txnScope = t.scope;
      } catch (e) {
        return { error: `txn_verify:${e.code}` };
      }
    } else if (ep.tier === 'write' || ep.tier === 'privileged' || ep.tier === 'break-glass') {
      return { error: 'txn_required' };
    }
    return { principal };
  }

  // ---------------------------------------------------------------------------------------------
  // OB-04 L0 three-way tenant match
  // ---------------------------------------------------------------------------------------------
  async bindTenant(principal, ep, params, resolver) {
    const tTok = principal.tid;
    if (!tTok) return { deny: 'l0:missing' };
    if (principal.tctx && principal.tctx.tid !== tTok) return { deny: 'l0:mismatch' };
    // signed route context (ii): the Txn-Token tctx when present (pep-contract §3.3, L06-10)
    const tRoute = principal.tctx ? principal.tctx.tid : null;
    if (tRoute && tRoute !== tTok) return { deny: 'l0:mismatch' };
    // the unsigned path tenant is never a source of (i)-(iii); a disagreement is still a mismatch (defence in depth)
    if (params.tid !== undefined && params.tid !== tTok) return { deny: 'l0:mismatch' };
    let tRes;
    if (ep.kind === 'EXISTING' || ep.kind === 'CREATE_CHILD') {
      let r;
      try { r = await resolver({ type: ep.resource_type, id: params.id }); } catch { r = { unresolvable: true }; }
      if (!r || r.notFound) return { deny: 'l0:not_found' };
      if (r.unresolvable) return { deny: 'l0:indeterminate' };
      tRes = r.tid;
    } else if (ep.kind === 'CREATE_ROOT' || ep.kind === 'COLLECTION') {
      tRes = tTok;
    } else return { deny: 'l0:indeterminate' };
    if (tRes !== tTok) return { deny: 'l0:mismatch' };
    return { tid: tTok };
  }

  // ---------------------------------------------------------------------------------------------
  // OB-05..OB-08 authorize via façade
  // ---------------------------------------------------------------------------------------------
  subjectOf(principal, tid) {
    const props = { tid, principal_type: principal.ptype };
    if (principal.acr) props.acr = principal.acr;
    if (principal.auth_time) props.auth_time = principal.auth_time;
    if (principal.act) props.actor = { type: principal.act.ptype || 'workload', id: principal.act.sub };
    return { type: 'core/user', id: principal.sub, properties: props };
  }

  profileFor(principal, opts = {}) {
    const prof = { profile_version: '1.0' };
    if (opts.consistency) prof.consistency = opts.consistency;
    if (principal.txn) prof.txn = principal.txn;
    if (opts.modelPin) prof.model = { pin: opts.modelPin };
    return prof;
  }

  corrOf(principal) { return { iss: principal.iss, jti_ref: principal.jti_ref, sid: principal.sid, grant_ref: principal.gref }; }

  async pdpCall(pathname, body, ctx) {
    if (!this.pdpOk && !(await this.checkPdpMetadata())) return { unavailable: 'pdp_metadata' };
    if (this.kaState && this.kaState.suspect) return { unavailable: `pdp_suspect:${this.kaState.suspect.reason}` }; // RK-02: FM-13 -> as FM-02
    const requestId = opaqueId();
    const headers = { 'x-request-id': requestId };
    if (ctx.traceparent) headers.traceparent = ctx.traceparent;
    let r;
    try {
      r = await request(`${this.pdpUrl}${pathname}`, { method: 'POST', body, headers, tls: this.tls, timeoutMs: Number(process.env.PEP_PDP_TIMEOUT_MS || this.settings.pdpTimeoutMs || 2000) });
    } catch (e) {
      return { unavailable: `pdp_unreachable:${e.code || e.message}`, requestId };
    }
    if (r.status !== 200) return { unavailable: `pdp_status_${r.status}`, requestId };
    if (r.headers['x-request-id'] !== requestId) return { unavailable: 'request_id_echo', requestId };
    const j = r.json();
    if (!j) return { unavailable: 'pdp_body', requestId };
    return { body: j, requestId };
  }

  static interpret(dec) {
    const prof = dec?.context?.['x-authz-profile'];
    if (!prof || !prof.decision_id) return { allow: false, unavailable: 'decision_id_missing' };
    if (!prof.reason || !prof.model_revision?.model_revision) return { allow: false, unavailable: 'profile_incomplete', decision_id: prof.decision_id };
    if (UNAVAILABLE.has(prof.reason)) return { allow: false, unavailable: prof.reason, decision_id: prof.decision_id, reason: prof.reason, model_revision: prof.model_revision };
    if (dec.decision === true && prof.reason !== 'allow') return { allow: false, unavailable: 'inconsistent_decision', decision_id: prof.decision_id };
    return { allow: dec.decision === true, decision_id: prof.decision_id, reason: prof.reason, model_revision: prof.model_revision, consistency: prof.consistency };
  }

  async authorize(principal, tid, action, resource, ctx, opts = {}) {
    // Optional PEP decision cache (authorization-model.md §9.1: read-sensitive only, max age <= min(B, B_rs),
    // dropped when the revocation epoch advances, ADR-006 D6-10). Off unless PEP_DECISION_CACHE_MS > 0
    // (TC-008 layer condition). Never used with a consistency token or a model pin, never for write and above.
    const cacheMs = Number(process.env.PEP_DECISION_CACHE_MS || 0);
    const cacheable = cacheMs > 0 && opts.tier === 'read-sensitive' && !opts.consistency && !opts.modelPin;
    const ck = cacheable ? `${principal.sub}|${tid}|${action}|${resource.type}|${resource.id}|${principal.acr}` : null;
    if (ck) {
      const e = (this.decisionCache ||= new Map()).get(ck);
      if (e && Date.now() - e.at <= cacheMs && e.epoch === this.rev.epoch) return { ...e.dec, cache: 'hit', cached_at: e.at };
    }
    const body = {
      subject: this.subjectOf(principal, tid),
      action: { name: action },
      resource: { type: resource.type, id: resource.id, properties: { tid } },
      context: { 'x-authz-profile': this.profileFor(principal, opts), 'x-authz-corr': this.corrOf(principal) },
    };
    const r = await this.pdpCall('/access/v1/evaluation', body, ctx);
    if (r.unavailable) return { allow: false, unavailable: r.unavailable, requestId: r.requestId };
    const out = { ...Pep.interpret(r.body), requestId: r.requestId };
    if (!out.unavailable && !this.revisionOk(out.model_revision, tid, opts.modelPin)) { // RK-02: version regression
      this.alarm({ type: 'fm13_revision_mismatch', got: out.model_revision?.model_revision, expected: opts.modelPin || this.expectedRevision(tid), decision_id: out.decision_id });
      return { allow: false, unavailable: 'model_revision_mismatch', decision_id: out.decision_id, requestId: r.requestId };
    }
    if (ck && !out.unavailable) {
      if (this.decisionCache.size > 10_000) this.decisionCache.clear();
      this.decisionCache.set(ck, { dec: out, at: Date.now(), epoch: this.rev.epoch });
    }
    return out;
  }

  /** evaluations with a fixed semantic (all -> deny_on_first_deny, any -> permit_on_first_permit, list -> execute_all) */
  async authorizeMany(principal, tid, items, ctx, { semantic = 'execute_all', ...opts } = {}) {
    const body = {
      subject: this.subjectOf(principal, tid),
      context: { 'x-authz-profile': this.profileFor(principal, opts), 'x-authz-corr': this.corrOf(principal) },
      evaluations: items.map((it) => ({ action: { name: it.action }, resource: { type: it.type, id: it.id, properties: { tid } } })),
      options: { evaluations_semantic: semantic },
    };
    const r = await this.pdpCall('/access/v1/evaluations', body, ctx);
    if (r.unavailable) return { unavailable: r.unavailable, requestId: r.requestId };
    return { results: (r.body.evaluations || []).map((d) => Pep.interpret(d)).map((x) => (!x.unavailable && !this.revisionOk(x.model_revision, tid, opts.modelPin) ? { allow: false, unavailable: 'model_revision_mismatch', decision_id: x.decision_id } : x)), batch_decision_id: r.body.context?.['x-authz-profile']?.batch_decision_id, requestId: r.requestId };
  }

  // ---------------------------------------------------------------------------------------------
  // OB-12 enforcement record (E2) — schema-valid audit when a decision exists, pep-local log always
  // ---------------------------------------------------------------------------------------------
  async recordEnforcement({ ep, principal, tid, resource, action, dec, result, failMode, reasonCode, ctx }) {
    const human = principal.ptype === 'human';
    const subjectP = human ? { type: 'human', subj_ref: this.audit.subjRef(principal.sub), client_id: principal.client_id } : { type: principal.ptype, nhi_id: principal.sub };
    const onBehalf = human ? { type: 'human', subj_ref: this.audit.subjRef(principal.sub) } : { type: principal.ptype, nhi_id: principal.sub };
    const chain = [{ type: 'workload', nhi_id: this.spiffeId }];
    const tier = ep.tier;
    const ev = {
      family: 'enforcement', event_type: 'pep.enforce', tid, tier, outcome: result === 'permitted' ? 'success' : 'failure',
      reason_code: reasonCode, subject: subjectP, actor: { mode: 'delegated', chain, on_behalf_of: onBehalf },
      resource: { type: resource.type, res_ref: this.audit.resRef(resource.type, resource.id) }, action: { name: action },
      corr: { iss: principal.iss, jti_ref: principal.jti_ref, sid: principal.sid, grant_ref: principal.gref, txn: principal.txn, decision_id: dec.decision_id, request_id: dec.requestId, trace_id: ctx.traceId },
      detail: { entry_point_id: ep.id, result, pep_id: this.spiffeId, pep_sdk_version: PEP_SDK_VERSION, ...(failMode ? { fail_mode: failMode } : {}) },
    };
    if (tier === 'privileged') ev.tier_sub = ep.tier_sub || 'T';
    if (!dec.decision_id || !dec.requestId) return { ok: true, mode: 'local_only' };
    if ((tier === 'write' || tier === 'privileged') && !principal.txn) return { ok: true, mode: 'local_only' };
    return this.audit.emit(ev);
  }

  deny(res, status, extraHeaders = {}) {
    if (status === 404) return send(res, 404, { error: 'not_found' }, extraHeaders);
    if (status === 401) return send(res, 401, { error: 'unauthorized' }, { 'www-authenticate': 'Bearer error="invalid_token"', ...extraHeaders });
    if (status === 503) return send(res, 503, { error: 'unavailable' }, { 'retry-after': '1', ...extraHeaders });
    return send(res, status, { error: 'forbidden' }, extraHeaders);
  }

  /**
   * One-call guard for a request: OB-03 entry point, OB-02, OB-04, OB-06..OB-08, OB-10, OB-12.
   * resolver(resourceRef) -> { tid } | { notFound: true } | { unresolvable: true }  (from the service's own store)
   * Returns { ok: true, ctx } or { ok: false } (response already sent).
   */
  async guard(req, res, { resolver, consistencyToken, modelPin } = {}) {
    const url = new URL(req.url, 'https://local');
    const found = this.findEntryPoint(req.method, url.pathname);
    if (!found) { this.local({ ep: null, path: url.pathname, result: 'no_entry_point' }); send(res, 404, { error: 'not_found' }); return { ok: false }; }
    const { ep, params } = found;
    this.count(ep.id, 'processed');
    const tp = parseTraceparent(req.headers.traceparent);
    const ctx = { ep, params, traceparent: tp ? req.headers.traceparent : undefined, traceId: tp?.traceId };
    const a = await this.authenticate(req, ep);
    if (a.error) {
      this.count(ep.id, 'denied');
      this.local({ ep: ep.id, result: 'denied', internal_reason: a.unavailable ? 'deny_failmode' : 'deny_token', detail: a.error, verify_detail: a.detail, alarm: !!a.alarm, trace_id: ctx.traceId });
      this.deny(res, a.unavailable ? 503 : 401);
      return { ok: false };
    }
    const principal = a.principal;
    ctx.principal = principal;
    const b = await this.bindTenant(principal, ep, params, resolver);
    if (b.deny) {
      this.count(ep.id, 'denied');
      this.local({ ep: ep.id, result: 'denied', internal_reason: `deny_${b.deny.replace(':', ':')}`, jti_ref: principal.jti_ref, txn: principal.txn, trace_id: ctx.traceId });
      this.deny(res, 404);
      return { ok: false };
    }
    ctx.tid = b.tid;
    // COLLECTION (一覧・検索) has no single resource: the entry gate is the tenant membership check
    // (core/tenant#belongs, read-sensitive); per-item authority comes from the ADR-025 list helper (post-check).
    // Before CH-ESPA-02 the SDK sent resource.id = undefined, which the façade rejects with 400 -> always 503.
    const isCollection = ep.kind === 'COLLECTION';
    const resource = isCollection ? { type: 'core/tenant', id: b.tid } : { type: ep.resource_type, id: params.id };
    ctx.resource = resource;
    const consistency = consistencyToken ? { token: consistencyToken } : undefined;
    const dec = await this.authorize(principal, b.tid, isCollection ? 'belongs' : ep.permission, resource, ctx, { consistency, modelPin, tier: ep.tier });
    ctx.decision = dec;
    this.count(ep.id, 'with_decision');
    let status = 0, result = 'permitted', failMode, reasonCode = dec.reason || 'deny_unavailable';
    if (dec.unavailable) { status = 503; result = 'denied'; failMode = 'deny'; reasonCode = dec.reason || 'deny_unavailable'; }
    else if (!dec.allow) {
      result = 'denied';
      status = dec.reason === 'deny_guardrail:g4_insufficient_acr' ? 401 : 404;
    }
    const ar = await this.recordEnforcement({ ep, principal, tid: b.tid, resource, action: isCollection ? 'belongs' : ep.permission, dec, result, failMode, reasonCode: dec.allow ? 'allow' : reasonCode, ctx });
    if (dec.allow && !ar.ok) { status = 503; result = 'denied'; failMode = 'spool_reject'; }
    this.local({ ep: ep.id, result, internal_reason: dec.allow && ar.ok ? 'allow' : dec.unavailable ? `deny_failmode:${dec.unavailable}` : (failMode === 'spool_reject' ? 'deny_failmode:audit' : `deny_pdp:${dec.reason}`), decision_id: dec.decision_id, request_id: dec.requestId, jti_ref: principal.jti_ref, txn: principal.txn, trace_id: ctx.traceId, tier: ep.tier, audit: ar.mode, ...(dec.cache ? { decision_cache: dec.cache } : {}) });
    if (status) {
      this.count(ep.id, 'denied');
      if (status === 401) send(res, 401, { error: 'insufficient_user_authentication' }, { 'www-authenticate': 'Bearer error="insufficient_user_authentication", acr_values="L2-PR"' });
      else this.deny(res, status);
      return { ok: false };
    }
    this.count(ep.id, 'permitted');
    return { ok: true, ctx };
  }

  // ---------------------------------------------------------------------------------------------
  // OB-09 downstream call: re-exchange the access token, pass Txn-Token and traceparent unchanged
  // ---------------------------------------------------------------------------------------------
  async exchangeFor(ctx, calleeAudience, scope) {
    const r = await request(`${this.topo.urls.sts}/token`, {
      method: 'POST', tls: this.tls, timeoutMs: 3000,
      form: { grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', subject_token: ctx.principal.accessToken, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token', resource: calleeAudience, scope },
    });
    if (r.status !== 200) return { error: r.json()?.error || `status_${r.status}`, status: r.status };
    return { token: r.json().access_token };
  }

  async callDownstream(ctx, { baseUrl, audience, scope, method = 'GET', path: p, body }) {
    const ex = await this.exchangeFor(ctx, audience, scope);
    if (ex.error) return { error: `exchange:${ex.error}`, status: 503 };
    const headers = { authorization: `Bearer ${ex.token}` };
    if (ctx.principal.txnToken) headers['txn-token'] = ctx.principal.txnToken;
    if (ctx.traceparent) headers.traceparent = ctx.traceparent;
    try {
      const r = await request(`${baseUrl}${p}`, { method, body, headers, tls: this.tls, timeoutMs: 5000 });
      return { status: r.status, body: r.json() ?? r.text };
    } catch (e) {
      return { error: e.message, status: 503 };
    }
  }

  // ---------------------------------------------------------------------------------------------
  // ADR-025 list helper: candidates (façade search or the service's own index) + evaluations execute_all
  // ---------------------------------------------------------------------------------------------
  async postCheck(ctx, type, permission, ids) {
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const r = await this.authorizeMany(ctx.principal, ctx.tid, chunk.map((id) => ({ action: permission, type, id })), ctx, { semantic: 'execute_all' });
      if (r.unavailable) return { unavailable: r.unavailable };
      if (r.results.length !== chunk.length) return { unavailable: 'short_batch' };
      r.results.forEach((d, j) => { if (d.unavailable) out.push({ id: chunk[j], unavailable: true }); else if (d.allow) out.push({ id: chunk[j], decision_id: d.decision_id }); });
      if (out.some((x) => x.unavailable)) return { unavailable: 'item_unavailable' };
    }
    return { items: out };
  }

  async searchViaFacade(ctx, type, permission, { limit = 50, token } = {}) {
    const body = {
      subject: this.subjectOf(ctx.principal, ctx.tid), action: { name: permission }, resource: { type },
      context: { 'x-authz-profile': this.profileFor(ctx.principal) }, page: { limit, ...(token ? { token } : {}) },
    };
    const r = await this.pdpCall('/access/v1/search/resource', body, ctx);
    if (r.unavailable) return { unavailable: r.unavailable };
    const j = r.body;
    const pc = await this.postCheck(ctx, type, permission, (j.results || []).map((x) => x.id));
    if (pc.unavailable) return { unavailable: pc.unavailable };
    return { items: pc.items, next: j.page?.next_token || '', completeness: j.context?.['x-authz-profile']?.completeness || { status: 'incomplete', reason: 'budget_exhausted' } };
  }

  counterSnapshot() { return JSON.parse(JSON.stringify(this.counters)); }
  stop() { this.rev.stop(); clearTimeout(this.kaTimer); this.audit.close(); }
}

export async function createPep(opts) { return new Pep(opts).start(); }
