// Positive-shape check against generic mocks (Prism 5.12.0) started from the contracts, with kit/echo-proxy.js in front
// (INT-00 entry step 5, kit/README §2.3・§2.5). PEP checks are NOT relaxed. Issuer = self-made ST-1 (MK-01 not distributed).
// Usage: node scripts/prism-positive.mjs   (needs npx @stoplight/prism-cli@5.12.0)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startIssuer, startAuditSink } from '../test/stubs.js';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { signES256, randomId } from '../src/jose.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const C = path.resolve(here, '../../../11_contracts');
const OUT = path.resolve(here, '../out'); fs.mkdirSync(OUT, { recursive: true });
const procs = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function run(cmd, args, name) {
  const p = spawn(cmd, args, { shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  const log = fs.createWriteStream(path.join(OUT, `${name}.log`)); p.stdout.pipe(log); p.stderr.pipe(log); procs.push(p); return p;
}
async function waitUp(url, ms = 60000) { const t = Date.now(); while (Date.now() - t < ms) { try { await fetch(url, { signal: AbortSignal.timeout(1000) }); return true; } catch { await sleep(500); } } return false; }

const mocks = [
  { name: 'con03', file: 'authorization-api.openapi.yaml', port: 4010, proxy: 4110, prefer: ['POST /access/v1/evaluations=example=oneItem'] },
  { name: 'con05', file: 'token-exchange.openapi.yaml', port: 4020, proxy: 4120, prefer: ['POST /txn-token=example=internalStart'] },
  { name: 'con17', file: 'external-grant.openapi.yaml', port: 4030, proxy: 4130, prefer: [] },
  { name: 'con04', file: 'relationship-model-registry.openapi.yaml', port: 4040, proxy: 4140, prefer: [] },
];
const results = { run_at: new Date().toISOString(), prism: '5.12.0', steps: [] };
const step = (name, ok, detail) => { results.steps.push({ name, ok, detail }); console.log(ok ? 'OK ' : 'NG ', name, detail ?? ''); };
try {
  for (const m of mocks) {
    run('npx', ['--yes', '@stoplight/prism-cli@5.12.0', 'mock', '-p', String(m.port), path.join(C, m.file)], `prism-${m.name}`);
    run('node', [path.join(C, 'kit', 'echo-proxy.js'), '--target', `http://127.0.0.1:${m.port}`, '--listen', `127.0.0.1:${m.proxy}`, '--log', path.join(OUT, `echo-${m.name}.log`), ...m.prefer.flatMap((p) => ['--prefer', `"${p}"`])], `proxy-${m.name}`);
  }
  for (const m of mocks) step(`prism ${m.name} up`, await waitUp(`http://127.0.0.1:${m.port}/`), m.file);
  const A = await startIssuer('A'); const sink = await startAuditSink();
  // CON-05 info.x-test-signing-key (public test key; signatures prove nothing)
  const y = fs.readFileSync(path.join(C, 'token-exchange.openapi.yaml'), 'utf8');
  const blk = y.slice(y.indexOf('private-jwk:'), y.indexOf('private-jwk:') + 400);
  const g = (k) => blk.match(new RegExp(`\\b${k}: (\\S+)`))[1];
  const ttsPriv = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: g('x'), y: g('y'), d: g('d') }, format: 'jwk' });
  const TTS_ISS = 'https://tts.cell-opaque-code.id-domain.example', TTS_AUD = 'txn-td-c07';
  const env = {
    AUTH_ENVIRONMENT: 'kit', AUTH_OIDC_DISCOVERY_URL: `${A.url}/.well-known/openid-configuration`, AUTH_SERVICE_AUDIENCE: 'svc-sup-ticket',
    AUTH_VERIFIER_CONFIG_URL: pathToFileURL(path.join(here, '..', 'config', 'verifier-config.json')).href,
    AUTHZ_FAILMODE_CONFIG_URL: pathToFileURL(path.join(here, '..', 'config', 'failmode-config.json')).href,
    AUTHZ_PDP_BASE_URL: 'http://127.0.0.1:4110', AUTH_TTS_ISSUER: TTS_ISS, AUTH_TTS_AUDIENCE: TTS_AUD,
    AUTH_TTS_JWKS_URL: 'http://127.0.0.1:4120/txn-token-jwks', AUTH_TTS_URL: 'http://127.0.0.1:4120', AUTH_JOB_LEDGER_URL: 'http://127.0.0.1:4120',
    EXTERNAL_GRANT_API_URL: 'http://127.0.0.1:4130', AUTHZ_REGISTRY_BASE_URL: 'http://127.0.0.1:4140', AUDIT_SINK_URL: sink.url,
    AUTH_CELL_ID: 'kit0', AUTH_JURISDICTION: 'jp', WORKLOAD_SPIFFE_ID: 'spiffe://stub.test.invalid/svc/sup-ticket',
  };
  const app = await createApp(await loadConfig(env));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const t1 = 'ozxw4zltnfzgk3dfnzqxi2lpny', self = 'mfrggzdfmztwq2lknnwg23tpob', staff = randomId(), agent = randomId();
  const now = () => Math.floor(Date.now() / 1000);
  const at = (over = {}) => signES256({ typ: 'at+jwt', alg: 'ES256', kid: A.keys.current.kid }, { iss: A.url, sub: self, aud: 'svc-sup-ticket', exp: now() + 300, iat: now(), jti: randomId(), client_id: randomId(), tid: t1, ptype: 'human', ver: '1.0', acr: 'a', amr: ['pwd'], auth_time: now(), sid: randomId(), gref: randomId(), ...over }, A.keys.current.privateKey);
  const txn = (sub = self) => signES256({ typ: 'txntoken+jwt', alg: 'ES256', kid: 'test-only-tts-c07-01' }, { iss: TTS_ISS, aud: TTS_AUD, iat: now(), exp: now() + 60, txn: randomId(), sub, scope: 'op.sup.test', req_wl: 'spiffe://stub.test.invalid/edge', tctx: { tid: t1, root_jti: randomId(), tier: 'write', ver: '1.0' } }, ttsPriv);
  const desk = randomId(), tk = randomId();
  app.store.desks.set(desk, { id: desk, tid: t1 });
  app.store.tickets.set(tk, { id: tk, tid: t1, desk, title: 'printer', requester: self, status: 'open', assignees: [], guests: [], comments: [], created_at: Date.now() });
  const call = async (method, p, token, tx, body) => { const r = await fetch(base + p, { method, headers: { authorization: `Bearer ${token}`, ...(tx ? { 'txn-token': tx } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; };
  let r = await call('GET', `/tickets/${tk}`, at()); step('EP-SUP-02 read (CON-03 allowWrite via R1・R4・R6)', r.status === 200, r.status);
  r = await call('GET', '/tickets', at()); step('EP-SUP-03 list (evaluations oneItem via R5)', r.status === 200 && r.json.items.length === 1, r.status);
  r = await call('POST', `/desks/${desk}/tickets`, at(), txn(), { title: 'new' }); step('EP-SUP-01 create (CON-05 acceptance via R10, CON-04 write)', r.status === 201, `${r.status} ${JSON.stringify(r.json)}`);
  const msg = app.queue.at(-1);
  if (msg) { const c = await app.consume(msg); step('EP-SUP-10 consume (CON-05 internal start via R9, TTS JWKS from mock)', c.ok === true, JSON.stringify(c)); }
  r = await call('POST', `/tickets/${tk}/guests`, at(), txn(), { email: 'g@partner.test.invalid' }); step('EP-SUP-05 invite (CON-17 createExternalGrant)', r.status === 201, `${r.status} ${JSON.stringify(r.json)}`);
  r = await call('POST', `/tickets/${tk}/drafts`, at({ sub: self, act: { sub: agent, ptype: 'ai_agent' }, scope: 'sup.draft_reply' }), txn(self), { body: 'hi' }); step('EP-SUP-06 agent draft (CON-03 agent actor)', r.status === 201, r.status);
  const did = r.json?.draft_id;
  r = await call('POST', `/tickets/${tk}/drafts/${did}/send`, at(), txn()); step('EP-SUP-07 human send', r.status === 200, r.status);
  r = await call('POST', `/tickets/${tk}/close`, at(), txn()); step('EP-SUP-09 close (CON-17 revokeExternalGrantsByAnchor)', r.status === 200 && r.json.guest_access_revoked === true, `${r.status} ${JSON.stringify(r.json)}`);
  await app.audit.flush();
  fs.writeFileSync(path.join(OUT, 'audit-prism.jsonl'), sink.events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  await new Promise((r2) => app.server.close(r2)); A.server.close(); sink.server.close();
} catch (e) { step('runner error', false, String(e.stack || e)); }
finally {
  fs.writeFileSync(path.join(OUT, 'prism-positive.json'), JSON.stringify(results, null, 2));
  for (const p of procs) { try { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F']); else p.kill(); } catch {} }
  setTimeout(() => process.exit(results.steps.every((s) => s.ok) ? 0 : 1), 1500);
}
