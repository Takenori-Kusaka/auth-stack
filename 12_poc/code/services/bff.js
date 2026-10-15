// BFF reference implementation (P-01): confidential OAuth client (private_key_jwt, PAR, PKCE S256, RFC 9207 iss
// check, certificate-bound tokens via its SVID), server-side session, API calls to the edge over mTLS.
//   GET  /login?as=a|b&tid=<tid>   -> 302 to the AS authorization endpoint (after PAR); `as=b` exercises mix-up handling
//   GET  /cb?code&state&iss        -> code exchange, session cookie
//   ANY  /api/<edge path>          -> forwarded to the edge with the session's access token
//   POST /logout
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { boot, ready, onShutdown } from '../lib/runtime.js';
import { send, request, readBody } from '../lib/http.js';
import { clientTls } from '../lib/topology.js';
import { discover, pkce, par, tokenRequest, checkIssuer } from '../lib/oauth-client.js';

const { topo, log } = boot('bff');
const tls = clientTls(topo, 'bff');
const auth = { type: 'private_key_jwt', clientId: topo.clients.bff.clientId, privateJwkFile: topo.clients.bff.privateJwkFile };
const metas = { a: await discover(topo.urls.asA, tls), b: await discover(topo.urls.asB, tls).catch(() => null) };
const pending = new Map(); // state -> { as, verifier, issuer, created }
const sessions = new Map(); // sid -> { tokens, as, created }
const dir = path.join(topo.dataDir, 'bff');
fs.mkdirSync(dir, { recursive: true });
const blog = (e) => fs.appendFileSync(path.join(dir, 'bff-events.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
const SCOPE = 'openid offline_access files.read files.write files.share tools.use tools.config';

function cookie(req, name) {
  const m = new RegExp(`(?:^|; )${name}=([^;]+)`).exec(req.headers.cookie || '');
  return m ? m[1] : undefined;
}

async function handler(req, res) {
  const url = new URL(req.url, `https://127.0.0.1:${topo.ports.bff}`);
  if (url.pathname === '/healthz') return send(res, 200, { ok: true });
  if (url.pathname === '/login') {
    const which = url.searchParams.get('as') === 'b' ? 'b' : 'a';
    const meta = metas[which];
    if (!meta) return send(res, 503, { error: 'as_unavailable' });
    const p = pkce();
    const state = crypto.randomBytes(16).toString('base64url');
    const pr = await par(meta, {
      response_type: 'code', client_id: auth.clientId, redirect_uri: topo.clients.bff.redirectUri, scope: SCOPE, state,
      nonce: crypto.randomBytes(12).toString('base64url'), code_challenge: p.challenge, code_challenge_method: 'S256', resource: topo.audiences.api,
    }, { auth, tls });
    if (pr.status !== 201) { blog({ ev: 'par_failed', as: which, body: pr.body }); return send(res, 502, { error: 'par_failed' }); }
    pending.set(state, { as: which, verifier: p.verifier, issuer: meta.issuer, created: Date.now() });
    const loc = `${meta.authorization_endpoint}?${new URLSearchParams({ client_id: auth.clientId, request_uri: pr.body.request_uri })}`;
    return send(res, 302, '', { location: loc });
  }
  if (url.pathname === '/cb') {
    const q = Object.fromEntries(url.searchParams);
    const st = pending.get(q.state);
    if (!st) { blog({ ev: 'cb_unknown_state' }); return send(res, 400, { error: 'invalid_state' }); }
    pending.delete(q.state);
    // RFC 9207: the iss parameter must equal the issuer of the AS the request was sent to (mix-up defence)
    const issErr = checkIssuer(q, st.issuer);
    if (issErr) { blog({ ev: 'cb_rejected', reason: issErr, expected_as: st.as }); return send(res, 400, { error: 'invalid_issuer' }); }
    if (q.error) { blog({ ev: 'cb_error', error: q.error }); return send(res, 400, { error: q.error }); }
    const meta = metas[st.as];
    const tr = await tokenRequest(meta, meta.token_endpoint, { grant_type: 'authorization_code', code: q.code, redirect_uri: topo.clients.bff.redirectUri, code_verifier: st.verifier, resource: topo.audiences.api }, { auth, tls });
    if (tr.status !== 200) { blog({ ev: 'token_failed', body: tr.body }); return send(res, 400, { error: 'token_failed' }); }
    const sid = crypto.randomBytes(24).toString('base64url');
    sessions.set(sid, { tokens: tr.body, as: st.as, created: Date.now() });
    blog({ ev: 'login', as: st.as });
    return send(res, 200, { ok: true, as: st.as }, { 'set-cookie': `bff_sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax` });
  }
  if (url.pathname === '/logout' && req.method === 'POST') {
    sessions.delete(cookie(req, 'bff_sid'));
    return send(res, 200, { ok: true }, { 'set-cookie': 'bff_sid=; Path=/; Max-Age=0' });
  }
  if (url.pathname.startsWith('/api/')) {
    const s = sessions.get(cookie(req, 'bff_sid'));
    if (!s) return send(res, 401, { error: 'no_session' });
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : undefined;
    const headers = { authorization: `Bearer ${s.tokens.access_token}` };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (req.headers.traceparent) headers.traceparent = req.headers.traceparent; // the edge re-numbers it
    const r = await request(`${topo.urls.edge}${url.pathname.slice(4)}${url.search}`, { method: req.method, headers, body, tls, timeoutMs: 15_000 }).catch(() => null);
    if (!r) return send(res, 503, { error: 'unavailable' });
    return send(res, r.status, r.buffer, { 'content-type': r.headers['content-type'] || 'application/json', ...(r.headers['x-edge-trace-id'] ? { 'x-edge-trace-id': r.headers['x-edge-trace-id'] } : {}) });
  }
  return send(res, 404, { error: 'not_found' });
}

const server = https.createServer({ key: fs.readFileSync(topo.workloads.bff.key), cert: fs.readFileSync(topo.workloads.bff.cert), minVersion: 'TLSv1.2' },
  (req, res) => handler(req, res).catch((e) => { log.error('bff', { e: e.stack }); if (!res.headersSent) send(res, 500, 'internal error'); }));
await new Promise((ok, ko) => { server.once('error', ko); server.listen(topo.ports.bff, '127.0.0.1', ok); });
ready('bff', topo.urls.bff);
onShutdown(() => new Promise((r) => server.close(r)));
