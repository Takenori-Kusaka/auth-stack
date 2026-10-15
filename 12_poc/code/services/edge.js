// Edge gateway (層 E, ADR-005 D1-2..D1-5, claims-catalog §2.4): the only external entry.
//  1. route ledger: unknown routes -> 404 (deny-by-default at the edge)
//  2. external opaque access token: query tokens rejected (V11); RFC 7662 introspection at AS-A with a cache whose
//     age never exceeds the token exp (C_edge configurable, default 0 = no cache)
//  3. sender constraint: cnf.x5t#S256 = TLS client certificate (RFC 8705) or cnf.jkt = DPoP proof (RFC 9449,
//     nonce mandatory, jti replay store, ath). A DPoP-bound token presented as Bearer is rejected.
//  4. route tenant (ii) = path tid must equal the token tid (edge part of ADR-024 D24-07)
//  5. revocation state (ADR-006) for sub / sid / gref / client / tid
//  6. trace re-numbering: external traceparent kept only as ext_trace_id (ADR-005 D9-2)
//  7. RFC 8693 exchange at the STS for the callee audience; Txn-Token at the TTS for write and above
//  8. forward over mTLS with Authorization: Bearer <internal AT>, Txn-Token, traceparent; never unsigned identity headers (OB-01)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { send, request, readBody } from '../lib/http.js';
import { clientTls } from '../lib/topology.js';
import { x5tS256 } from '../lib/pki.js';
import { newTraceparent, parseTraceparent, opaqueId } from '../lib/ids.js';
import { discover, introspect } from '../lib/oauth-client.js';
import { verifyProof, JtiStore, NonceSource } from '../lib/dpop.js';
import { RevocationClient } from '../lib/revocation.js';

