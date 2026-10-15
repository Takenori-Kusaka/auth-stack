// Own stubs per CON-16 §4 (ST-1 issuer A/B, ST-2 TTS + job ledger, ST-3 programmable PDP, ST-5 audit sink).
// Test-only. Names use .invalid / .test and keys generated per run (CON-16 §4.3).
import http from 'node:http';
import { newEcKey, signES256, parseCompact, verifyES256, opaqueId, b64uJson, b64u } from '../src/jwt.js';
import crypto from 'node:crypto';

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
async function body(req) { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c).toString('utf8'); }
function json(res, status, obj, headers = {}) { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); }

// ---------------- ST-1 issuer ----------------
export async function startIssuer(name) {
  const st = { name, keys: { current: newEcKey(`${name.toLowerCase()}-k1`), next_unpublished: newEcKey(`${name.toLowerCase()}-k2`), unknown_never_published: newEcKey(`${name.toLowerCase()}-kx`) }, published: new Set(['current']), access: { discovery: 0, jwks: 0 }, discoveryOverride: null };
  const { server, url } = await listen(async (req, res) => {
    if (req.url === '/.well-known/openid-configuration') { st.access.discovery++; return json(res, 200, { issuer: st.discoveryOverride?.issuer ?? st.issuer, jwks_uri: `${url}/jwks` }); }
    if (req.url === '/jwks') { st.access.jwks++; return json(res, 200, { keys: [...st.published].map((k) => st.keys[k].pub) }); }
    res.writeHead(404); res.end();
  });
  st.server = server; st.url = url; st.issuer = url; st.discoveryUrl = `${url}/.well-known/openid-configuration`;
  return st;
}

// ---------------- ST-2 TTS + job ledger ----------------
export async function startTts() {
  const st = { key: newEcKey('tts-k1'), issuer: 'https://tts.stub.test.invalid', audience: 'txn-td-stub', records: new Map(), failLedger: false, failTts: false, overrideClaims: null };
  st.mint = (claims, { key = st.key, header = {} } = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const base = { iss: st.issuer, aud: st.audience, iat: now, exp: now + 60, txn: opaqueId(), sub: claims.sub, scope: claims.scope ?? 'rsv.booking.write', req_wl: 'spiffe://stub.test.invalid/edge/gw', tctx: { tid: claims.tid, root_jti: opaqueId(), tier: claims.tier ?? 'write', ver: '1.0' } };
    const payload = { ...base, ...claims, tctx: { ...base.tctx, ...(claims.tctx ?? {}) } };
    delete payload.tid; delete payload.tier;
    return signES256({ typ: 'txntoken+jwt', alg: 'ES256', kid: key.kid, ...header }, payload, key.priv);
  };
  const verifyOwn = (tok) => { const p = parseCompact(tok); if (!p || p.header.kid !== st.key.kid) return null; return verifyES256(p.signingInput, p.signature, st.key.pub) ? p.payload : null; };
  const { server, url } = await listen(async (req, res) => {
    const b = await body(req);
    if (req.url === '/jwks' && req.method === 'GET') return json(res, 200, { keys: [st.key.pub] }, { 'content-type': 'application/jwk-set+json' });
    if (req.url === '/acceptance-records' && req.method === 'POST') {
      if (st.failLedger) return json(res, 503, { code: 'temporarily_unavailable' }, { 'retry-after': '5' });
      const p = verifyOwn(req.headers['txn-token'] ?? '');
      if (!p || p.exp <= Math.floor(Date.now() / 1000)) return json(res, 400, { code: 'invalid_request' });
      let j; try { j = JSON.parse(b); } catch { return json(res, 400, { code: 'invalid_request' }); }
      const allowed = new Set(['job_definition_id', 'grant_ref', 'params_hash', 'consistency_token', 'dedup_key']);
      if (Object.keys(j).some((k) => !allowed.has(k))) return json(res, 400, { code: 'invalid_request' });    // J06
      const id = opaqueId();
      st.records.set(id, { job_run_id: id, sub: p.sub, tid: p.tctx.tid, origin_txn: p.txn, root_jti: p.tctx.root_jti, job_definition_id: j.job_definition_id, gref: p.tctx.gref ?? null });
      return json(res, 201, { job_run_id: id, job_definition_id: j.job_definition_id, origin_txn: p.txn, tier: 'read-sensitive', accepted_at: new Date().toISOString(), subject_token_type: 'urn:uuid:569d2793-a1dc-493e-a1ef-ca2904f77173' }, { 'cache-control': 'no-store' });
    }
    if (req.url === '/txn-token' && req.method === 'POST') {
      if (st.failTts) return json(res, 503, { error: 'temporarily_unavailable' });
      const f = new URLSearchParams(b);
      if (f.get('subject_token_type') !== 'urn:uuid:569d2793-a1dc-493e-a1ef-ca2904f77173') return json(res, 400, { error: 'invalid_request' });
      const rec = st.records.get(f.get('subject_token'));
      if (!rec || rec.revoked) return json(res, 400, { error: 'invalid_request' });
      const tok = st.mint({ sub: rec.sub, tid: rec.tid, tier: 'read-sensitive', scope: f.get('scope'), tctx: { root_jti: rec.root_jti, ptxn: rec.origin_txn }, ...(st.overrideClaims ?? {}) });
      return json(res, 200, { access_token: tok, issued_token_type: 'urn:ietf:params:oauth:token-type:txn_token', token_type: 'N_A', expires_in: 60 }, { 'cache-control': 'no-store', pragma: 'no-cache' });
    }
    res.writeHead(404); res.end();
  });
  st.server = server; st.url = url; st.jwksUrl = `${url}/jwks`;
  return st;
}

