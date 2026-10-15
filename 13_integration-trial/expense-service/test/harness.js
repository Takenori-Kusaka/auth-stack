// Test harness. Everything here is test-only code (CON-11 §6.4 fixture adapter, own keys, stubs).
// Generic mocks (Prism) are expected on 127.0.0.1:4010-4013 (npm run mocks).
import http from 'node:http';
import crypto from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { TokenVerifier } from '../src/token.js';
import { PdpClient } from '../src/pdp.js';
import { StsClient } from '../src/sts.js';
import { AuditProducer } from '../src/audit.js';
import { createApp, Store } from '../src/app.js';
import { loadContracts } from '../src/contracts.js';

export const C = loadContracts();
export const PRISM = { pdp: 'http://127.0.0.1:4010', sts: 'http://127.0.0.1:4011', query: 'http://127.0.0.1:4012', registry: 'http://127.0.0.1:4013' };

export const ISS_A = 'https://as-a.trial.invalid'; // "本番役" issuer of this trial (own keys)
export const ISS_B = 'https://as-b.trial.invalid'; // "sandbox役" issuer (CV-011)
export const AUD = 'https://svc.trial.invalid/s/expense01';
// tenant ids in the CON-06 example form (lower base32, 26 chars): satisfies CON-03, CON-06 and CON-08 patterns
export const T1 = 'ozxw4zltnfzgk3dfnzqxi2lpny';
export const T2 = 'mfrggzdfmztwq2lknnwg23tpob';

export function genEc() { return crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }); }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function sign(header, payload, privateKey, alg = 'ES256') {
  const input = `${b64(header)}.${b64(payload)}`;
  if (alg === 'none') return `${input}.`;
  if (alg === 'HS256') return `${input}.${crypto.createHmac('sha256', 'secret').update(input).digest('base64url')}`;
  const sig = crypto.sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${input}.${sig.toString('base64url')}`;
}

export function listen(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler);
    s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}`, close: () => new Promise((r) => { s.closeAllConnections?.(); s.close(r); }) }));
  });
}

/** Own OIDC discovery + JWKS (no MK-01 exists yet). Supports adding a key later (CV-005). */
export async function startIdp(issuer) {
  const keys = new Map();
  const add = (kid) => { const kp = genEc(); keys.set(kid, kp); return kp; };
  add('k-a1');
  const h = await listen((req, res) => {
    if (req.url === '/.well-known/openid-configuration') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ issuer, jwks_uri: `${h.url}/jwks` })); }
    if (req.url === '/jwks') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ keys: [...keys].map(([kid, kp]) => ({ ...kp.publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' })) })); }
    res.statusCode = 404; res.end();
  });
  const mint = (over = {}, hdr = {}, { kid = 'k-a1', alg = 'ES256', key } = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iss: issuer, sub: 'u-requester', aud: AUD, exp: now + 300, iat: now, jti: crypto.randomUUID(), client_id: 'c-bff', scope: 'expense.read expense.write', tid: T1, ptype: 'human', acr: 'L2', amr: ['pwd', 'otp', 'mfa'], auth_time: now - 10, sid: 's-1', gref: 'g-1', ver: '1.0', ...over };
    for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];
    const header = { typ: 'at+jwt', alg, kid, ...hdr };
    for (const k of Object.keys(header)) if (header[k] === undefined) delete header[k];
    return sign(header, payload, key || keys.get(kid)?.privateKey || genEc().privateKey, alg);
  };
  return { ...h, issuer, keys, add, mint, discovery: `${h.url}/.well-known/openid-configuration` };
}

/** Workaround shim in front of Prism (test-only, see report W-1/W-2):
 *  W-1 echo X-Request-ID and drop Prism's placeholder "string" Deprecation/Sunset headers;
 *  W-2 (opt-in) raise consistency.mode of the static example to the mode the PEP requested. */
export async function startEchoShim(target, { upgradeConsistency = false } = {}) {
  return listen(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    let reqBody = null; try { reqBody = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* not json */ }
    const headers = { ...req.headers }; delete headers.host; delete headers['content-length'];
    const r = await fetch(target + req.url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    const out = {}; r.headers.forEach((v, k) => { if (!['content-length', 'transfer-encoding', 'connection', 'keep-alive'].includes(k)) out[k] = v; });
    if (out.deprecation === 'string') delete out.deprecation;
    if (out.sunset === 'string') delete out.sunset;
    if (req.headers['x-request-id']) out['x-request-id'] = req.headers['x-request-id'];
    let body = Buffer.from(await r.arrayBuffer());
    const want = reqBody?.context?.['x-authz-profile']?.consistency?.mode;
    if (upgradeConsistency && want && r.status === 200) {
      const j = JSON.parse(body.toString());
      const fix = (d) => { const p = d?.context?.['x-authz-profile']; if (p?.consistency) p.consistency.mode = want; };
      fix(j); (j.evaluations || []).forEach(fix);
      body = Buffer.from(JSON.stringify(j));
    }
    res.writeHead(r.status, out); res.end(body);
  });
}