const { topo, log } = boot('edge');
const ledger = readJsonFile(topo.files.ledger);
const tls = clientTls(topo, 'edge');
const settings = topo.settings;
const dir = path.join(topo.dataDir, 'edge');
fs.mkdirSync(dir, { recursive: true });
const reqLog = path.join(dir, 'edge-requests.jsonl');
const rlog = (e) => fs.appendFileSync(reqLog, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
const rev = new RevocationClient({ url: topo.urls.state, tls, pollMs: settings.revocationPollMs });
await rev.start();
const asMeta = await discover(topo.urls.asA, tls);
const edgeClient = { type: 'private_key_jwt', clientId: topo.clients.edge.clientId, privateJwkFile: topo.clients.edge.privateJwkFile };
const jtis = new JtiStore(120_000);
const nonces = new NonceSource(30_000);
const introCache = new Map();
const svcUrl = { 'file-service': topo.urls.file, 'tool-service': topo.urls.tool, 'label-service': topo.urls.label };

function matchRoute(method, pathname) {
  for (const e of ledger.entry_points) {
    if (e.method !== method) continue;
    const keys = [];
    const re = new RegExp('^' + e.path.replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    const m = re.exec(pathname);
    if (m) return { ep: e, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

async function introspectCached(token) {
  const k = crypto.createHash('sha256').update(token).digest('base64url');
  const c = introCache.get(k);
  const now = Date.now();
  if (c && c.until > now) return c.v;
  const v = await introspect(asMeta, token, { auth: edgeClient, tls });
  const cEdge = Number(settings.edgeIntrospectionCacheMs || 0);
  if (cEdge > 0 && v && v.active) introCache.set(k, { v, until: Math.min(now + cEdge, v.exp * 1000) });
  return v;
}

function deny(res, status, code, extra = {}) {
  const h = { ...extra };
  if (status === 401 && !h['www-authenticate']) h['www-authenticate'] = 'Bearer error="invalid_token"';
  return send(res, status, { error: status === 404 ? 'not_found' : status === 503 ? 'unavailable' : status === 403 ? 'insufficient_scope' : 'unauthorized' }, h);
}

async function handler(req, res) {
  const t0 = Date.now();
  const url = new URL(req.url, `https://127.0.0.1:${topo.ports.edge}`);
  const rid = opaqueId();
  const extTp = parseTraceparent(req.headers.traceparent);
  const traceparent = newTraceparent(); // re-numbered at the trust boundary
  const traceId = parseTraceparent(traceparent).traceId;
  const L = (e) => rlog({ rid, method: req.method, path: url.pathname, trace_id: traceId, ext_trace_id: extTp?.traceId, ms: Date.now() - t0, ...e });
  if (url.pathname === '/healthz') return send(res, 200, { ok: true });
  if (url.pathname === '/dpop-nonce') return send(res, 200, { ok: true }, { 'dpop-nonce': nonces.current() });
  const route = matchRoute(req.method, url.pathname);
  if (!route) { L({ status: 404, reason: 'no_route' }); return deny(res, 404); }
  const { ep, params } = route;
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : undefined;
  if (ep.tier === 'public') {
    // public entry points (signed URL download): forwarded without token handling, judged by the service
    const r = await request(`${svcUrl[ep.service]}${url.pathname}${url.search}`, { method: req.method, tls, headers: { traceparent }, timeoutMs: 5000 }).catch(() => null);
    L({ ep: ep.id, status: r ? r.status : 503 });
    if (!r) return deny(res, 503);
    return send(res, r.status, r.buffer, { 'content-type': r.headers['content-type'] || 'application/json' });
  }
  if (url.searchParams.has('access_token')) { L({ status: 401, reason: 'token_in_query' }); return deny(res, 401); }
  const m = /^(Bearer|DPoP) ([A-Za-z0-9._~+/=-]+)$/.exec(req.headers.authorization || '');
  if (!m) { L({ status: 401, reason: 'no_token' }); return deny(res, 401); }
  const [, scheme, token] = m;
  let intro;
  try { intro = await introspectCached(token); } catch (e) { L({ status: 503, reason: 'introspection_unavailable' }); return deny(res, 503); }
  if (!intro || intro.active !== true) { L({ status: 401, reason: 'inactive' }); return deny(res, 401); }
  if (intro.iss !== topo.issuers.asA || ![].concat(intro.aud || []).includes(topo.audiences.api)) { L({ status: 401, reason: 'iss_or_aud' }); return deny(res, 401); }
  // sender constraint
  const cnf = intro.cnf || {};
  if (cnf.jkt) {
    if (scheme !== 'DPoP') { L({ status: 401, reason: 'dpop_bound_as_bearer' }); return deny(res, 401); }
    try {
      const pr = await verifyProof(req.headers.dpop, { htm: req.method, htu: url.toString(), accessToken: token, jtiStore: jtis, nonces, windowSec: Number(settings.dpopWindowSec || 60), skewSec: settings.skewSec });
      if (pr.jkt !== cnf.jkt) { L({ status: 401, reason: 'dpop_key_mismatch' }); return deny(res, 401); }
    } catch (e) {
      L({ status: 401, reason: e.code || 'dpop_invalid' });
      if (e.code === 'use_dpop_nonce') return deny(res, 401, 'nonce', { 'www-authenticate': 'DPoP error="use_dpop_nonce"', 'dpop-nonce': nonces.current() });
      return deny(res, 401, 'dpop', { 'dpop-nonce': nonces.current() });
    }
  } else if (cnf['x5t#S256']) {
    const pc = req.socket.getPeerCertificate && req.socket.getPeerCertificate();
    if (!pc || !pc.raw || !req.socket.authorized || x5tS256(pc.raw) !== cnf['x5t#S256']) { L({ status: 401, reason: 'mtls_binding' }); return deny(res, 401); }
  } else if (settings.edgeRequireSenderConstraint !== false) { L({ status: 401, reason: 'unconstrained_token' }); return deny(res, 401); }
  // scope for the entry point
  const have = new Set(String(intro.scope || '').split(' '));
  if (ep.scope && !have.has(ep.scope)) { L({ status: 403, reason: 'insufficient_scope' }); return deny(res, 403); }
  // route tenant == token tenant
  if (params.tid !== undefined && params.tid !== intro.tid) { L({ status: 404, reason: 'route_tenant_mismatch' }); return deny(res, 404); }
  // revocation state
  if (rev.stale(settings.mRevMs)) { L({ status: 503, reason: 'revocation_stale' }); return deny(res, 503); }
  if (rev.revoked({ sub: intro.sub, sid: intro.psid, gref: intro.gref, client_id: intro.client_id, tid: intro.tid }, intro.iat)) { L({ status: 401, reason: 'revoked' }); return deny(res, 401); }
  // exchange for the callee (scope = entry point scope + declared downstream scopes)
  const svc = ledger.services[ep.service];
  const audience = topo.audiences[svc.audience_key];
  const wantScope = [ep.scope, ...((ep.downstream || []).map((d) => d.scope))].filter((s, i, a) => s && have.has(s) && a.indexOf(s) === i).join(' ');
  const ex = await request(`${topo.urls.sts}/token`, {
    method: 'POST', tls, timeoutMs: 3000,
    form: { grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', subject_token: token, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token', resource: audience, scope: wantScope },
  }).catch(() => null);
  if (!ex || ex.status !== 200) { L({ status: ex && ex.status === 400 ? 401 : 503, reason: `exchange_${ex ? ex.json()?.error : 'unreachable'}` }); return deny(res, ex && ex.status === 400 ? 401 : 503); } // no unsigned fallback (D09-42)
  const internal = ex.json().access_token;
  const headers = { authorization: `Bearer ${internal}`, traceparent };
  if (['write', 'privileged', 'break-glass'].includes(ep.tier) || settings.txnForAll) {
    const tt = await request(`${topo.urls.sts}/txn-token`, {
      method: 'POST', tls, timeoutMs: 3000,
      form: { grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', requested_token_type: 'urn:ietf:params:oauth:token-type:txn_token', audience: topo.txnAudience, scope: ep.op, subject_token: internal, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token' },
    }).catch(() => null);
    if (!tt || tt.status !== 200) { L({ status: 503, reason: `txn_${tt ? tt.json()?.error : 'unreachable'}` }); return deny(res, 503); }
    headers['txn-token'] = tt.json().access_token;
  }
  if (body !== undefined) { headers['content-type'] = req.headers['content-type'] || 'application/json'; }
  let r;
  try {
    r = await request(`${svcUrl[ep.service]}${url.pathname}${url.search}`, { method: req.method, headers, body, tls, timeoutMs: 10_000 });
  } catch (e) { L({ ep: ep.id, status: 503, reason: 'service_unreachable' }); return deny(res, 503); }
  L({ ep: ep.id, status: r.status, tid_match: true });
  const out = { 'content-type': r.headers['content-type'] || 'application/json', 'x-edge-trace-id': traceId };
  if (r.headers['www-authenticate']) out['www-authenticate'] = r.headers['www-authenticate'];
  if (r.headers['retry-after']) out['retry-after'] = r.headers['retry-after'];
  return send(res, r.status, r.buffer, out);
}

const server = https.createServer({
  key: fs.readFileSync(topo.workloads.edge.key), cert: fs.readFileSync(topo.workloads.edge.cert),
  ca: [fs.readFileSync(topo.pki.ca)], requestCert: true, rejectUnauthorized: false, minVersion: 'TLSv1.2',
}, (req, res) => handler(req, res).catch((e) => { log.error('edge', { e: e.stack }); if (!res.headersSent) send(res, 500, 'internal error'); }));
await new Promise((ok, ko) => { server.once('error', ko); server.listen(topo.ports.edge, '127.0.0.1', ok); });
ready('edge', topo.urls.edge);
onShutdown(async () => { rev.stop(); await new Promise((r) => server.close(r)); });
