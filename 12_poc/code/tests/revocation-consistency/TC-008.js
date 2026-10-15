// TC-008 stale allow 継続時間と consistency mode (test plan §4.8, frozen commit 151940ac).
// Collects raw data only; pass/fail is computed by eval-TC-008.js from the files written here (§2.6).
//   node tests/revocation-consistency/TC-008.js [--conditions A,B] [--trials N] [--prefreeze]
//
// Per condition (params/TC-008.json: OpenFGA Check cache TTL, façade revocation fence, PEP SDK decision cache):
//   (1)(2) probes at q on 6 streams (rs x3 without token, rs_tok with the file's stored consistency token,
//          w = file.write, p = tool.config) through BFF -> edge -> STS -> PEP -> façade -> OpenFGA; one revocation
//          write (relationship delete through the façade) per trial; T0 = harness monotonic time of the write ack.
//   attack: requests right after the revocation (the probes), fence rollback (older / forged fence token)
//   (3) example A (unshare folder, then move a document into it) and example B (revoke, then append)
//   (4) read-after-write with the write's consistency token (façade) and with the stored token (service share path)
import fs from 'node:fs';
import path from 'node:path';
import { startStack } from '../../harness/stack.js';
import { args } from '../../lib/runtime.js';
import { openRun, loadParams, datasetWithProbeUsers, startProber, monoMs, sleep, freeze } from './common.js';

const a = args();
const P = loadParams('TC-008');
const conds = P.conditions.filter((c) => !a.conditions || String(a.conditions).split(',').includes(c.id));
const trials = Number(a.trials || P.trials_per_condition);
const q = P.probe_interval_ms;

const ttlMs = (t) => (t ? Number(/^(\d+)s$/.exec(t)[1]) * 1000 : 0);
const U = (id) => ({ type: 'core/user', id });
const T = (type, id, rel, uid) => ({ resource: { type, id }, relation: rel, subject: U(uid) });

function pickResources(ds, tid) {
  const files = ds.files.filter((f) => f.tid === tid);
  const tops = ds.folders.filter((f) => f.tid === tid && !f.parent && files.filter((x) => x.folder === f.id).length >= 2);
  const [FA, FB] = tops;
  if (!FA || !FB) throw new Error('need two top-level folders with >= 2 files');
  const G = files.find((f) => f.folder === FA.id);
  const D = files.find((f) => f.folder === FB.id);
  const used = new Set([...files.filter((f) => f.folder === FA.id || f.folder === FB.id).map((f) => f.id)]);
  const rest = files.filter((f) => !used.has(f.id));
  const take = () => { const f = rest.shift(); if (!f) throw new Error('not enough files'); return f; };
  const rsFiles = [take(), take(), take()];
  const Ftok = take(), Fw = take(), E = take(), Rraw = take(), Fraw = take();
  const tool = ds.tools.find((t) => t.tid === tid);
  return { FA, FB, G, D, rsFiles, Ftok, Fw, E, Rraw, Fraw, tool, project: ds.projects.find((p) => p.id === tool.project) };
}

