// TC-025 sandbox と本番の信頼分離（preregistered-test-plan.md §4.25）
//   node tests/engine-swap-perf-audit/TC-025.js [--harness-check]
import fs from 'node:fs';
import path from 'node:path';
import { createLocalJWKSet, jwtVerify, SignJWT, importJWK, generateKeyPair } from 'jose';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { request } from '../../lib/http.js';
import { x5tS256 } from '../../lib/pki.js';
import { UserAgent, codeFlow, introspect, tokenRequest } from '../../lib/oauth-client.js';
import { newDpopKey } from '../../lib/dpop.js';
import { foreignKey, signRaw, atPayload } from '../../harness/forge.js';
import { openRun, groupPortBase, writeEval, sleep, readJsonl, HARNESS_CHECK } from './common.js';
import { makeCliCaller } from './lib/cli.js';

const TC = 'TC-025';
const { run, params } = openRun(TC, { seed: 25 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
let status = 'completed';
const evalOut = { tc: TC };
let s = null;
const ok2xx = (x) => typeof x === 'number' && x >= 200 && x < 300;

try {
  s = await startStack({ tc: TC, run, engine: 'openfga', dataset: ds, portBase: groupPortBase(TC) });
  const [T1] = ds.tenants;
  const f = ds.files.find((x) => x.tid === T1.id && ds.users.find((u) => u.id === x.owner).memberships.length === 1);
  const cliAuth = { type: 'none', clientId: s.topo.clients.cli.clientId };
  const edgeAuth = { type: 'private_key_jwt', clientId: s.topo.clients.edge.clientId, privateJwkFile: s.topo.clients.edge.privateJwkFile };
  const flow = async (meta) => { const key = await newDpopKey(); const r = await codeFlow({ meta, auth: cliAuth, tls: s.tls, dpopKey: key, ua: new UserAgent({ tls: s.tls }), login: { sub: f.owner, tid: T1.id, amr: 'pwd,otp' }, redirectUri: s.topo.clients.cli.redirectUri, scope: 'openid files.read', resource: s.topo.audiences.api }); return { ...r, key }; };
  // same-zone positives
  const prodTok = await flow(s.asMeta);
  const prodRead = (await makeCliCaller(s, { tokens: prodTok.tokens, key: prodTok.key })('GET', `/t/${T1.id}/files/${f.id}`)).status;
  const sbTok = await flow(s.asMetaB);
  const sbIntro = await introspect(s.asMetaB, sbTok.tokens.access_token, { auth: edgeAuth, tls: s.tls });
  const positives = { prod_token_on_prod_edge: prodRead, sandbox_token_active_in_sandbox: !!sbIntro?.active };
  if (prodRead !== 200 || !sbIntro?.active) { const e = new Error(`positive controls ${JSON.stringify(positives)}`); e.abort = 'C-3'; throw e; }
  const P = {};
  // P1 sandbox external token on the prod edge
  P.P1 = (await makeCliCaller(s, { tokens: sbTok.tokens, key: sbTok.key })('GET', `/t/${T1.id}/files/${f.id}`)).status;
  // P2 sandbox token as subject_token at the prod STS (edge credentials)
  P.P2 = (await request(`${s.topo.urls.sts}/token`, { tls: s.tls, form: { grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', subject_token: sbTok.tokens.access_token, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token', resource: s.topo.audiences.file, scope: 'files.read' } })).status;
  // P3 internal JWT signed with a sandbox key / issuer at the prod SDK
  const sk = await foreignKey('ES256');
  const x5t = x5tS256(fs.readFileSync(s.topo.workloads.harness.cert, 'utf8'));
  const sbJwt = await signRaw({ alg: 'ES256', typ: 'at+jwt', kid: sk.publicJwk.kid }, atPayload(s.topo, { iss: 'https://sts.sandbox.poc.test', sub: f.owner, tid: T1.id, aud: s.topo.audiences.file, cnfX5t: x5t }), sk.privateKey);
  P.P3 = (await request(`${s.topo.urls.file}/t/${T1.id}/files/${f.id}`, { tls: s.tls, headers: { authorization: `Bearer ${sbJwt}` } })).status;
  // P4 third-party RP pinned to issuer A receives a sandbox ID token
  const jwksA = (await request(s.asMeta.jwks_uri, { tls: s.tls })).json();
  let rp;
  try { await jwtVerify(sbTok.tokens.id_token, createLocalJWKSet(jwksA), { issuer: s.asMeta.issuer, audience: s.topo.clients.cli.clientId }); rp = 'accepted'; } catch (e) { rp = `rejected:${e.code}`; }
  let rpPos;
  try { await jwtVerify(prodTok.tokens.id_token, createLocalJWKSet(jwksA), { issuer: s.asMeta.issuer, audience: s.topo.clients.cli.clientId }); rpPos = 'accepted'; } catch (e) { rpPos = `rejected:${e.code}`; }
  P.P4 = rp; positives.prod_id_token_at_rp = rpPos;
  // P5 sandbox SVIDs on prod mTLS endpoints
  const sbx = { key: s.topo.sandbox['file-service'].key, cert: s.topo.sandbox['file-service'].cert, ca: s.topo.pki.ca };
  const try5 = async (url, opts = {}) => { try { return (await request(url, { tls: sbx, timeoutMs: 3000, ...opts })).status; } catch (e) { return `tls_refused:${e.code || e.message.slice(0, 30)}`; } };
  P.P5 = {
    sts_token: await try5(`${s.topo.urls.sts}/token`, { form: { grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', subject_token: prodTok.tokens.access_token, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token', resource: s.topo.audiences.file } }),
    pdp_evaluation: await try5(`${s.topo.urls.pdp}/access/v1/evaluation`, { body: { subject: { type: 'core/user', id: f.owner, properties: { tid: T1.id, acr: 'L2' } }, action: { name: 'read' }, resource: { type: 'files/file', id: f.id, properties: { tid: T1.id } } } }),
    state_revocations: await try5(`${s.topo.urls.state}/revocations?since=0`),
    file_service: await try5(`${s.topo.urls.file}/t/${T1.id}/files/${f.id}`, { headers: { authorization: `Bearer ${sbJwt}` } }),
  };
  // P6 sandbox-only client credentials at the prod AS
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  const assertion = async (clientId) => new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: 'sandbox-app-key' }).setIssuer(clientId).setSubject(clientId).setAudience(s.asMeta.issuer).setJti(Math.random().toString(36).slice(2)).setIssuedAt().setExpirationTime('1m').sign(privateKey);
  const asCall = async (endpoint, form) => (await request(endpoint, { tls: s.tls, form })).status;
  const evFile = path.join(run.dir, 'as-a', 'as-events.jsonl');
  const ev0 = readJsonl(evFile).length;
  P.P6 = {
    par_unknown_sandbox_client: await asCall(s.asMeta.pushed_authorization_request_endpoint, { client_id: 'sandbox-app-0001', client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: await assertion('sandbox-app-0001'), response_type: 'code', redirect_uri: 'https://sandbox-app.example/cb', scope: 'openid', code_challenge: 'x'.repeat(43), code_challenge_method: 'S256' }),
    token_prod_client_id_sandbox_key: await asCall(s.asMeta.token_endpoint, { grant_type: 'client_credentials', client_id: s.topo.clients.bff.clientId, client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: await assertion(s.topo.clients.bff.clientId) }),
  };
  // P7 app-only grant attempts
  const { clientAssertion } = await import('../../lib/oauth-client.js');
  const bffAssert = await clientAssertion({ clientId: s.topo.clients.bff.clientId, privateJwkFile: s.topo.clients.bff.privateJwkFile, aud: s.asMeta.issuer });
  const attempts = [
    ['sandbox_client_client_credentials', { grant_type: 'client_credentials', client_id: 'sandbox-app-0001', client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: await assertion('sandbox-app-0001'), scope: 'files.read' }],
    ['prod_client_client_credentials', { grant_type: 'client_credentials', client_id: s.topo.clients.bff.clientId, client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: bffAssert, scope: 'files.read' }],
  ];
  P.P7 = {};
  const detections = [];
  for (const [name, form] of attempts) {
    const n0 = readJsonl(evFile).length;
    const r = await request(s.asMeta.token_endpoint, { tls: s.tls, form });
    await sleep(200);
    const evs = readJsonl(evFile).slice(n0);
    P.P7[name] = { status: r.status, error: r.json()?.error, issued: !!r.json()?.access_token };
    detections.push({ name, detected: evs.some((e) => /error/.test(e.ev)), events: evs.map((e) => `${e.ev}:${e.error || ''}`) });
  }
  log('presentations done');
  await s.stop(); s = null;
  run.writeJson('results.json', { positives, presentations: P, detections });
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  const accepted = [ok2xx(P.P1), ok2xx(P.P2), ok2xx(P.P3), P.P4 === 'accepted', ...Object.values(P.P5).map(ok2xx), ...Object.values(P.P6).map((x) => ok2xx(x) || x === 201), ...Object.values(P.P7).map((x) => x.issued)].filter(Boolean).length;
  const detRate = detections.filter((d) => d.detected).length / detections.length;
  const crit = { accepted: { value: accepted, pass: accepted === 0 && positives.prod_id_token_at_rp === 'accepted' }, grant_attempt_detection_rate: { value: detRate, pass: detRate === 1, detections } };
  Object.assign(evalOut, { criteria: crit, positives, presentations: P, verdict: Object.values(crit).every((c) => c.pass) ? '合格' : '不合格' });
  log(`verdict ${evalOut.verdict}`, JSON.stringify({ accepted, detRate }));
} catch (e) {
  if (e.harnessCheck) status = 'harness-check';
  else { status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error'; evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack }; evalOut.verdict = '中止'; console.error(e.stack); }
} finally {
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, ['results.json', 'as-a/as-events.jsonl']); else run.writeJson('harness-check.json', { abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
