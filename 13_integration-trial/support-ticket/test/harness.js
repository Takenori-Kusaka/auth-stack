// Test harness: starts stubs, the SUT (in-process) and provides minting + fixtures (ST-8).
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { signES256, randomId, b64u } from '../src/jose.js';
import { startIssuer, startTts, startPdp, startRegistry, startExternalGrant, startAuditSink } from './stubs.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function startWorld() {
  const A = await startIssuer('A');
  const B = await startIssuer('B');
  const tts = await startTts();
  const pdp = await startPdp();
  const homes = new Map();
  const directory = { home: (sub) => homes.get(sub) };
  const registry = await startRegistry(pdp, directory);
  const xg = await startExternalGrant(pdp);
  const sink = await startAuditSink();

  const ids = {
    t1: randomId(), t2: randomId(), t3: randomId(),
    self: randomId(), other: randomId(), staff: randomId(), admin: randomId(), partner: randomId(), guest: randomId(),
    agent: randomId(), t2user: randomId(),
    deskAgentClient: randomId(), autonomousClient: randomId(), bffClient: randomId(),
  };
  for (const s of ['self', 'other', 'staff', 'admin']) homes.set(ids[s], ids.t1);
  homes.set(ids.guest, ids.t2); homes.set(ids.t2user, ids.t2); homes.set(ids.partner, ids.t3);

  const env = {
    AUTH_ENVIRONMENT: 'kit',
    AUTH_OIDC_DISCOVERY_URL: `${A.url}/.well-known/openid-configuration`,
    AUTH_SERVICE_AUDIENCE: 'svc-sup-ticket',
    AUTH_VERIFIER_CONFIG_URL: pathToFileURL(path.join(here, '..', 'config', 'verifier-config.json')).href,
    AUTHZ_FAILMODE_CONFIG_URL: pathToFileURL(path.join(here, '..', 'config', 'failmode-config.json')).href,
    AUTHZ_PDP_BASE_URL: pdp.url,
    AUTH_TTS_ISSUER: tts.issuer, AUTH_TTS_AUDIENCE: tts.audience, AUTH_TTS_JWKS_URL: `${tts.url}/txn-token-jwks`, AUTH_TTS_URL: tts.url,
    AUTH_JOB_LEDGER_URL: tts.url,
    EXTERNAL_GRANT_API_URL: xg.url,
    AUTHZ_REGISTRY_BASE_URL: registry.url,
    AUDIT_SINK_URL: sink.url,
    AUTH_CELL_ID: 'kit0', AUTH_JURISDICTION: 'jp',
    WORKLOAD_SPIFFE_ID: 'spiffe://stub.test.invalid/svc/sup-ticket',
  };

  const w = { A, B, tts, pdp, registry, xg, sink, ids, env, homes };

  w.startSut = async () => {
    const cfg = await loadConfig(env);
    const app = await createApp(cfg);
    await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
    w.app = app; w.base = `http://127.0.0.1:${app.server.address().port}`;
    return app;
  };
  w.stopSut = async () => { if (w.app) { await new Promise((r) => w.app.server.close(r)); w.app = null; } };
  w.stopAll = async () => { await w.stopSut(); for (const s of [A, B, tts, pdp, registry, xg, sink]) await new Promise((r) => s.server.close(r)); };

  // ---- minting ----
  const signers = { 'A.current': A.keys.current, 'A.next_unpublished': A.keys.next_unpublished, 'A.unknown_never_published': A.keys.unknown_never_published, 'B.current': B.keys.current, 'TTS.current': tts.key };
  w.issuerUrl = (n) => (n === 'A' ? A.url : n === 'B' ? B.url : 'https://issuer-other.test.invalid');
  w.accessClaims = (over = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return { iss: A.url, sub: ids.self, aud: 'svc-sup-ticket', exp: now + 300, iat: now, jti: randomId(), client_id: ids.bffClient, tid: ids.t1, ptype: 'human', ver: '1.0', acr: 'urn:stub:acr:2', amr: ['pwd', 'otp'], auth_time: now - 30, sid: randomId(), gref: randomId(), ...over };
  };
  w.mint = ({ base = 'access_token', claimed_issuer = 'A', signer = 'A.current', claims = {}, header = {} } = {}) => {
    const now = Math.floor(Date.now() / 1000);
    let payload; let hdr;
    if (base === 'txn_token') {
      const tctx = { tid: ids.t1, root_jti: randomId(), tier: 'write', ver: '1.0', ...(claims.tctx || {}) };
      payload = { iss: tts.issuer, aud: tts.audience, iat: now, exp: now + 60, txn: randomId(), sub: ids.self, scope: 'op.sup.test', req_wl: 'spiffe://stub.test.invalid/edge', ...claims, tctx };
      hdr = { typ: 'txntoken+jwt', alg: 'ES256' };
    } else if (base === 'id_token') {
      payload = { iss: w.issuerUrl(claimed_issuer), sub: ids.self, aud: ids.bffClient, exp: now + 300, iat: now, nonce: randomId(), ...claims };
      hdr = { typ: 'JWT', alg: 'ES256' };
    } else {
      payload = w.accessClaims({ iss: w.issuerUrl(claimed_issuer), ...claims });
      hdr = { typ: 'at+jwt', alg: 'ES256' };
    }
    for (const [k, v] of Object.entries(payload)) if (v === null) delete payload[k];
    if (signer === 'unsigned') {
      const h = { ...hdr, ...header }; for (const k of Object.keys(h)) if (h[k] === null) delete h[k];
      return `${b64u.enc(JSON.stringify(h))}.${b64u.enc(JSON.stringify(payload))}.`;
    }
    if (signer === 'hmac_with_A_public_key') {
      const h = { ...hdr, ...header };
      const si = `${b64u.enc(JSON.stringify(h))}.${b64u.enc(JSON.stringify(payload))}`;
      const keyMat = A.keys.current.publicKey.export({ format: 'pem', type: 'spki' });
      return `${si}.${b64u.enc(crypto.createHmac('sha256', keyMat).update(si).digest())}`;
    }
    const key = signers[signer];
    const h = { ...hdr, kid: key.kid, ...header }; for (const k of Object.keys(h)) if (h[k] === null) delete h[k];
    // header alg override (e.g. ES384/RS256): still sign with the P-256 key (verifier must reject on alg)
    return signES256(h, payload, key.privateKey);
  };
  w.txnFor = (sub = ids.self, tid = ids.t1, extra = {}) => w.mint({ base: 'txn_token', signer: 'TTS.current', claims: { sub, ...extra, tctx: { tid, ...(extra.tctx || {}) } } });

  // ---- fixtures (ST-8: direct writes to the system of record + tuples) ----
  w.fixtures = () => {
    const st = w.app.store;
    const mk = (tid, desk, requester, title) => { const id = randomId(); st.tickets.set(id, { id, tid, desk, title, requester, status: 'open', assignees: [], guests: [], comments: [], created_at: Date.now() }); pdp.write(`sup/ticket:${id}`, 'parent', `sup/desk:${desk}`); pdp.write(`sup/ticket:${id}`, 'requester', `core/user:${requester}`); return id; };
    const d1 = randomId(), d2 = randomId();
    st.desks.set(d1, { id: d1, tid: ids.t1 }); st.desks.set(d2, { id: d2, tid: ids.t2 });
    pdp.write(`sup/desk:${d1}`, 'parent', `core/tenant:${ids.t1}`); pdp.write(`sup/desk:${d2}`, 'parent', `core/tenant:${ids.t2}`);
    pdp.write(`sup/desk:${d1}`, 'agent', `core/user:${ids.staff}`);
    pdp.write(`core/tenant:${ids.t1}`, 'admin', `core/user:${ids.admin}`);
    pdp.write(`core/tenant:${ids.t1}`, 'member', `core/user:${ids.self}`); pdp.write(`core/tenant:${ids.t1}`, 'member', `core/user:${ids.other}`);
    const r = { d1, d2,
      own: mk(ids.t1, d1, ids.self, 'printer down'),
      ungranted: mk(ids.t1, d1, ids.other, 'vpn issue'),
      third: mk(ids.t1, d1, ids.self, 'invoice question'),
      t2existing: mk(ids.t2, d2, ids.t2user, 'other tenant ticket'),
      absent: randomId(),
    };
    return r;
  };
  return w;
}

export async function call(w, method, p, { token, txn, body, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.authorization = `Bearer ${token}`;
  if (txn) h['txn-token'] = txn;
  if (body) h['content-type'] = 'application/json';
  const r = await fetch(w.base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, headers: Object.fromEntries(r.headers), text, json };
}
