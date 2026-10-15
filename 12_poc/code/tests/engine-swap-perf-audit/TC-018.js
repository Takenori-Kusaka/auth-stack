// TC-018 登録・招待・所属変更・複数所属・退職（preregistered-test-plan.md §4.18）
//   node tests/engine-swap-perf-audit/TC-018.js
import path from 'node:path';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { syntheticId } from '../../lib/ids.js';
import { UserAgent, codeFlow } from '../../lib/oauth-client.js';
import { newDpopKey } from '../../lib/dpop.js';
import { openRun, groupPortBase, writeEval, sleep, HARNESS_CHECK } from './common.js';
import { refEvaluate } from './lib/helpers.js';
import { makeCliCaller } from './lib/cli.js';
import { Lifecycle, contactOf } from './lib/lifecycle.js';
import { JobPlatform } from './lib/jobs.js';

const TC = 'TC-018';
const { run, params } = openRun(TC, { seed: 18 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const P = params.parameters;
let status = 'completed';
const evalOut = { tc: TC, scenarios: {} };
let s = null;
const SC = evalOut.scenarios;
const ok2xx = (x) => x >= 200 && x < 300;

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: groupPortBase(TC) });
  const lc = new Lifecycle({ s, dataset: ds, graceMs: P.deletion_grace_ms, pendingTtlMs: P.pending_ttl_ms });
  const jp = new JobPlatform({ s, dir: path.join(run.dir, 'jobs') });
  const [T1, T2, T3] = ds.tenants;
  const single = (tid) => ds.users.filter((u) => u.memberships.length === 1 && u.memberships[0].tid === tid && u.memberships[0].kind === 'member');
  const used = new Set();
  const take = (tid) => { const u = single(tid).find((x) => !used.has(x.id) && ds.files.some((f) => f.owner === x.id)); used.add(u.id); return u.id; };
  const ownFile = (sub, tid) => ds.files.find((f) => f.owner === sub && f.tid === tid)?.id;
  const sessions = async (sub, tid) => {
    const bff = await s.login({ sub, tid });
    const cli = await s.loginCli({ sub, tid });
    return { bff, cli, call: makeCliCaller(s, cli) };
  };
  async function allPaths(sub, tid, sess, job, fileOverride) {
    const f = fileOverride || ownFile(sub, tid) || ds.files.find((x) => x.tid === tid).id;
    const r = {};
    r.bff = sess.bff.ok ? (await sess.bff.call('GET', `/t/${tid}/files/${f}`)).status : 'no_session';
    r.cli = (await sess.call('GET', `/t/${tid}/files/${f}`)).status;
    const rf = await sess.cli.refresh();
    r.refresh = rf.status;
    if (job) { const t = await jp.txnToken(job.job_run_id, 'op.file.write'); r.job_tts = t.error ? 'refused' : 'issued'; }
    let nl; try { nl = await s.login({ sub, tid }); r.new_login = nl.ok ? 200 : nl.status; } catch (e) { r.new_login = `refused:${e.message.slice(0, 40)}`; }
    r.any_allowed = ok2xx(r.bff) || ok2xx(r.cli) || r.refresh === 200 || r.job_tts === 'issued' || r.new_login === 200;
    return r;
  }
  // ---------------- S1 registration ----------------
  {
    const u = syntheticId(), v = syntheticId();
    const t1 = await lc.transition(u, 'pending');
    await lc.subjects.get(u).memberships.set(T1.id, { state: 'active', kind: 'member' }); await lc.asUser(u);
    let pendingLogin; try { pendingLogin = (await s.login({ sub: u, tid: T1.id })).ok; } catch { pendingLogin = false; }
    const t2 = await lc.transition(u, 'active');
    await lc.addMembership(u, T1.id);
    const activeLogin = await s.login({ sub: u, tid: T1.id });
    const search = await activeLogin.call('GET', `/t/${T1.id}/files?limit=5`);
    const tv = await lc.transition(v, 'pending'); lc.subjects.get(v).memberships.set(T1.id, { state: 'active', kind: 'member' }); await lc.asUser(v);
    await sleep(P.pending_ttl_ms + 300);
    const tv2 = await lc.transition(v, 'active');
    let expiredLogin; try { expiredLogin = (await s.login({ sub: v, tid: T1.id })).ok; } catch { expiredLogin = false; }
    SC.S1 = { pending_login_succeeded: !!pendingLogin, activation: t2.ok, active_login: activeLogin.ok, active_search_status: search.status, expired_pending_activation: tv2.ok, expired_pending_why: tv2.why, expired_pending_login_succeeded: !!expiredLogin, transitions_ok: [t1.ok, t2.ok, tv.ok] };
    if (!activeLogin.ok) { const e = new Error('positive control S1'); e.abort = 'C-3'; throw e; }
  }
  log('S1 done');
  // ---------------- S2 invitations ----------------
  {
    const admin2 = ds.tuples.find((x) => x.resource.type === 'core/tenant' && x.resource.id === T2.id && x.relation === 'admin').subject.id;
    const U = take(T1.id), W = take(T1.id);
    const res = {};
    const loginT2 = async (sub) => { try { return (await s.login({ sub, tid: T2.id })).ok; } catch { return false; } };
    const invA = lc.createInvite(admin2, T2.id, contactOf(U), { ttlMs: 60_000 });
    const fwd = await lc.accept(invA.token, W); // forwarded to W
    res.forwarded = { accepted: fwd.ok, why: fwd.why, W_login_T2: await loginT2(W), state: invA.state };
    const invB = lc.createInvite(admin2, T2.id, contactOf(U), { ttlMs: 60_000 });
    const okAcc = await lc.accept(invB.token, U);
    res.legit = { accepted: okAcc.ok, U_login_T2: await loginT2(U) };
    if (!res.legit.U_login_T2) { const e = new Error('positive control S2'); e.abort = 'C-3'; throw e; }
    res.reuse_same = { accepted: (await lc.accept(invB.token, U)).ok };
    res.reuse_other = { accepted: (await lc.accept(invB.token, W)).ok };
    const invC = lc.createInvite(admin2, T2.id, contactOf(W), { ttlMs: P.invite_short_ttl_ms });
    await sleep(P.invite_short_ttl_ms + 300);
    res.expired = { accepted: (await lc.accept(invC.token, W)).ok, W_login_T2: await loginT2(W) };
    const invD = lc.createInvite(admin2, T2.id, contactOf(W), { ttlMs: 60_000 });
    const oldTok = invD.token; lc.resend(invD.id);
    res.resent_old_token = { accepted: (await lc.accept(oldTok, W)).ok };
    lc.revokeInvite(invD.id);
    res.revoked = { accepted: (await lc.accept(invD.token, W)).ok, W_login_T2: await loginT2(W) };
    const nonAdmin = take(T2.id);
    res.non_admin_create = { created: !!lc.createInvite(nonAdmin, T2.id, contactOf(W)).token };
    SC.S2 = res;
  }
  log('S2 done');
  // ---------------- S3 mover ----------------
  {
    const groups = ds.groups.filter((g) => g.tid === T1.id);
    // find a member M and two groups G1 (M member) / G2 (not) plus files readable only through G1 / G2
    const M = take(T1.id);
    const [G1, G2] = [groups[groups.length - 1].id, syntheticId()];
    await s.writeTuples(T1.id, { writes: [{ resource: { type: 'core/group', id: G2 }, relation: 'owner_unit', subject: { type: 'core/tenant', id: T1.id } }, { resource: { type: 'core/group', id: G1 }, relation: 'member', subject: { type: 'core/user', id: M } }], on_duplicate: 'ignore' });
    const folders = ds.folders.filter((f) => f.tid === T1.id);
    const refF = refEvaluate({ tuples: ds.tuples, queries: folders.map((f) => ({ user: M, type: 'files/folder', id: f.id, permission: 'read' })), now: new Date() });
    const [F1, F2] = folders.filter((f, i) => refF[i] === false).slice(0, 2);
    await s.writeTuples(T1.id, { writes: [{ resource: { type: 'files/folder', id: F1.id }, relation: 'viewer', subject: { type: 'core/group', id: G1, relation: 'member' } }, { resource: { type: 'files/folder', id: F2.id }, relation: 'viewer', subject: { type: 'core/group', id: G2, relation: 'member' } }], on_duplicate: 'ignore' });
    const file1 = ds.files.find((f) => f.folder === F1.id).id, file2 = ds.files.find((f) => f.folder === F2.id).id;
    const ses = await s.login({ sub: M, tid: T1.id });
    const before = { f1: (await ses.call('GET', `/t/${T1.id}/files/${file1}`)).status, f2: (await ses.call('GET', `/t/${T1.id}/files/${file2}`)).status };
    await lc.moveGroup(M, T1.id, G1, G2);
    const after = { f1: (await ses.call('GET', `/t/${T1.id}/files/${file1}`)).status, f2: (await ses.call('GET', `/t/${T1.id}/files/${file2}`)).status };
    SC.S3 = { before, after, old_allow_after_move: ok2xx(after.f1) ? 1 : 0, new_allow_after_move: ok2xx(after.f2) };
  }
  log('S3 done');
  // ---------------- S4 multi-membership ----------------
  {
    const X = take(T1.id);
    await lc.addMembership(X, T3.id);
    const fA = ownFile(X, T1.id), fC = ds.files.find((f) => f.tid === T3.id).id;
    await s.writeTuples(T3.id, { writes: [{ resource: { type: 'files/file', id: fC }, relation: 'viewer', subject: { type: 'core/user', id: X } }], on_duplicate: 'ignore' });
    const sesA = await sessions(X, T1.id);
    const r = {};
    r.A_read = (await sesA.call('GET', `/t/${T1.id}/files/${fA}`)).status;
    r.A_session_on_C_route = (await sesA.call('GET', `/t/${T3.id}/files/${fC}`)).status;
    r.A_session_C_file_on_A_route = (await sesA.call('GET', `/t/${T1.id}/files/${fC}`)).status;
    // SSO reuse: same user agent (AS session for A) asks for the C context
    const ua = new UserAgent({ tls: s.tls }); const key = await newDpopKey();
    const cfg = { meta: s.asMeta, auth: { type: 'none', clientId: s.topo.clients.cli.clientId }, tls: s.tls, dpopKey: key, ua, redirectUri: s.topo.clients.cli.redirectUri, scope: 'openid offline_access files.read', resource: s.topo.audiences.api };
    await codeFlow({ ...cfg, login: { sub: X, tid: T1.id, amr: 'pwd,otp' } });
    const sso = await codeFlow({ ...cfg, login: { sub: X, tid: T3.id, amr: 'pwd,otp' } });
    const ssoCall = sso.tokens ? makeCliCaller(s, { tokens: sso.tokens, key }) : null;
    r.sso_reuse_C_route = ssoCall ? (await ssoCall('GET', `/t/${T3.id}/files/${fC}`)).status : 'no_token';
    // a fresh login for C works (positive)
    const sesC = await sessions(X, T3.id);
    r.fresh_C_search = (await sesC.call('GET', `/t/${T3.id}/files?limit=5`)).status;
    r.fresh_C_read = (await sesC.call('GET', `/t/${T3.id}/files/${fC}`)).status; // control: readable through the direct viewer tuple before removal
    // remove the C membership: C paths denied, A continues (MT-6)
    await lc.removeMembership(X, T3.id);
    await sleep(P.check_delay_ms);
    r.after_removal_C = await allPaths(X, T3.id, sesC, null, fC);
    r.after_removal_A_read = (await sesA.call('GET', `/t/${T1.id}/files/${fA}`)).status;
    r.after_removal_A_bff = (await sesA.bff.call('GET', `/t/${T1.id}/files/${fA}`)).status;
    SC.S4 = r;
  }
  log('S4 done');
  // ---------------- S5 leaver ----------------
  {
    const L = take(T1.id);
    const fL = ownFile(L, T1.id);
    // a delegated job of L (editor tuple so that a write job is acceptable)
    await s.writeTuples(T1.id, { writes: [{ resource: { type: 'files/file', id: fL }, relation: 'editor', subject: { type: 'core/user', id: L } }], on_duplicate: 'ignore' });
    const ses = await sessions(L, T1.id);
    const g = await s.req(`${s.topo.urls.asA}/admin/grant-of-token`, { body: { token: ses.cli.tokens.access_token } });
    const job = await jp.enqueue({ sub: L, tid: T1.id, gref: g.json().gref, fileId: fL, steps: 1 });
    const before = await allPaths(L, T1.id, await sessions(L, T1.id), job);
    const t0 = Date.now();
    await lc.transition(L, 'pending_deletion', { reason: 'leaver' });
    const tDone = Date.now();
    // probe the existing paths until every one is denied
    let tAllDenied = null; const probes = [];
    while (Date.now() - tDone < P.probe_max_ms) {
      const p = { t: Date.now() - tDone, bff: (await ses.bff.call('GET', `/t/${T1.id}/files/${fL}`)).status, cli: (await ses.call('GET', `/t/${T1.id}/files/${fL}`)).status };
      const t = await jp.txnToken(job.job_run_id, 'op.file.write'); p.job = t.error ? 'refused' : 'issued';
      probes.push(p);
      if (!ok2xx(p.bff) && !ok2xx(p.cli) && p.job === 'refused') { tAllDenied = Date.now(); break; }
      await sleep(P.probe_interval_ms);
    }
    await sleep(P.check_delay_ms);
    const after = await allPaths(L, T1.id, ses, job);
    SC.S5 = { before_any_allowed: before.any_allowed, after, leave_api_ms: tDone - t0, ms_leave_to_all_denied: tAllDenied ? tAllDenied - tDone : null, probes: probes.length, allowed_after_check_delay: after.any_allowed ? 1 : 0 };
  }
  log('S5 done');
  // ---------------- S6 state machine ----------------
  {
    const dev = [];
    const expect = async (label, p, wantOk) => { const r = await p; if (r.ok !== wantOk) dev.push({ label, got: r.ok, why: r.why }); return r; };
    const A = take(T1.id);
    await expect('active->pending (not allowed)', lc.transition(A, 'pending'), false);
    await expect('active->suspended (ADM)', lc.transition(A, 'suspended', { reason: 'ADM' }), true);
    await expect('add 2nd reason SEC', (async () => { lc.subjects.get(A).reasons.add('SEC'); return { ok: true }; })(), true);
    await expect('suspended->active with ADM cleared only (INV-8)', lc.transition(A, 'active', { reason: 'ADM' }), false);
    let loginWhileSuspended; try { loginWhileSuspended = (await s.login({ sub: A, tid: T1.id })).ok; } catch { loginWhileSuspended = false; }
    if (loginWhileSuspended) dev.push({ label: 'login while suspended', got: true });
    await expect('suspended->active with SEC cleared', lc.transition(A, 'active', { reason: 'SEC' }), true);
    const relog = await s.login({ sub: A, tid: T1.id });
    if (!relog.ok) dev.push({ label: 'login after resume', got: false });
    await expect('active->pending_deletion', lc.transition(A, 'pending_deletion', { reason: 'self' }), true);
    await expect('pending_deletion->active within grace (P-09)', lc.transition(A, 'active'), true);
    const B = take(T1.id);
    await expect('B active->pending_deletion', lc.transition(B, 'pending_deletion', { reason: 'self' }), true);
    await sleep(P.deletion_grace_ms + 200);
    await expect('pending_deletion->active after grace (not allowed)', lc.transition(B, 'active'), false);
    await expect('pending_deletion->deleted', lc.transition(B, 'deleted'), true);
    await expect('deleted->active (not allowed)', lc.transition(B, 'active'), false);
    let loginDeleted; try { loginDeleted = (await s.login({ sub: B, tid: T1.id })).ok; } catch { loginDeleted = false; }
    if (loginDeleted) dev.push({ label: 'login after deletion', got: true });
    SC.S6 = { deviations: dev };
  }
  log('S6 done');
  await sleep(500);
  await s.stop(); s = null;
  // ---------------- evaluation ----------------
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  const S1 = SC.S1, S2 = SC.S2, S3 = SC.S3, S4 = SC.S4, S5 = SC.S5;
  const smDev = SC.S6.deviations.length + (S1.pending_login_succeeded ? 1 : 0) + (S1.expired_pending_activation ? 1 : 0) + (S1.expired_pending_login_succeeded ? 1 : 0) + (S1.activation ? 0 : 1);
  const oldAllows = S3.old_allow_after_move + (S4.after_removal_C.any_allowed ? 1 : 0) + S5.allowed_after_check_delay;
  const ctxEntries = [S4.A_session_on_C_route, S4.A_session_C_file_on_A_route, S4.sso_reuse_C_route].filter((x) => ok2xx(x)).length;
  const invSucc = [S2.forwarded.accepted, S2.forwarded.W_login_T2, S2.reuse_same.accepted, S2.reuse_other.accepted, S2.expired.accepted, S2.expired.W_login_T2, S2.resent_old_token.accepted, S2.revoked.accepted, S2.revoked.W_login_T2, S2.non_admin_create.created].filter(Boolean).length;
  const crit = {
    state_machine_deviations: { value: smDev, pass: smDev === 0 },
    old_membership_allows: { value: oldAllows, pass: oldAllows === 0 && S3.new_allow_after_move && ok2xx(S4.after_removal_A_read) && ok2xx(S4.after_removal_A_bff), controls: { mover_new_group_allowed: S3.new_allow_after_move, other_membership_continues: [S4.after_removal_A_read, S4.after_removal_A_bff] } },
    other_tenant_context_entries: { value: ctxEntries, pass: ctxEntries === 0 && ok2xx(S4.A_read) && ok2xx(S4.fresh_C_search) && ok2xx(S4.fresh_C_read) },
    invitation_reuse_or_expired_success: { value: invSucc, pass: invSucc === 0 && S2.legit.accepted && S2.forwarded.why === 'addressee_mismatch_held' },
  };
  Object.assign(evalOut, { criteria: crit, verdict: Object.values(crit).every((c) => c.pass) ? '合格' : '不合格', recorded: { ms_leave_to_all_denied: S5.ms_leave_to_all_denied, leave_api_ms: S5.leave_api_ms }, transitions: lc.log.length,
    limitations: ['SSO 強制テナントの IdP 経由受諾（I-03 の後段）と RISC identifier-recycled（I-05）は系統 1 の AS に該当機能がなく対象外', '複数所属の MT-4（テナント B が SSO を強制）は上流 IdP 役が要るため TC-019 で扱う。本 TC は「A の AS session から B の文脈を得られない」ことを確かめた'] });
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  if (e.harnessCheck) { status = 'harness-check'; }
  else {
  status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack };
  evalOut.verdict = '中止';
  console.error(e.stack);
  }
} finally {
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, []); else run.writeJson('harness-check.json', { scenarios_completed: Object.keys(SC), abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
