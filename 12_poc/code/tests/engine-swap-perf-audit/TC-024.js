// TC-024 署名付き URL・ヘッダ偽装・device code（preregistered-test-plan.md §4.24）— 待（L_url）: 値の記録（判定保留）
//   node tests/engine-swap-perf-audit/TC-024.js [--harness-check]
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { request } from '../../lib/http.js';
import { x5tS256 } from '../../lib/pki.js';
import { tokenRequest } from '../../lib/oauth-client.js';
import { loadIssuerKeys, signRaw, atPayload } from '../../harness/forge.js';
import fs from 'node:fs';
import { openRun, groupPortBase, writeEval, sleep, HARNESS_CHECK } from './common.js';
import { makeCliCaller } from './lib/cli.js';

const TC = 'TC-024';
const { run, params } = openRun(TC, { seed: 24 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
let status = 'completed';
const evalOut = { tc: TC };
let s = null;
const ok2xx = (x) => x >= 200 && x < 300;

try {
  s = await startStack({ tc: TC, run, engine: 'openfga', dataset: ds, portBase: groupPortBase(TC), settings: { signedUrlTtlSec: params.settings.signedUrlTtlSec } });
  const [T1, T2] = ds.tenants;
  const f = ds.files.find((x) => x.tid === T1.id && ds.users.find((u) => u.id === x.owner).memberships.length === 1);
  const fOther = ds.files.find((x) => x.tid === T2.id);
  const u = await s.login({ sub: f.owner, tid: T1.id });
  // ---------------- signed URL ----------------
  const issue = async () => { const r = await u.call('POST', `/t/${T1.id}/files/${f.id}/url`, {}); return r.body.url; };
  const dl = async (urlPath) => (await u.call('GET', urlPath)).status;
  const url0 = await issue();
  const pos = await dl(url0);
  if (pos !== 200) { const e = new Error(`positive control ${pos}`); e.abort = 'C-3'; throw e; }
  const tok = url0.slice('/dl/'.length);
  const [b, mac] = [tok.slice(0, tok.lastIndexOf('.')), tok.slice(tok.lastIndexOf('.') + 1)];
  const flip = (x, i) => x.slice(0, i) + (x[i] === 'A' ? 'B' : 'A') + x.slice(i + 1);
  const body = JSON.parse(Buffer.from(b, 'base64url').toString());
  const rebody = (o) => Buffer.from(JSON.stringify({ ...body, ...o })).toString('base64url');
  const urlNeg = {
    body_char_tampered: await dl(`/dl/${flip(b, 8)}.${mac}`),
    mac_tampered: await dl(`/dl/${b}.${flip(mac, 4)}`),
    other_tenant: await dl(`/dl/${rebody({ t: T2.id })}.${mac}`),
    other_resource: await dl(`/dl/${rebody({ f: fOther.id })}.${mac}`),
    other_operation: await dl(`/dl/${rebody({ op: 'write' })}.${mac}`),
  };
  const urlExp = await issue();
  await sleep(params.settings.signedUrlTtlSec * 1000 + 1000);
  urlNeg.expired = await dl(urlExp);
  // revocation after issue: owner loses read (remove owner tuple and any folder path by moving? use a viewer-only user)
  const viewer = ds.users.find((x) => x.memberships.length === 1 && x.memberships[0].tid === T1.id && x.id !== f.owner);
  const vt = { resource: { type: 'files/file', id: f.id }, relation: 'viewer', subject: { type: 'core/user', id: viewer.id } };
  await s.writeTuples(T1.id, { writes: [vt], on_duplicate: 'ignore' });
  const uv = await s.login({ sub: viewer.id, tid: T1.id });
  const ir = await uv.call('POST', `/t/${T1.id}/files/${f.id}/url`, {});
  const tIssue = Date.now();
  const revUrl = ir.body?.url;
  await s.deleteTuples(T1.id, [vt]);
  const tRev = Date.now();
  const readAfter = (await uv.call('GET', `/t/${T1.id}/files/${f.id}`)).status;
  const tries = [];
  while (Date.now() - tIssue < params.settings.signedUrlTtlSec * 1000 + 1000) { tries.push({ t_since_issue: Date.now() - tIssue, status: revUrl ? await dl(revUrl) : 0 }); await sleep(250); }
  const lastOk = [...tries].reverse().find((x) => x.status === 200);
  const signed = { positive: pos, negatives: urlNeg, revocation: { issued: ir.status, read_api_after_revocation: readAfter, ms_issue_to_revocation: tRev - tIssue, successes_after_revocation: tries.filter((x) => x.status === 200).length, last_success_ms_after_issue: lastOk ? lastOk.t_since_issue : null, configured_ttl_ms: params.settings.signedUrlTtlSec * 1000, tries } };
  log('signed URL done');
  // ---------------- header spoofing / bypass ----------------
  const fileUrl = `${s.topo.urls.file}/t/${T1.id}/files/${f.id}`;
  const spoof = { 'x-user-id': f.owner, 'x-tenant-id': T1.id, 'x-forwarded-user': f.owner, 'x-authenticated-user': f.owner };
  const h = {};
  h.spoofed_headers_without_token = (await request(fileUrl, { tls: s.tls, headers: spoof })).status;
  const keys = await loadIssuerKeys(s.topo, 'at');
  const k = keys.find((x) => x.state === 'active');
  const x5t = x5tS256(fs.readFileSync(s.topo.workloads.harness.cert, 'utf8'));
  const tokA = await signRaw({ alg: 'ES256', typ: 'at+jwt', kid: k.kid }, atPayload(s.topo, { sub: viewer.id, tid: T1.id, aud: s.topo.audiences.file, cnfX5t: x5t }), k.privateKey);
  h.valid_token_A_with_header_claiming_owner = (await request(fileUrl, { tls: s.tls, headers: { authorization: `Bearer ${tokA}`, ...spoof } })).status;
  const cli = await s.loginCli({ sub: f.owner, tid: T1.id });
  h.edge_bypass_with_external_opaque_token = (await request(fileUrl, { tls: s.tls, headers: { authorization: `Bearer ${cli.tokens.access_token}` } })).status;
  let noCert;
  try { noCert = (await request(fileUrl, { tls: { ca: s.topo.pki.ca }, headers: { authorization: `Bearer ${tokA}` } })).status; } catch (e) { noCert = `tls_refused:${e.code || e.message.slice(0, 40)}`; }
  h.direct_without_client_certificate = noCert;
  const cliCall = makeCliCaller(s, cli);
  const viaEdgeSpoof = await cliCall('GET', `/t/${T1.id}/files/${fOther.id}`, undefined, { 'x-tenant-id': T2.id, 'x-user-id': fOther.owner });
  h.edge_with_spoofed_headers_for_other_tenant = viaEdgeSpoof.status;
  log('headers done');
  // ---------------- device code ----------------
  const meta = s.asMeta;
  const da = await tokenRequest(meta, meta.device_authorization_endpoint, { client_id: s.topo.clients.cli.clientId, scope: 'openid files.read', resource: s.topo.audiences.api }, { tls: s.tls });
  const dc = da.body?.device_code;
  const poll = async (code, clientId = s.topo.clients.cli.clientId) => tokenRequest(meta, meta.token_endpoint, { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: code, client_id: clientId }, { tls: s.tls });
  const p1 = dc ? await poll(dc) : { status: 0, body: { error: 'no_device_code' } };
  await sleep(1100);
  const p2 = await poll('fabricated-device-code-0000000000');
  const p3 = dc ? await poll(dc, s.topo.clients.bff.clientId) : { status: 0, body: {} };
  const device = { authorization_status: da.status, unapproved: { status: p1.status, error: p1.body?.error, token_issued: !!p1.body?.access_token }, fabricated: { status: p2.status, error: p2.body?.error, token_issued: !!p2.body?.access_token }, other_client: { status: p3.status, error: p3.body?.error, token_issued: !!p3.body?.access_token } };
  log('device done');
  await s.stop(); s = null;
  run.writeJson('results.json', { signed, headers: h, device });
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  const urlSucc = Object.values(urlNeg).filter((x) => ok2xx(x)).length;
  const hdrAcc = [h.spoofed_headers_without_token, h.edge_bypass_with_external_opaque_token, h.direct_without_client_certificate, h.edge_with_spoofed_headers_for_other_tenant].filter((x) => typeof x === 'number' && ok2xx(x)).length + (ok2xx(h.valid_token_A_with_header_claiming_owner) ? 1 : 0);
  const devUse = [device.unapproved.token_issued, device.fabricated.token_issued, device.other_client.token_issued].filter(Boolean).length;
  Object.assign(evalOut, {
    verdict: '判定保留', note: '計画 §3.4 で「待（L_url）」。TC 全体は凍結できないため値の記録のみ（要旨 4）',
    values: { expired_other_tenant_tampered_success: urlSucc, post_revocation: { successes_after_revocation: signed.revocation.successes_after_revocation, last_success_ms_after_issue: signed.revocation.last_success_ms_after_issue, configured_ttl_ms: signed.revocation.configured_ttl_ms }, spoofed_or_bypass_accepted: hdrAcc, valid_token_A_with_owner_header_status: h.valid_token_A_with_header_claiming_owner, unapproved_code_use: devUse },
    reference_against_fixed_criteria: { url_negatives_0: urlSucc === 0, spoof_bypass_0: hdrAcc === 0, device_0: devUse === 0 },
    observation: 'valid_token_A_with_owner_header は A（viewer、剥奪済み）として評価される。偽装ヘッダで owner として扱われれば 200 になる',
  });
  log(`values ${JSON.stringify(evalOut.values)}`);
} catch (e) {
  if (e.harnessCheck) status = 'harness-check';
  else { status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error'; evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack }; evalOut.verdict = '中止'; console.error(e.stack); }
} finally {
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, ['results.json']); else run.writeJson('harness-check.json', { abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