// ---------------- ST-3 PDP façade (table + G stage + 16 injections) ----------------
export async function startPdp() {
  const st = { allow: new Set(), revoked: new Set(), inject: null, calls: 0, requests: [], connectDelayed: false };
  const key = (s, a, r) => `${s.id}|${a}|${r.type}|${r.id}`;
  st.grant = (subId, action, type, id) => st.allow.add(`${subId}|${action}|${type}|${id}`);
  const decide = (subject, action, resource, mode) => {
    const did = opaqueId();
    const mk = (decision, reason, m = mode) => ({ decision, context: { 'x-authz-profile': { decision_id: did, reason, model_revision: { model_revision: 'rsv@stub', guardrail_catalog_version: 'g@stub' }, consistency: { mode: m, token: 'v1.stub.' + did } } } });
    // G stage: always on, cannot be disabled
    if (subject?.properties?.tid !== resource?.properties?.tid || !subject?.properties?.tid) return mk(false, 'deny_guardrail:g1');
    const k = key(subject, action.name, resource);
    if (st.revoked.has(k)) return mk(false, 'deny_no_relation');
    return st.allow.has(k) ? mk(true, 'allow') : mk(false, 'deny_no_relation');
  };
  const { server, url } = await listen(async (req, res) => {
    const raw = await body(req);
    if (req.url === '/.well-known/authzen-configuration') return json(res, 200, { policy_decision_point: url, access_evaluation_endpoint: `${url}/access/v1/evaluation`, access_evaluations_endpoint: `${url}/access/v1/evaluations` });
    if (req.method !== 'POST') { res.writeHead(404); return res.end(); }
    st.calls++;
    let reqBody; try { reqBody = JSON.parse(raw); } catch { res.writeHead(400); return res.end('bad json'); }
    st.requests.push({ url: req.url, headers: req.headers, body: reqBody, raw });
    const rid = req.headers['x-request-id'];
    const mode = reqBody.context?.['x-authz-profile']?.consistency?.mode ?? 'fully_consistent';
    const inj = st.inject;
    const hdr = { 'x-request-id': inj === 'request_id_mismatch' ? 'r-other' : rid };
    const deadlineMs = st.deadlineMs ?? 300;
    if (inj === 'timeout') return; // never answer
    if (inj === 'overload_503') return json(res, 503, 'overloaded', { ...hdr, 'retry-after': '1' });
    if (inj === 'quota_429') return json(res, 429, 'quota', { ...hdr, 'retry-after': '1' });
    let out;
    if (req.url.endsWith('/evaluations')) {
      const evs = reqBody.evaluations.map((e) => decide(e.subject ?? reqBody.subject, e.action ?? reqBody.action, e.resource ?? reqBody.resource, mode));
      out = { evaluations: inj === 'count_mismatch' ? evs.slice(1) : evs, context: { 'x-authz-profile': { batch_decision_id: opaqueId() } } };
    } else {
      out = decide(reqBody.subject, reqBody.action, reqBody.resource, mode);
      const prof = out.context['x-authz-profile'];
      if (inj === 'engine_unreachable') { out.decision = false; prof.reason = 'deny_unavailable'; }
      if (inj === 'indeterminate') { out.decision = false; prof.reason = 'deny_indeterminate'; }
      if (inj === 'unsupported_profile') { out.decision = false; prof.reason = 'unsupported_profile'; }
      if (inj === 'deny' || inj === 'revoked_now') { out.decision = false; prof.reason = 'deny_no_relation'; }
      if (inj === 'decision_id_missing') { out.decision = true; prof.reason = 'allow'; delete prof.decision_id; }
      if (inj === 'consistency_weaker') { out.decision = true; prof.reason = 'allow'; prof.consistency.mode = 'minimize_latency'; }
      if (['late_allow', 'body_delay', 'connect_delay', 'tls_stall'].includes(inj)) { out.decision = true; prof.reason = 'allow'; }
    }
    if (inj === 'late_allow') { await new Promise((r) => setTimeout(r, deadlineMs + 150)); return json(res, 200, out, hdr); }
    if (inj === 'body_delay') {
      res.writeHead(200, { 'content-type': 'application/json', ...hdr });
      const s = JSON.stringify(out); res.write(s.slice(0, 5));
      await new Promise((r) => setTimeout(r, deadlineMs + 150)); return res.end(s.slice(5));
    }
    return json(res, 200, out, hdr);
  });
  st.server = server; st.url = url;
  return st;
}