/** Programmable PDP stub for CV-012 injections (MK-03 does not exist yet). */
export async function startPdpStub() {
  const state = { mode: 'allow', delayMs: 0, calls: [] };
  const profile = (reason, mode = 'fully_consistent') => ({ decision_id: crypto.randomBytes(12).toString('hex'), reason, model_revision: { model_revision: 'expense@01TRIAL', guardrail_catalog_version: 'g@trial' }, consistency: { mode } });
  const decide = (body) => {
    const sTid = body.subject?.properties?.tid; const rTid = body.resource?.properties?.tid;
    if (sTid && rTid && sTid !== rTid) return { decision: false, context: { 'x-authz-profile': profile('deny_guardrail:g1') } };
    switch (state.mode) {
      case 'deny': return { decision: false, context: { 'x-authz-profile': profile('deny_no_relation') } };
      case 'engine_unreachable': return { decision: false, context: { 'x-authz-profile': profile('deny_unavailable') } };
      case 'indeterminate': return { decision: false, context: { 'x-authz-profile': profile('deny_indeterminate') } };
      case 'unsupported_profile': return { decision: false, context: { 'x-authz-profile': profile('unsupported_profile') } };
      case 'no_decision_id': { const p = profile('allow'); delete p.decision_id; return { decision: true, context: { 'x-authz-profile': p } }; }
      case 'downgrade': return { decision: true, context: { 'x-authz-profile': profile('allow', 'minimize_latency') } };
      case 'unknown_reason': return { decision: true, context: { 'x-authz-profile': { ...profile('allow'), reason: 'allow_maybe' } } };
      case 'obligation': return { decision: true, context: { 'x-authz-profile': { ...profile('allow'), obligations: [{ type: 'core/record_returned_items' }] } } };
      default: return { decision: true, context: { 'x-authz-profile': profile('allow') } };
    }
  };
  let srv;
  const h = await listen(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    state.calls.push({ url: req.url, body, headers: req.headers });
    const rid = req.headers['x-request-id'];
    const reply = (status, obj, hdr = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...(rid ? { 'x-request-id': rid } : {}), ...hdr }); res.end(JSON.stringify(obj)); };
    if (state.mode === 'timeout') return; // never answer
    if (state.mode === 'late_allow') { setTimeout(() => reply(200, decide({ ...body, __: 0 })), state.delayMs); return; }
    if (state.mode === 'body_delay') { res.writeHead(200, { 'content-type': 'application/json', 'x-request-id': rid }); res.write('{"decision":'); setTimeout(() => res.end('true,"context":{"x-authz-profile":' + JSON.stringify(profile('allow')) + '}}'), state.delayMs); return; }
    if (state.mode === 'overload') return reply(503, 'overloaded', { 'retry-after': '3' });
    if (state.mode === 'quota') return reply(429, 'quota', { 'retry-after': '3' });
    if (state.mode === 'request_id_mismatch') { res.writeHead(200, { 'content-type': 'application/json', 'x-request-id': 'other' }); return res.end(JSON.stringify(decide(body))); }
    if (req.url.endsWith('/evaluations')) {
      const items = (body.evaluations || []).map((e) => decide({ subject: e.subject || body.subject, resource: e.resource || body.resource }));
      return reply(200, { context: { 'x-authz-profile': { batch_decision_id: crypto.randomBytes(12).toString('hex') } }, evaluations: state.mode === 'short_batch' ? items.slice(1) : items });
    }
    return reply(200, decide(body));
  });
  srv = h;
  return { ...srv, state };
}

/** Delay TCP accept (connection establishment) beyond D(t): CON-11 §4.4 row "接続確立の遅延". */
export async function startSlowAccept(target, delayMs) {
  const net = await import('node:net');
  return new Promise((resolve) => {
    const s = net.createServer({ pauseOnConnect: true }, (sock) => {
      setTimeout(() => {
        const up = net.connect(new URL(target).port, '127.0.0.1');
        sock.pipe(up).pipe(sock); sock.resume();
        sock.on('error', () => {}); up.on('error', () => {});
      }, delayMs);
    });
    s.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${s.address().port}`, close: () => new Promise((r) => s.close(r)) }));
  });
}

export function buildApp({ idp, pdpUrl = PRISM.pdp, stsUrl = PRISM.sts, ttsUrl, queryUrl = PRISM.query, env = {} }) {
  const cfg = loadConfig({
    AUTH_OIDC_DISCOVERY_URL: idp.discovery, EXPENSE_SERVICE_AUDIENCE: AUD, AUTHZ_PDP_BASE_URL: pdpUrl,
    AUTH_STS_TOKEN_URL: `${stsUrl}/token`, AUTH_TTS_URL: ttsUrl || `${stsUrl}/txn-token`, AUTHZ_REGISTRY_BASE_URL: PRISM.registry,
    LIFECYCLE_STATE_QUERY_URL: queryUrl, PAYMENT_SERVICE_RESOURCE: 'https://svc.id-domain.example/s/b9k2q7xw', AUTHZ_PDP_DEADLINE_MS: '300', ...env,
  });
  const logs = [];
  const log = (x) => logs.push(x);
  const deps = { cfg, verifier: new TokenVerifier(cfg), pdp: new PdpClient(cfg, log), sts: new StsClient(cfg), audit: new AuditProducer(cfg), registry: { calls: [] }, store: new Store(), log };
  const app = createApp(deps);
  return { ...deps, app, logs };
}

export async function serve(app) {
  return new Promise((r) => app.server.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${app.server.address().port}`)));
}

export async function call(base, method, path, token, body, headers = {}) {
  const r = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  return { status: r.status, headers: Object.fromEntries(r.headers), text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

/** CON-11 §6.4 fixture adapter: create a report owned by (tenant, subject) directly in the store. */
export function fixtureReport(store, { tid = T1, requester = 'u-requester', amount = 5000, unit = 'unit-sales', state = 'draft' } = {}) {
  const id = store.newId();
  store.reports.set(id, { id, tid, requester, unit, amount, description: 'taxi', state, approvals: [] });
  return id;
}

export function fixtureLines(store, tid = T1) {
  store.lines.set(`${tid}|unit-sales`, { head: 'u-manager', parentUnit: 'unit-hq' });
  store.lines.set(`${tid}|unit-hq`, { head: 'u-director', parentUnit: null });
}
