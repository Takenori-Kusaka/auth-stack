// Positive-shape check with generic mocks (INT-00 entry step 5): Prism 5.12.0 started from CON-03 and CON-05,
// each behind kit/echo-proxy.js. The SUT's checks are NOT relaxed. Issuer (ST-1) and audit sink (ST-5) are own stubs
// because CON-06/CON-08 are schemas only. Edge Txn-Tokens are signed with the CON-05 test-only key so that the
// SUT can verify them against Prism's /txn-token-jwks example.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startIssuer, startAuditSink, mintAccessToken } from '../test/stubs.js';
import { writeConfigs, ledger, refValues, AUD, T1 } from '../test/harness.js';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { Store } from '../src/store.js';
import { signES256, opaqueId } from '../src/jwt.js';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const repo = path.resolve(here, '..', '..', '..');
const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsv-prism-'));
const procs = [];
const isWin = process.platform === 'win32';

function start(cmd, args, name) {
  const p = spawn(cmd, args, { cwd: repo, shell: isWin, stdio: ['ignore', fs.openSync(path.join(logDir, `${name}.out`), 'w'), fs.openSync(path.join(logDir, `${name}.err`), 'w')] });
  procs.push(p); return p;
}
async function waitFor(url, ms = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const r = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (r.status < 500) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
}
function cleanup() { for (const p of procs) { try { isWin ? spawn('taskkill', ['/pid', String(p.pid), '/T', '/F']) : p.kill(); } catch {} } }

// CON-05 info.x-test-signing-key (test-only; never trusted in production profile)
const con05 = fs.readFileSync(path.join(repo, '11_contracts', 'token-exchange.openapi.yaml'), 'utf8');
const pj = con05.match(/private-jwk:\s*\n\s*kty: (\S+)\s*\n\s*crv: (\S+)\s*\n\s*x: (\S+)\s*\n\s*y: (\S+)\s*\n\s*d: (\S+)\s*\n\s*kid: (\S+)/);
const testKey = { kty: pj[1], crv: pj[2], x: pj[3], y: pj[4], d: pj[5], kid: pj[6] };

const results = [];
const preferEval = process.argv.includes('--prefer-oneItem');
const extra03 = preferEval ? ['--prefer', '"POST /access/v1/evaluations=example=oneItem"'] : [];
const rec = (step, ok, detail) => { results.push({ step, ok, detail }); console.log(ok ? 'OK  ' : 'NG  ', step, detail ?? ''); };