// ---------------- ST-5 audit sink ----------------
export async function startAuditSink() {
  const st = { events: [], invalid: [] };
  const REQ = ['schema_ver', 'ocsf_map_ver', 'record_stage', 'event_id', 'family', 'event_type', 'event_time', 'observed_time', 'integrity', 'cell_id', 'jurisdiction', 'tid', 'tier', 'outcome', 'reason_code', 'data_class', 'corr', 'detail'];
  const { server, url } = await listen(async (req, res) => {
    const b = await body(req);
    try {
      const e = JSON.parse(b);
      const missing = REQ.filter((k) => !(k in e));
      const d = e.detail ?? {};
      if (d.decision_source === 'pdp' && !e.corr?.decision_id) missing.push('corr.decision_id');
      if (d.decision_source === 'none' && !d.no_decision_cause) missing.push('detail.no_decision_cause');
      if (['write', 'privileged'].includes(e.tier) && !(('txn' in e.corr) ^ ('txn_absence' in e.corr))) missing.push('corr.txn|txn_absence');
      if (e.integrity?.producer_seq === 1 && e.integrity.prev_fp !== null) missing.push('prev_fp_initial');
      if (missing.length) st.invalid.push({ e, missing });
      st.events.push(e);
      json(res, 202, {});
    } catch { json(res, 400, {}); }
  });
  st.server = server; st.url = url;
  return st;
}

// ---------------- token minting for vectors ----------------
export function mintAccessToken({ issuerSt, signerKey, claims = {}, header = {}, signer = 'key', audience, tid, sub = 'u-alice-0001', ptype = 'human' }) {
  const now = Math.floor(Date.now() / 1000);
  const base = { iss: issuerSt.issuer, sub, aud: audience, exp: now + 300, iat: now, jti: opaqueId(), client_id: 'c-rsv-web-0001', tid, ptype, ver: '1.0' };
  if (ptype === 'human') Object.assign(base, { acr: 'L2', amr: ['pwd', 'otp'], auth_time: now - 60, sid: opaqueId(), gref: opaqueId() });
  const payload = { ...base, ...claims };
  for (const [k, v] of Object.entries(payload)) if (v === null) delete payload[k];
  const h = { typ: 'at+jwt', alg: 'ES256', kid: signerKey?.kid, ...header };
  for (const [k, v] of Object.entries(h)) if (v === null) delete h[k];
  if (signer === 'unsigned') return `${b64uJson(h)}.${b64uJson(payload)}.`;
  if (signer === 'hmac') {
    const input = `${b64uJson(h)}.${b64uJson(payload)}`;
    const mac = crypto.createHmac('sha256', Buffer.from(JSON.stringify(issuerSt.keys.current.pub))).update(input).digest();
    return `${input}.${b64u(mac)}`;
  }
  // ES256 signature regardless of the header alg (alg-confusion vectors keep a real P-256 signature)
  const input = `${b64uJson(h)}.${b64uJson(payload)}`;
  const key = crypto.createPrivateKey({ key: signerKey.priv, format: 'jwk' });
  const sig = crypto.sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64u(sig)}`;
}
