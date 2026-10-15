// TC-028 連携パターン参照実装の負例（preregistered-test-plan.md §4.28）
//   node tests/engine-swap-perf-audit/TC-028.js
import fs from 'node:fs';
import path from 'node:path';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { request } from '../../lib/http.js';
import { loadTopology, loadSecrets, clientTls } from '../../lib/topology.js';
import { newDpopKey } from '../../lib/dpop.js';
import { UserAgent, codeFlow } from '../../lib/oauth-client.js';
import { opaqueId } from '../../lib/ids.js';
import { openRun, groupPortBase, writeEval, sleep, readJsonl } from './common.js';
import { refEvaluate } from './lib/helpers.js';
import { JobPlatform } from './lib/jobs.js';
import { makeCliCaller } from './lib/cli.js';
import { StreamGateway, wsConnect } from './lib/stream.js';

const TC = 'TC-028';
const { run, params } = openRun(TC, { seed: 28 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const URN_AT = 'urn:ietf:params:oauth:token-type:access_token';
let status = 'completed';
const evalOut = { tc: TC, rows: [] };
let s = null, gw = null;
const rows = evalOut.rows;
const row = (pattern, kind, ok, detail = {}) => { const r = { ...detail, pattern, kind, ok }; rows.push(r); run.append('requests.jsonl', r); return r; }; // v3: detail must not override kind

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: groupPortBase(TC) });
  const A = ds.tenants[0], B = ds.tenants[1];
  const single = (tid) => ds.users.filter((u) => u.memberships.length === 1 && u.memberships[0].tid === tid && u.memberships[0].kind === 'member');
  const usedUsers = new Set();
  const ownerOf = () => { const f = ds.files.find((x) => x.tid === A.id && single(A.id).some((u) => u.id === x.owner) && !usedUsers.has(x.owner)); usedUsers.add(f.owner); return { user: f.owner, file: f.id }; };
  const freshUser = () => { const u = single(A.id).find((x) => !usedUsers.has(x.id)); usedUsers.add(u.id); return u.id; };
  const fileB = ds.files.find((f) => f.tid === B.id).id;
  const exchange = async (opaque, audKey, scope = 'files.read') => { const r = await request(`${s.topo.urls.sts}/token`, { tls: s.tls, form: { grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange', subject_token: opaque, subject_token_type: URN_AT, resource: s.topo.audiences[audKey], scope } }); return r.json()?.access_token; };
  const direct = async (baseKey, p, tok, method = 'GET', body) => (await request(`${s.topo.urls[baseKey]}${p}`, { method, body, tls: s.tls, headers: { authorization: `Bearer ${tok}` } })).status;
  const is2xx = (x) => x >= 200 && x < 300;
  // ---------------- P-01 BFF ----------------
  {
    const { user, file } = ownerOf();
    const u = await s.login({ sub: user, tid: A.id });
    const pos = await u.call('GET', `/t/${A.id}/files/${file}`);
    row('P-01', 'positive', pos.status === 200, { status: pos.status });
    if (pos.status !== 200) { const e = new Error('first positive control failed'); e.abort = 'C-3'; throw e; }
    const ot = await u.call('GET', `/t/${B.id}/files/${fileB}`);
    row('P-01', 'other_tenant', ot.status === 404, { status: ot.status });
    const cli = await s.loginCli({ sub: user, tid: A.id });
    const tTool = await exchange(cli.tokens.access_token, 'tool');
    const oa = await direct('file', `/t/${A.id}/files/${file}`, tTool);
    row('P-01', 'other_aud', oa === 401, { status: oa, note: '同じ利用者の内部 AT（aud=tool）を file-service に直接提示' });
    await s.revoke('sub', user); await sleep(700);
    const ar = await u.call('GET', `/t/${A.id}/files/${file}`);
    row('P-01', 'after_revocation', !is2xx(ar.status), { status: ar.status });
  }
  // ---------------- P-03 sync service-to-service ----------------
  {
    const tool = ds.tools.find((t) => t.tid === A.id);
    const op = ds.tuples.find((x) => x.resource.type === 'proj/tool_instance' && x.resource.id === tool.id && x.relation === 'operator').subject.id;
    usedUsers.add(op);
    const f = ds.files.find((x) => x.tid === A.id).id;
    await s.writeTuples(A.id, { writes: [{ resource: { type: 'files/file', id: f }, relation: 'viewer', subject: { type: 'core/user', id: op } }], on_duplicate: 'ignore' });
    const u = await s.login({ sub: op, tid: A.id });
    const pos = await u.call('POST', `/t/${A.id}/tools/${tool.id}/run`, { file_id: f });
    row('P-03', 'positive', pos.status === 200, { status: pos.status });
    const ot = await u.call('POST', `/t/${A.id}/tools/${tool.id}/run`, { file_id: fileB });
    row('P-03', 'other_tenant', ot.status === 404, { status: ot.status });
    const cli = await s.loginCli({ sub: op, tid: A.id });
    const tTool = await exchange(cli.tokens.access_token, 'tool');
    const oa = await direct('file', `/t/${A.id}/files/${f}`, tTool);
    row('P-03', 'other_aud', oa === 401, { status: oa });
    await s.revoke('sub', op); await sleep(700);
    const ar = await u.call('POST', `/t/${A.id}/tools/${tool.id}/run`, { file_id: f });
    row('P-03', 'after_revocation', !is2xx(ar.status), { status: ar.status });
  }
  // ---------------- P-04 / P-05 jobs ----------------
  const jp = new JobPlatform({ s, dir: path.join(run.dir, 'jobs') });
  const filesA = ds.files.filter((f) => f.tid === A.id);
  const qq = []; for (const u of single(A.id)) for (const f of filesA.slice(0, 20)) qq.push({ user: u.id, type: 'files/file', id: f.id, permission: 'write' });
  const rr = refEvaluate({ tuples: ds.tuples, queries: qq, now: new Date() });
  const freePairs = qq.filter((x, i) => rr[i] === false);
  const editor = (u, f) => ({ resource: { type: 'files/file', id: f }, relation: 'editor', subject: { type: 'core/user', id: u } });
  const jobUser = async () => { const p = freePairs.find((x) => !usedUsers.has(x.user)); usedUsers.add(p.user); await s.writeTuples(A.id, { writes: [editor(p.user, p.id)], on_duplicate: 'ignore' }); const c = await s.loginCli({ sub: p.user, tid: A.id }); const g = await s.req(`${s.topo.urls.asA}/admin/grant-of-token`, { body: { token: c.tokens.access_token } }); return { user: p.user, file: p.id, gref: g.json().gref }; };
  for (const [pat, steps] of [['P-04', 1], ['P-05', 10]]) {
    const j = await jobUser();
    const e0 = await jp.enqueue({ sub: j.user, tid: A.id, gref: j.gref, fileId: j.file, steps });
    const r0 = await jp.runMessage(e0.file, { intervalMs: 100 });
    row(pat, 'positive', r0.final === 'done' && r0.out.filter((x) => x.executed).length === steps, { final: r0.final });
    // other tenant
    if (pat === 'P-04') {
      const e1 = await jp.enqueue({ sub: j.user, tid: A.id, gref: j.gref, fileId: j.file, steps });
      const m = JSON.parse(fs.readFileSync(e1.file, 'utf8')); fs.rmSync(e1.file);
      const r1 = await jp.runMessage(jp.inject({ ...m, tid: B.id }, 'other-tenant'), { intervalMs: 50 });
      row(pat, 'other_tenant', r1.out.every((x) => !x.executed), { final: r1.final });
    } else {
      const e1 = await jp.enqueue({ sub: j.user, tid: A.id, gref: j.gref, fileId: fileB, steps });
      row(pat, 'other_tenant', e1.accepted === false, { accepted: e1.accepted, reason: e1.reason });
    }
    // other aud: acceptance registered for another workload
    const e2 = await jp.enqueue({ sub: j.user, tid: A.id, gref: j.gref, fileId: j.file, steps, acceptanceWorkload: 'harness' });
    const r2 = await jp.runMessage(e2.file, { intervalMs: 50 });
    row(pat, 'other_aud', r2.out.every((x) => !x.executed), { final: r2.final, note: '別 workload 向けの受付記録（job_run_id）を consumer が使う' });
    // after revocation
    if (pat === 'P-04') {
      const e3 = await jp.enqueue({ sub: j.user, tid: A.id, gref: j.gref, fileId: j.file, steps });
      await s.deleteTuples(A.id, [editor(j.user, j.file)]);
      await sleep(300);
      const r3 = await jp.runMessage(e3.file, { intervalMs: 50 });
      row(pat, 'after_revocation', r3.out.every((x) => !x.executed), { final: r3.final });
    } else {
      const e3 = await jp.enqueue({ sub: j.user, tid: A.id, gref: j.gref, fileId: j.file, steps });
      let tRev = Infinity;
      const r3 = await jp.runMessage(e3.file, { intervalMs: 150, onStep: async (x, k) => { if (k === 2 && tRev === Infinity) { await s.deleteTuples(A.id, [editor(j.user, j.file)]); tRev = Date.now(); } } });
      row(pat, 'after_revocation', r3.out.filter((x) => x.t_auth_start > tRev && x.executed).length === 0, { final: r3.final, executed_before: r3.out.filter((x) => x.executed).length });
    }
  }
  // ---------------- P-07 third-party app ----------------
  {
    const { user, file } = ownerOf();
    const key = await newDpopKey();
    const ua = new UserAgent({ tls: s.tls });
    const tc = s.topo.clients.attacker;
    const r = await codeFlow({ meta: s.asMeta, auth: { type: 'private_key_jwt', clientId: tc.clientId, privateJwkFile: tc.privateJwkFile }, tls: s.tls, dpopKey: key, ua, login: { sub: user, tid: A.id, amr: 'pwd,otp' }, redirectUri: tc.redirectUri, scope: 'openid files.read', resource: s.topo.audiences.api });
    if (r.error) row('P-07', 'positive', false, { error: r.error, detail: JSON.stringify(r.detail).slice(0, 200) });
    else {
      const app = makeCliCaller(s, { tokens: r.tokens, key });
      const pos = await app('GET', `/t/${A.id}/files/${file}`);
      row('P-07', 'positive', pos.status === 200, { status: pos.status });
      const ot = await app('GET', `/t/${B.id}/files/${fileB}`);
      row('P-07', 'other_tenant', ot.status === 404, { status: ot.status });
      const oa = await direct('file', `/t/${A.id}/files/${file}`, r.tokens.access_token);
      row('P-07', 'other_aud', oa === 401, { status: oa, note: 'NP07-5 外部 AT を内部 RS に直接提示' });
      const g = await s.req(`${s.topo.urls.asA}/admin/grant-of-token`, { body: { token: r.tokens.access_token } });
      await s.req(`${s.topo.urls.asA}/admin/revoke-grant`, { body: { grantId: g.json().grantId } });
      await sleep(700);
      const ar = await app('GET', `/t/${A.id}/files/${file}`);
      row('P-07', 'after_revocation', !is2xx(ar.status), { status: ar.status });
    }
  }
  // ---------------- P-08 AI agent -> tool server ----------------
  {
    const tool = ds.tools.filter((t) => t.tid === A.id)[1] || ds.tools.find((t) => t.tid === A.id);
    const op = ds.tuples.find((x) => x.resource.type === 'proj/tool_instance' && x.resource.id === tool.id && x.relation === 'operator').subject.id;
    const agentUser = usedUsers.has(op) ? (() => { const u = freshUser(); return u; })() : (usedUsers.add(op), op);
    if (agentUser !== op) await s.writeTuples(A.id, { writes: [{ resource: { type: 'proj/tool_instance', id: tool.id }, relation: 'operator', subject: { type: 'core/user', id: agentUser } }], on_duplicate: 'ignore' });
    const f = ds.files.find((x) => x.tid === A.id).id;
    await s.writeTuples(A.id, { writes: [{ resource: { type: 'files/file', id: f }, relation: 'viewer', subject: { type: 'core/user', id: agentUser } }], on_duplicate: 'ignore' });
    const cli = await s.loginCli({ sub: agentUser, tid: A.id });
    const agent = makeCliCaller(s, cli);
    const before = readJsonl(path.join(run.dir, 'sts', 'issuance-ledger.jsonl')).length;
    const pos = await agent('POST', `/t/${A.id}/tools/${tool.id}/run`, { file_id: f });
    const led = readJsonl(path.join(run.dir, 'sts', 'issuance-ledger.jsonl')).slice(before);
    const down = led.find((x) => x.op === 'exchange' && x.caller === 'tool-service' && x.result === 'issued');
    row('P-08', 'positive', pos.status === 200 && !!down && down.act_depth === 1 && down.aud === s.topo.audiences.file, { status: pos.status, downstream_exchange: down ? { aud: down.aud, act_depth: down.act_depth } : null, note: '下流は STS で取り直し（aud=file、act=tool-service）。上流 token の中継なし' });
    const toolB = ds.tools.find((t) => t.tid === B.id);
    const ot = await agent('POST', `/t/${A.id}/tools/${toolB.id}/run`, { file_id: f });
    row('P-08', 'other_tenant', ot.status === 404, { status: ot.status });
    const tFile = await exchange(cli.tokens.access_token, 'file');
    const oa = await direct('tool', `/t/${A.id}/tools/${tool.id}`, tFile);
    row('P-08', 'other_aud', oa === 401, { status: oa, note: 'NP08-1 他 audience（file）の token を tool サーバーへ' });
    await s.revoke('sub', agentUser); await sleep(700);
    const ar = await agent('POST', `/t/${A.id}/tools/${tool.id}/run`, { file_id: f });
    row('P-08', 'after_revocation', !is2xx(ar.status), { status: ar.status });
  }
  // ---------------- P-09 list / search ----------------
  {
    const uid = freshUser();
    const u = await s.login({ sub: uid, tid: A.id });
    const pos = await u.call('GET', `/t/${A.id}/files?limit=100`);
    const items = (pos.body?.items || []).map((x) => x.id);
    const bIds = new Set(ds.files.filter((f) => f.tid !== A.id).map((f) => f.id));
    row('P-09', 'positive', pos.status === 200 && items.length > 0, { status: pos.status, items: items.length });
    const ot = await u.call('GET', `/t/${B.id}/files?limit=100`);
    row('P-09', 'other_tenant', ot.status === 404 && !items.some((x) => bIds.has(x)), { status: ot.status, other_tenant_items_in_own_list: items.filter((x) => bIds.has(x)).length });
    const lt = clientTls(s.topo, 'label-service');
    const sr = await request(`${s.topo.urls.pdp}/access/v1/search/resource`, { tls: lt, headers: { 'x-request-id': opaqueId() }, body: { subject: { type: 'core/user', id: uid, properties: { tid: A.id } }, action: { name: 'read' }, resource: { type: 'files/file' }, page: { limit: 10 } } });
    row('P-09', 'other_aud', sr.status === 403, { status: sr.status, note: 'NP09-4 一覧ヘルパ以外からの searchResources 直接呼出し' });
    // v2: the folder must not be readable by uid (otherwise X stays legitimately readable through inheritance)
    const fA = ds.folders.filter((f) => f.tid === A.id);
    const rfo = refEvaluate({ tuples: ds.tuples, queries: fA.map((f) => ({ user: uid, type: 'files/folder', id: f.id, permission: 'read' })), now: new Date() });
    const owner = fA.find((f, i) => rfo[i] === false);
    const uo = await s.login({ sub: owner.owner, tid: A.id });
    const cr = await uo.call('POST', `/t/${A.id}/folders/${owner.id}/files`, { content: 'p09' });
    const X = cr.body?.id;
    await sleep(300);
    await s.writeTuples(A.id, { writes: [{ resource: { type: 'files/file', id: X }, relation: 'viewer', subject: { type: 'core/user', id: uid } }], on_duplicate: 'ignore' });
    const listAll = async () => { const out = []; let c = null; for (let i = 0; i < 50; i++) { const r = await u.call('GET', `/t/${A.id}/files?limit=100${c ? `&cursor=${encodeURIComponent(c)}` : ''}`); out.push(...(r.body?.items || []).map((x) => x.id)); if (!r.body?.next_cursor) break; c = r.body.next_cursor; } return out; };
    const seen = (await listAll()).includes(X);
    await s.deleteTuples(A.id, [{ resource: { type: 'files/file', id: X }, relation: 'viewer', subject: { type: 'core/user', id: uid } }]);
    const after = (await listAll()).includes(X);
    row('P-09', 'after_revocation', seen && !after, { seen_before: seen, returned_after: after });
  }
  // ---------------- P-14 stream ----------------
  {
    const topo = loadTopology(s.topoFile);
    gw = await new StreamGateway({ topo, secrets: loadSecrets(topo), port: groupPortBase(TC) + 18, files: new Map(ds.files.map((f) => [f.id, { tid: f.tid }])), iConnMs: params.p14.i_conn_ms, lConnMs: params.p14.l_conn_ms, tickMs: params.p14.tick_ms }).start();
    const port = groupPortBase(TC) + 18;
    const htls = { key: topo.workloads.harness.key, cert: topo.workloads.harness.cert, ca: topo.pki.ca };
    const tokenFor = async (user, aud = 'label') => { const c = await s.loginCli({ sub: user, tid: A.id }); return exchange(c.tokens.access_token, aud); };
    const decode = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
    const { user, file } = ownerOf();
    const tk = await tokenFor(user);
    const c0 = await wsConnect({ port, path: `/t/${A.id}/files/${file}/stream`, token: tk, tlsOpts: htls });
    await sleep(1200);
    row('P-14', 'positive', c0.status === 101 && c0.messages.length >= 5 && !c0.closed, { status: c0.status, messages: c0.messages.length });
    c0.close();
    const o1 = await wsConnect({ port, path: `/t/${A.id}/files/${fileB}/stream`, token: tk, tlsOpts: htls });
    const o2 = await wsConnect({ port, path: `/t/${B.id}/files/${fileB}/stream`, token: tk, tlsOpts: htls });
    row('P-14', 'other_tenant', o1.status !== 101 && o2.status !== 101, { status: [o1.status, o2.status] });
    const tkFile = await tokenFor(freshUser(), 'file');
    const oa = await wsConnect({ port, path: `/t/${A.id}/files/${file}/stream`, token: tkFile, tlsOpts: htls });
    row('P-14', 'other_aud', oa.status === 401, { status: oa.status });
    const extra1 = await wsConnect({ port, path: `/t/${A.id}/files/${file}/stream?access_token=x`, token: tk, tlsOpts: htls });
    const extra2 = await wsConnect({ port, path: `/t/${A.id}/files/${file}/stream`, token: tk, tlsOpts: htls, origin: 'https://evil.poc.test' });
    row('P-14', 'extra_query_token_and_origin', extra1.status === 401 && extra2.status === 403, { status: [extra1.status, extra2.status], note: 'NP14-3・NP14-4（基準外の追加負例）' });
    // after revocation (connect after sub revocation)
    const ru = ownerOf();
    const tkr = await tokenFor(ru.user);
    await s.revoke('sub', ru.user); await sleep(700);
    const ar = await wsConnect({ port, path: `/t/${A.id}/files/${ru.file}/stream`, token: tkr, tlsOpts: htls });
    row('P-14', 'after_revocation', ar.status !== 101, { status: ar.status });
    // in-connection revocation: (a) relation, (b) session (sid)
    const budget = params.p14.delta_conn_ms;
    const inconn = [];
    {
      const uid = freshUser();
      const fx = ds.files.filter((f) => f.tid === A.id);
      const rf = refEvaluate({ tuples: ds.tuples, queries: fx.map((f) => ({ user: uid, type: 'files/file', id: f.id, permission: 'read' })), now: new Date() });
      const target = fx.find((f, i) => rf[i] === false).id;
      await s.writeTuples(A.id, { writes: [{ resource: { type: 'files/file', id: target }, relation: 'viewer', subject: { type: 'core/user', id: uid } }], on_duplicate: 'ignore' });
      const t = await tokenFor(uid);
      const c = await wsConnect({ port, path: `/t/${A.id}/files/${target}/stream`, token: t, tlsOpts: htls });
      await sleep(800);
      await s.deleteTuples(A.id, [{ resource: { type: 'files/file', id: target }, relation: 'viewer', subject: { type: 'core/user', id: uid } }]);
      const tRev = Date.now();
      await sleep(3000);
      inconn.push({ kind: 'relation_revoked', connected: c.status === 101, msgs_before: c.messages.filter((m) => m.t <= tRev).length, delivered_after_budget: c.messages.filter((m) => m.t > tRev + budget).length, closed: c.closed, ms_to_close: c.closed ? c.closed.t - tRev : null });
      c.close();
    }
    {
      const so = ownerOf();
      const t = await tokenFor(so.user);
      const c = await wsConnect({ port, path: `/t/${A.id}/files/${so.file}/stream`, token: t, tlsOpts: htls });
      await sleep(800);
      await s.revoke('sid', decode(t).sid);
      const tRev = Date.now();
      await sleep(3000);
      inconn.push({ kind: 'session_revoked', connected: c.status === 101, msgs_before: c.messages.filter((m) => m.t <= tRev).length, delivered_after_budget: c.messages.filter((m) => m.t > tRev + budget).length, closed: c.closed, ms_to_close: c.closed ? c.closed.t - tRev : null });
      c.close();
    }
    for (const x of inconn) row('P-14', `in_connection_${x.kind}`, x.connected && x.msgs_before > 0 && x.delivered_after_budget === 0 && !!x.closed, x);
    evalOut.p14_gateway_events = gw.events.length;
    await gw.stop(); gw = null;
  }
  await sleep(500);
  // ---------------- evaluation ----------------
  const pos = rows.filter((r) => r.kind === 'positive');
  const neg = rows.filter((r) => ['other_tenant', 'other_aud', 'after_revocation'].includes(r.kind));
  const p14 = rows.filter((r) => r.kind.startsWith('in_connection_'));
  const crit = {
    positive_failures: { value: pos.filter((r) => !r.ok).length, n: pos.length, pass: pos.length === 8 && pos.every((r) => r.ok) },
    negative_accepted: { value: neg.filter((r) => !r.ok).length, n: neg.length, pass: neg.length === 24 && neg.every((r) => r.ok) },
    p14_deliveries_after_budget: { value: p14.reduce((a, r) => a + (r.delivered_after_budget || 0), 0), pass: p14.length === 2 && p14.every((r) => r.ok), ms_to_close: p14.map((r) => ({ kind: r.kind, ms: r.ms_to_close, code: r.closed?.code, reason: r.closed?.reason })) },
  };
  Object.assign(evalOut, { criteria: crit, verdict: Object.values(crit).every((c) => c.pass) ? '合格' : '不合格', extra_negatives: rows.filter((r) => r.kind.startsWith('extra_')) });
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack };
  evalOut.verdict = '中止';
  console.error(e.stack);
} finally {
  if (gw) await gw.stop();
  if (s) await s.stop();
  writeEval(run, evalOut, ['requests.jsonl']);
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