async function runCondition(cond) {
  const { run, params } = openRun('TC-008', { seed: P.seed, prefreeze: !!a.prefreeze, purpose: `TC-008 condition ${cond.id}` });
  run.meta.condition = cond;
  run.meta.trials = trials;
  run.meta.probe_interval_ms = q;
  run.writeJson('run.json', run.meta);
  const { ds, tenant, users } = datasetWithProbeUsers({ seed: P.seed, profile: P.profile, n: 12, tag: 'tc008' });
  const tid = tenant.id;
  const R = pickResources(ds, tid);
  const [rs0, rs1, rs2, rsTokU, wU, pU, bobA, moverA, bobB, writerB, rawU, rawSvcU] = users;
  const cacheTtl = ttlMs(cond.openfga_check_cache_ttl);
  const flags = cond.openfga_check_cache_ttl ? ['--check-query-cache-enabled', '--check-query-cache-ttl', cond.openfga_check_cache_ttl] : [];
  const env = { pdp: cond.facade_fence ? { PDP_REVOCATION_FENCE: '1' } : {} };
  for (const svc of ['file-service', 'tool-service', 'label-service']) env[svc] = { PEP_DECISION_CACHE_MS: String(cond.sdk_cache_ms || 0) };
  const layer = { openfga: { check_query_cache: cond.openfga_check_cache_ttl ? { enabled: true, ttl: cond.openfga_check_cache_ttl } : { enabled: false }, flags, datastore: 'sqlite' }, facade: { fence: cond.facade_fence, fence_window_ms: 0 }, sdk_cache_ms: cond.sdk_cache_ms };
  run.writeJson('layers.json', layer);
  run.writeJson('resources.json', { tid, users: { rs: [rs0, rs1, rs2], rsTokU, wU, pU, bobA, moverA, bobB, writerB, rawU, rawSvcU }, files: { rs: R.rsFiles.map((f) => f.id), Ftok: R.Ftok.id, Fw: R.Fw.id, E: R.E.id, Rraw: R.Rraw.id, Fraw: R.Fraw.id, FA: R.FA.id, FB: R.FB.id, G: R.G.id, D: R.D.id }, tool: R.tool.id, project: R.project.id });
  const s = await startStack({ tc: 'TC-008', run, engine: 'openfga', dataset: ds, openfgaFlags: flags, env, settings: { accessTokenTtlSec: 7200 } });
  let status = 'completed';
  try {
    const pdp = s.topo.urls.pdp;
    const write = async (writes) => { const r = await s.req(`${pdp}/v1/tenants/${tid}/relationships/write`, { body: { writes, on_duplicate: 'ignore' } }); if (r.status !== 200) throw new Error(`grant ${r.status} ${r.text}`); return r.json().consistency_token; };
    const del = async (deletes) => { const t0s = monoMs(); const r = await s.req(`${pdp}/v1/tenants/${tid}/relationships/delete`, { body: { deletes, on_missing: 'ignore' } }); const t0 = monoMs(); if (r.status !== 200) throw new Error(`revoke ${r.status} ${r.text}`); return { t0_send_ms: t0s, t0_ms: t0, token: r.json().consistency_token, wall: new Date().toISOString() }; };
    const evalDirect = async (sub, type, id, action, token) => {
      const body = { subject: { type: 'core/user', id: sub, properties: { tid, principal_type: 'human', acr: 'L2' } }, action: { name: action }, resource: { type, id, properties: { tid } }, context: { 'x-authz-profile': { profile_version: '1.0', ...(token ? { consistency: { token } } : {}) } } };
      const r = await s.evaluate(body);
      const j = r.json();
      return { status: r.status, decision: j?.decision, reason: j?.context?.['x-authz-profile']?.reason, mode: j?.context?.['x-authz-profile']?.consistency?.mode };
    };
    // owners of the token / raw files (dataset users)
    const owner = (f) => f.owner;
    const sess = {};
    const login = async (k, sub, amr = 'pwd,otp') => { const l = await s.login({ sub, tid, amr }); if (!l.ok) throw new Error(`login ${k} failed ${l.status}`); sess[k] = l; };
    for (const [k, sub] of [['rs0', rs0], ['rs1', rs1], ['rs2', rs2], ['rsTok', rsTokU], ['w', wU], ['bobA', bobA], ['moverA', moverA], ['bobB', bobB], ['writerB', writerB], ['rawSvc', rawSvcU], ['ownerTok', owner(R.Ftok)], ['ownerRaw', owner(R.Fraw)]]) await login(k, sub);
    await login('p', pU, 'pwd,fido');

    // ------------------------------------------------------------------ (1)(2) probes x trials
    const streams = [
      { name: 'rs0', tier: 'read-sensitive', kind: 'rs', fn: () => sess.rs0.call('GET', `/t/${tid}/files/${R.rsFiles[0].id}`) },
      { name: 'rs1', tier: 'read-sensitive', kind: 'rs', fn: () => sess.rs1.call('GET', `/t/${tid}/files/${R.rsFiles[1].id}`) },
      { name: 'rs2', tier: 'read-sensitive', kind: 'rs', fn: () => sess.rs2.call('GET', `/t/${tid}/files/${R.rsFiles[2].id}`) },
      { name: 'rs_tok', tier: 'read-sensitive', kind: 'rs_tok', fn: () => sess.rsTok.call('GET', `/t/${tid}/files/${R.Ftok.id}`) },
      { name: 'w', tier: 'write', kind: 'w', fn: (k) => sess.w.call('PUT', `/t/${tid}/files/${R.Fw.id}`, { content: `tc008 probe ${k}` }) },
      { name: 'p', tier: 'privileged', kind: 'p', fn: (k) => sess.p.call('PUT', `/t/${tid}/tools/${R.tool.id}/config`, { config: { probe: k } }) },
    ];
    const grants = [T('files/file', R.rsFiles[0].id, 'viewer', rs0), T('files/file', R.rsFiles[1].id, 'viewer', rs1), T('files/file', R.rsFiles[2].id, 'viewer', rs2), T('files/file', R.Fw.id, 'editor', wU), T('proj/project', R.project.id, 'owner', pU)];
    const revokes = [...grants, T('files/file', R.Ftok.id, 'viewer', rsTokU)];
    const maxAgeAll = cacheTtl + (cond.sdk_cache_ms || 0);
    for (let i = 0; i < trials; i++) {
      const grantToken = await write(grants);
      const sh = await sess.ownerTok.call('POST', `/t/${tid}/files/${R.Ftok.id}/share`, { grantee_sub: rsTokU });
      run.append('trials.jsonl', { trial: i, ev: 'grant', grant_token: grantToken, share_status: sh.status });
      const recent = Object.fromEntries(streams.map((x) => [x.name, []]));
      const probers = streams.map((st) => startProber({
        name: st.name, intervalMs: q, fn: async (k) => { const r = await st.fn(k); return { status: r.status }; },
        onResult: (rec) => { recent[rec.probe].push(rec.status); run.append('requests.jsonl', { trial: i, stream: rec.probe, tier: st.tier, k: rec.k, sched_ms: +rec.sched_ms.toFixed(3), sent_ms: +rec.sent_ms.toFixed(3), resp_ms: +rec.resp_ms.toFixed(3), status: rec.status, error: rec.error }); },
      }));
      // warm-up / positive control: every stream answers 200 at least N times in a row
      const need = P.warmup_min_consecutive_allows;
      const okStream = (n) => { const r = recent[n]; return r.length >= need && r.slice(-need).every((x) => x === 200); };
      const wStart = monoMs();
      while (monoMs() - wStart < maxAgeAll + P.warmup_extra_ms && !streams.every((x) => okStream(x.name))) await sleep(50);
      const control = Object.fromEntries(streams.map((x) => [x.name, okStream(x.name)]));
      // revocation
      const rv = await del(revokes);
      run.append('inject.jsonl', { trial: i, ev: 'revocation', revocation_id: rv.token, t0_send_ms: +rv.t0_send_ms.toFixed(3), t0_ms: +rv.t0_ms.toFixed(3), wall: rv.wall, tuples: revokes.length });
      // fence rollback (fence conditions): older token (the grant's) and a forged token
      let fence = null;
      if (cond.facade_fence) {
        const old = await s.req(`${pdp}/v1/tenants/${tid}/revocation-fence`, { body: { fence: grantToken } });
        const forged = await s.req(`${pdp}/v1/tenants/${tid}/revocation-fence`, { body: { fence: `openfga:999999.${'A'.repeat(22)}` } });
        const cur = await s.req(`${pdp}/v1/tenants/${tid}/revocation-fence`, { method: 'GET' });
        fence = { old_status: old.status, forged_status: forged.status, current: cur.json()?.fence, revocation_token: rv.token };
      }
      // old consistency token replayed after the revocation (must not lower the evaluation bound)
      const replay = await evalDirect(rs0, 'files/file', R.rsFiles[0].id, 'read', grantToken);
      await sleep(maxAgeAll + P.post_revocation_observe_extra_ms);
      await Promise.all(probers.map((p) => p.stop()));
      run.append('trials.jsonl', { trial: i, ev: 'done', control, t0_ms: +rv.t0_ms.toFixed(3), revocation_id: rv.token, fence, old_token_replay: replay, observe_ms: maxAgeAll + P.post_revocation_observe_extra_ms });
      process.stdout.write(`[${cond.id}] trial ${i + 1}/${trials} control=${Object.values(control).every(Boolean)}\n`);
    }

    // ------------------------------------------------------------------ (3) examples A and B
    for (let i = 0; i < P.examples_per_condition; i++) {
      // example A: unshare FA from bob, then move D (FB -> FA); bob must not read D
      await write([T('files/folder', R.FA.id, 'editor', moverA), T('files/folder', R.FB.id, 'editor', moverA), T('files/folder', R.FA.id, 'viewer', bobA)]);
      const warm = [];
      for (let k = 0; k < 3; k++) { warm.push((await sess.bobA.call('GET', `/t/${tid}/files/${R.G.id}`)).status); warm.push((await evalDirect(bobA, 'files/file', R.G.id, 'read')).decision); await sleep(30); }
      const un = await del([T('files/folder', R.FA.id, 'viewer', bobA)]);
      const mv = await sess.moverA.call('POST', `/t/${tid}/files/${R.D.id}/move`, { to_folder: R.FA.id });
      const after = [];
      for (let k = 0; k < 3; k++) {
        after.push({ path: 'service', status: (await sess.bobA.call('GET', `/t/${tid}/files/${R.D.id}`)).status });
        after.push({ path: 'facade_token', ...(await evalDirect(bobA, 'files/file', R.D.id, 'read', un.token)) });
        after.push({ path: 'facade_notoken', ...(await evalDirect(bobA, 'files/file', R.D.id, 'read')) });
        await sleep(50);
      }
      const back = await sess.moverA.call('POST', `/t/${tid}/files/${R.D.id}/move`, { to_folder: R.FB.id });
      run.append('examples.jsonl', { example: 'A', i, warm, unshare_ms: +un.t0_ms.toFixed(3), unshare_token: un.token, move_status: mv.status, after, restore_status: back.status });
      // example B: revoke bob's viewer on E, then append to E; bob must not read the appended content
      await write([T('files/file', R.E.id, 'viewer', bobB), T('files/file', R.E.id, 'editor', writerB)]);
      const warmB = [];
      for (let k = 0; k < 3; k++) { warmB.push((await sess.bobB.call('GET', `/t/${tid}/files/${R.E.id}`)).status); warmB.push((await evalDirect(bobB, 'files/file', R.E.id, 'read')).decision); await sleep(30); }
      const rvB = await del([T('files/file', R.E.id, 'viewer', bobB)]);
      const marker = `tc008-exB-${cond.id}-${i}-post-revocation`;
      const ap = await sess.writerB.call('PUT', `/t/${tid}/files/${R.E.id}`, { content: marker });
      const afterB = [];
      for (let k = 0; k < 3; k++) {
        const r = await sess.bobB.call('GET', `/t/${tid}/files/${R.E.id}`);
        afterB.push({ path: 'service', status: r.status, marker_seen: r.status === 200 && r.body?.content === marker });
        afterB.push({ path: 'facade_token', ...(await evalDirect(bobB, 'files/file', R.E.id, 'read', rvB.token)) });
        afterB.push({ path: 'facade_notoken', ...(await evalDirect(bobB, 'files/file', R.E.id, 'read')) });
        await sleep(50);
      }
      run.append('examples.jsonl', { example: 'B', i, warm: warmB, revoke_ms: +rvB.t0_ms.toFixed(3), revoke_token: rvB.token, append_status: ap.status, after: afterB });
    }

    // ------------------------------------------------------------------ (4) read-after-write
    for (let i = 0; i < P.raw_iterations_per_condition; i++) {
      // façade: pre-populate a cached deny, grant -> read with the grant token must allow; revoke -> read with the revoke token must deny
      const pre = await evalDirect(rawU, 'files/file', R.Rraw.id, 'read');
      const tg = await write([T('files/file', R.Rraw.id, 'viewer', rawU)]);
      const afterGrant = await evalDirect(rawU, 'files/file', R.Rraw.id, 'read', tg);
      const tr = await del([T('files/file', R.Rraw.id, 'viewer', rawU)]);
      const afterRevoke = await evalDirect(rawU, 'files/file', R.Rraw.id, 'read', tr.token);
      // service: cached deny, then the owner shares (outbox stores the token with the file), grantee reads at once
      const pre2 = (await sess.rawSvc.call('GET', `/t/${tid}/files/${R.Fraw.id}`)).status;
      const sh = await sess.ownerRaw.call('POST', `/t/${tid}/files/${R.Fraw.id}/share`, { grantee_sub: rawSvcU });
      const svcAfterShare = (await sess.rawSvc.call('GET', `/t/${tid}/files/${R.Fraw.id}`)).status;
      const tr2 = await del([T('files/file', R.Fraw.id, 'viewer', rawSvcU)]);
      const svcAfterRevoke = (await sess.rawSvc.call('GET', `/t/${tid}/files/${R.Fraw.id}`)).status;
      run.append('raw.jsonl', { i, facade: { pre, grant_token: tg, after_grant: afterGrant, revoke_token: tr.token, after_revoke: afterRevoke }, service: { pre: pre2, share_status: sh.status, after_share: svcAfterShare, revoke_token: tr2.token, after_revoke: svcAfterRevoke } });
    }
    // counters and façade state for the record
    run.writeJson('facade-stats.json', (await s.req(`${pdp}/admin/stats`, { method: 'GET' })).json());
  } catch (e) {
    status = 'aborted:harness_error';
    run.writeJson('error.json', { message: e.message, stack: e.stack });
    console.error(e);
  } finally {
    await s.stop();
  }
  run.meta.w32tm_end = (await import('../../harness/run.js')).envInfo().time_sync;
  run.finish(status);
  console.log(JSON.stringify({ condition: cond.id, run_dir: run.dir, status }));
  return { cond: cond.id, dir: run.dir, status };
}

if (!a.prefreeze && a.freeze) { const m = freeze('TC-008', String(a.freeze)); console.log('frozen manifest', m.ver, m.manifest_sha256); }
const out = [];
for (const c of conds) out.push(await runCondition(c));
console.log(JSON.stringify(out, null, 2));