try {
  start('npx', ['--yes', '@stoplight/prism-cli@5.12.0', 'mock', '-p', '4010', '11_contracts/authorization-api.openapi.yaml'], 'prism-con03');
  start('npx', ['--yes', '@stoplight/prism-cli@5.12.0', 'mock', '-p', '4011', '11_contracts/token-exchange.openapi.yaml'], 'prism-con05');
  start('node', ['11_contracts/kit/echo-proxy.js', '--target', 'http://127.0.0.1:4010', '--listen', '127.0.0.1:4110', '--log', path.join(logDir, 'echo-con03.log'), ...extra03], 'echo-con03');
  start('node', ['11_contracts/kit/echo-proxy.js', '--target', 'http://127.0.0.1:4011', '--listen', '127.0.0.1:4111', '--log', path.join(logDir, 'echo-con05.log')], 'echo-con05');
  rec('prism CON-03 up', await waitFor('http://127.0.0.1:4010/.well-known/authzen-configuration'));
  rec('prism CON-05 up', await waitFor('http://127.0.0.1:4011/txn-token-jwks'));
  rec('echo proxies up', (await waitFor('http://127.0.0.1:4110/.well-known/authzen-configuration')) && (await waitFor('http://127.0.0.1:4111/txn-token-jwks')));

  const A = await startIssuer('A');
  const sink = await startAuditSink();
  const { verifierUrl, failmodeUrl } = writeConfigs(logDir, { deadlineMs: 2000 });
  const env = {
    AUTH_ENVIRONMENT: 'kit', AUTH_OIDC_DISCOVERY_URL: A.discoveryUrl, AUTH_SERVICE_AUDIENCE: AUD,
    AUTH_VERIFIER_CONFIG_URL: verifierUrl, AUTHZ_FAILMODE_CONFIG_URL: failmodeUrl, AUTHZ_PDP_BASE_URL: 'http://127.0.0.1:4110',
    AUTH_TTS_URL: 'http://127.0.0.1:4111', AUTH_TTS_ISSUER: 'https://tts.cell-opaque-code.id-domain.example', AUTH_TTS_AUDIENCE: 'txn-td-c07',
    AUTH_TTS_JWKS_URL: 'http://127.0.0.1:4111/txn-token-jwks', AUTH_JOB_LEDGER_URL: 'http://127.0.0.1:4111', AUDIT_SINK_URL: sink.url,
    WORKLOAD_SPIFFE_ID: 'spiffe://stub.test.invalid/rsv/api',
  };
  let app;
  try { app = await createApp(await loadConfig(env), { ledger, refValues, store: new Store() }); rec('SUT start (PDP metadata via R3)', true); }
  catch (e) { rec('SUT start (PDP metadata via R3)', false, e.message); throw e; }
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const s = app.store;
  const site = s.addSite(T1), floor = s.addFloor(T1, site), room = s.addRoom(T1, floor);
  const alice = 'u-alice-0001';
  const other = s.addBooking(T1, room, { id: 'u-bob-0002', type: 'core/user' });
  const at = () => mintAccessToken({ issuerSt: A, signerKey: A.keys.current, audience: AUD, tid: T1, sub: alice });
  const now = Math.floor(Date.now() / 1000);
  const edgeTxn = () => signES256({ typ: 'txntoken+jwt', alg: 'ES256', kid: testKey.kid }, { iss: env.AUTH_TTS_ISSUER, aud: 'txn-td-c07', iat: now, exp: now + 60, txn: opaqueId(), sub: alice, scope: 'rsv.booking.write', req_wl: 'spiffe://stub.test.invalid/edge/gw', tctx: { tid: T1, root_jti: opaqueId(), tier: 'write', ver: '1.0' } }, testKey);
  const call = async (method, p, o = {}) => { const h = { authorization: `Bearer ${at()}` }; if (o.txn) h['txn-token'] = o.txn; if (o.body) h['content-type'] = 'application/json'; const r = await fetch(base + p, { method, headers: h, body: o.body ? JSON.stringify(o.body) : undefined }); return { status: r.status, text: await r.text() }; };

  const c = await call('POST', `/v1/rooms/${room}/bookings`, { txn: edgeTxn(), body: { start: '2026-10-15T00:00:00Z', end: '2026-10-15T01:00:00Z' } });
  rec('EP-RSV-01 create (write, evaluation allowWrite + registerAcceptanceRecord)', c.status === 201, `${c.status} ${c.text}`);
  const id = JSON.parse(c.text).id;
  const v = await call('GET', `/v1/bookings/${id}`);
  rec('EP-RSV-02 view (read-sensitive)', v.status === 200, `${v.status}`);
  const l = await call('GET', `/v1/rooms/${room}/bookings`);
  rec('EP-RSV-04 list (evaluations, R5 fills the count)', l.status === 200, `${l.status} ${l.text}`);
  const d = await call('DELETE', `/v1/bookings/${other}`, { txn: edgeTxn() });
  rec('EP-RSV-03 cancel (write)', d.status === 200, `${d.status}`);
  const rr = await app.reminder.runDue('2026-12-01T00:00:00Z');
  rec('EP-RSV-06 reminder via Prism TTS (internal start)', rr.every((x) => x.outcome === 'sent'), JSON.stringify(rr) + ' deadLetters=' + JSON.stringify(s.deadLetters));
  rec('audit records well-formed', sink.invalid.length === 0, `events=${sink.events.length} invalid=${sink.invalid.length}`);
  const echoLog = fs.existsSync(path.join(logDir, 'echo-con03.log')) ? fs.readFileSync(path.join(logDir, 'echo-con03.log'), 'utf8').trim().split('\n').flatMap((x) => { try { return (JSON.parse(x).rewrites ?? []).map((w) => w.rule); } catch { return []; } }) : [];
  rec('echo proxy rewrites (CON-03)', true, JSON.stringify([...new Set(echoLog.flat())]));
  app.server.close(); A.server.close(); sink.server.close();
} catch (e) {
  rec('exception', false, e.stack);
} finally {
  cleanup();
  fs.writeFileSync(path.join(here, '..', preferEval ? 'prism-results-oneItem.json' : 'prism-results.json'), JSON.stringify({ logDir, preferEval, results }, null, 2));
  setTimeout(() => process.exit(0), 500);
}
