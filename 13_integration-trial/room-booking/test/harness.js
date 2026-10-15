// Starts the stubs and the SUT with configuration ONLY through the CON-11 §11.4 switch points.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startIssuer, startTts, startPdp, startAuditSink, mintAccessToken } from './stubs.js';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { Store } from '../src/store.js';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const ledger = JSON.parse(fs.readFileSync(path.join(here, '..', 'ledger', 'entry-points.json'), 'utf8'));

export const T1 = 't5wq2hzr7nmc4ka3vd6pxe2bfy';   // CON-02 IssuedTenantId examples
export const T2 = 'u3nb7xk2qm5zr4ha6tc2wfe7dy';
export const AUD = 'https://api.stub.test.invalid/svc/rsv';
export const OTHER_AUD = 'https://api.stub.test.invalid/svc/other';

export const refValues = {
  subjRef: (tid, sub) => 'sr_' + Buffer.from(`${tid}:${sub}`).toString('hex').slice(0, 30).replace(/[^a-z0-9]/g, 'a'),
  resRef: (tid, type, id) => 'rr_k1.' + Buffer.from(`${tid}|${type}|${id}`).toString('base64url').padEnd(43, 'A').slice(0, 43),
};

export function writeConfigs(dir, { env = 'kit', minRefetch = 0, deadlineMs = 300 } = {}) {
  const verifier = { schema: 'verifier-config/1', config_version: '0.1.0', env, crypto_profile_version: 'v1', alg_allowlist: ['ES256'], min_profile_version: '1.0', clock_skew_seconds: 10, jwks: { cache_ttl_seconds: 300, refetch_on_unknown_kid: true, min_refetch_interval_seconds: minRefetch } };
  const tp = { deadline_ms: deadlineMs, max_attempts: 1, on_no_decision: { status: 503, retry_after_seconds: 5 }, known_good: { enabled: false } };
  const failmode = { schema: 'failmode-config/1', config_version: '0.1.0', env, issued_at: '2026-10-15T00:00:00Z', values_status: 'provisional', pdp: { 'read-sensitive': { ...tp, known_good: { enabled: false, max_age_ms: null } }, write: tp, privileged: tp }, decision_cache_max_age_ms: 0, revocation_state_max_age_ms: 60000, audit_spool: { read_sensitive_max_events: 10000, write_max_events: 1000 } };
  fs.writeFileSync(path.join(dir, 'verifier.json'), JSON.stringify(verifier));
  fs.writeFileSync(path.join(dir, 'failmode.json'), JSON.stringify(failmode));
  return { verifierUrl: pathToFileURL(path.join(dir, 'verifier.json')).href, failmodeUrl: pathToFileURL(path.join(dir, 'failmode.json')).href };
}

export async function startStack(opts = {}) {
  const A = await startIssuer('A');
  const B = await startIssuer('B');
  const OTHER = await startIssuer('Other');
  const tts = await startTts();
  const pdp = await startPdp();
  const sink = await startAuditSink();
  pdp.deadlineMs = opts.deadlineMs ?? 300;
  if (opts.discoveryOverride) A.discoveryOverride = opts.discoveryOverride;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsv-'));
  const { verifierUrl, failmodeUrl } = writeConfigs(dir, { deadlineMs: pdp.deadlineMs });
  const env = {
    AUTH_ENVIRONMENT: 'kit', AUTH_OIDC_DISCOVERY_URL: A.discoveryUrl, AUTH_SERVICE_AUDIENCE: AUD,
    AUTH_VERIFIER_CONFIG_URL: verifierUrl, AUTHZ_FAILMODE_CONFIG_URL: failmodeUrl, AUTHZ_PDP_BASE_URL: pdp.url,
    AUTH_TTS_URL: tts.url, AUTH_TTS_ISSUER: tts.issuer, AUTH_TTS_AUDIENCE: tts.audience, AUTH_TTS_JWKS_URL: tts.jwksUrl,
    AUTH_JOB_LEDGER_URL: tts.url, AUDIT_SINK_URL: sink.url, WORKLOAD_SPIFFE_ID: 'spiffe://stub.test.invalid/rsv/api',
    ...(opts.env ?? {}),
  };
  const stubs = { A, B, OTHER, tts, pdp, sink };
  const close = async () => { for (const s of [A, B, OTHER, tts, pdp, sink]) s.server.close(); };
  let app;
  try {
    const cfg = await loadConfig(env);
    app = await createApp(cfg, { ledger, refValues, store: new Store() });
  } catch (e) {
    await close();
    return { startupError: e };
  }
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const s = app.store;
  // fixtures (ST-8): t1 tokyo/10F/r1001, t2 osaka/3F/r0301
  const site1 = s.addSite(T1), floor1 = s.addFloor(T1, site1), room1 = s.addRoom(T1, floor1);
  const site2 = s.addSite(T2), floor2 = s.addFloor(T2, site2), room2 = s.addRoom(T2, floor2);
  const alice = 'u-alice-0001', bob = 'u-bob-0002', guest = 'u-guest-t2-0003';
  const b1 = s.addBooking(T1, room1, { id: alice, type: 'core/user' }, { attendees: [bob] });
  const b2 = s.addBooking(T2, room2, { id: 'u-zed-t2-0009', type: 'core/user' });
  const fx = { site1, floor1, room1, room2, b1, b2, alice, bob, guest, absent: 'zzzzzzzzzzzzzzzzzzzzzzzzzz' };
  const mint = (o = {}) => mintAccessToken({ issuerSt: A, signerKey: A.keys.current, audience: AUD, tid: T1, sub: alice, ...o });
  const mintTxn = (o = {}) => tts.mint({ sub: o.sub ?? alice, tid: o.tid ?? T1, ...o });
  const call = async (method, p, { token, txn, body, headers = {} } = {}) => {
    const h = { ...headers };
    if (token !== undefined) h.authorization = `Bearer ${token}`;
    if (txn) h['txn-token'] = txn;
    if (body) h['content-type'] = 'application/json';
    const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    return { status: r.status, headers: Object.fromEntries(r.headers), text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
  };
  return { app, base, stubs, fx, mint, mintTxn, call, env, dir, close: async () => { app.server.close(); await close(); } };
}
