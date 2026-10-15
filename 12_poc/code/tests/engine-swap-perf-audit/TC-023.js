// TC-023 非同期・委任ジョブの再認可（preregistered-test-plan.md §4.23）
//   node tests/engine-swap-perf-audit/TC-023.js
import fs from 'node:fs';
import path from 'node:path';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { seededRng } from '../../lib/ids.js';
import { openRun, groupPortBase, writeEval, sleep } from './common.js';
import { refEvaluate } from './lib/helpers.js';
import { JobPlatform } from './lib/jobs.js';

const TC = 'TC-023';
const { run, params } = openRun(TC, { seed: 23 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
let status = 'completed';
const evalOut = { tc: TC, scenarios: {} };
let s = null;
const userTokens = [];

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: groupPortBase(TC) });
  const jp = new JobPlatform({ s, dir: path.join(run.dir, 'jobs') });
  const T = ds.tenants[0];
  const members = ds.users.filter((u) => u.memberships.length === 1 && u.memberships[0].tid === T.id && u.memberships[0].kind === 'member');
  const files = ds.files.filter((f) => f.tid === T.id);
  // pick (user, file) pairs where the user has no write by default (so that the explicit editor tuple is the only path)
  const q = []; for (const u of members) for (const f of files.slice(0, 30)) q.push({ user: u.id, type: 'files/file', id: f.id, permission: 'write' });
  const ref = refEvaluate({ tuples: ds.tuples, queries: q, now: new Date() });
  const free = q.filter((x, i) => ref[i] === false);
  const used = new Set();
  const nextPair = () => { const p = free.find((x) => !used.has(x.user)); used.add(p.user); return { user: p.user, file: p.id }; };
  const editor = (u, f) => ({ resource: { type: 'files/file', id: f }, relation: 'editor', subject: { type: 'core/user', id: u } });
  async function prepare() {
    const { user, file } = nextPair();
    const w = await s.writeTuples(T.id, { writes: [editor(user, file)], on_duplicate: 'ignore' });
    const cli = await s.loginCli({ sub: user, tid: T.id });
    userTokens.push(cli.tokens.access_token, cli.tokens.refresh_token);
    const g = await s.req(`${s.topo.urls.asA}/admin/grant-of-token`, { body: { token: cli.tokens.access_token } });
    return { user, file, grantId: g.json().grantId, gref: g.json().gref, grant_status: w.status };
  }
  const now = () => Date.now();
  const sc = evalOut.scenarios;
  const violations = (out, tRev, bound) => out.filter((r) => r.t_auth_start > tRev + bound && r.executed).length;
  const summarizeRun = (r, tRev, bound) => {
    const after = r.out.filter((x) => x.t_auth_start > tRev);
    const firstDenied = r.out.find((x) => x.t_auth_start > tRev && !x.executed && !x.unavailable);
    const lastExec = [...r.out].reverse().find((x) => x.executed);
    return { final: r.final, steps: r.out.length, executed: r.out.filter((x) => x.executed).length, executed_after_revocation_any: after.filter((x) => x.executed).length, violations_beyond_bound: tRev ? violations(r.out, tRev, bound) : 0, ms_revocation_to_first_denial: firstDenied ? firstDenied.t_auth_start - tRev : null, ms_last_exec_after_revocation: lastExec && lastExec.t_auth_start > tRev ? lastExec.t_auth_start - tRev : null, first_denial_reason: firstDenied?.reason };
  };
  const PB = params.propagation_bound_ms;
  const I = params.step_interval_ms;
  // ---- P0 ----
  { const p = await prepare(); const e = await jp.enqueue({ sub: p.user, tid: T.id, gref: p.gref, fileId: p.file, steps: 5 }); const r = await jp.runMessage(e.file, { intervalMs: I }); sc.P0 = { accepted: e.accepted, ...summarizeRun(r, Infinity, 0) }; if (sc.P0.executed !== 5) { const er = new Error(`positive control executed ${sc.P0.executed}/5`); er.abort = 'C-3'; throw er; } }
  log('P0 ok');
  // ---- J1a ----
  { const p = await prepare(); const e = await jp.enqueue({ sub: p.user, tid: T.id, gref: p.gref, fileId: p.file, steps: 5 }); const d = await s.deleteTuples(T.id, [editor(p.user, p.file)]); const tRev = now(); run.append('inject.jsonl', { scenario: 'J1a', event: 'relation_revoked', status: d.status }); await sleep(1000); const r = await jp.runMessage(e.file, { intervalMs: I }); sc.J1a = { accepted: e.accepted, revoke_status: d.status, ...summarizeRun(r, tRev, PB.relation_revocation) }; }
  // ---- J1b ----
  { const p = await prepare(); const e = await jp.enqueue({ sub: p.user, tid: T.id, gref: p.gref, fileId: p.file, steps: 5 }); const d = await s.req(`${s.topo.urls.asA}/admin/revoke-grant`, { body: { grantId: p.grantId } }); const tRev = now(); run.append('inject.jsonl', { scenario: 'J1b', event: 'delegation_grant_revoked', status: d.status }); await sleep(1000); const r = await jp.runMessage(e.file, { intervalMs: I }); sc.J1b = { accepted: e.accepted, revoke_status: d.status, ...summarizeRun(r, tRev, PB.state_store_events) }; }
  log('J1 done');
  // ---- J2 / J3 / J3b (mid-run) ----
  async function midRun(name, act, bound) {
    const p = await prepare();
    const e = await jp.enqueue({ sub: p.user, tid: T.id, gref: p.gref, fileId: p.file, steps: 20 });
    let tRev = Infinity, actStatus;
    const r = await jp.runMessage(e.file, { intervalMs: I, onStep: async (x, k) => { if (k === 4 && tRev === Infinity) { actStatus = await act(p); tRev = now(); run.append('inject.jsonl', { scenario: name, event: 'revoked_mid_run', status: actStatus }); } } });
    return { accepted: e.accepted, act_status: actStatus, ...summarizeRun(r, tRev, bound), user: p.user };
  }
  sc.J2 = await midRun('J2', async (p) => (await s.deleteTuples(T.id, [editor(p.user, p.file)])).status, PB.relation_revocation);
  sc.J3 = await midRun('J3', async () => (await s.setStatus('tenant', T.id, 'suspended')).status, PB.state_store_events);
  await s.setStatus('tenant', T.id, 'active'); await sleep(800);
  let ttsAfterSuspend = null;
  sc.J3b = await midRun('J3b', async (p) => { await s.req(`${s.topo.urls.asA}/admin/user-status`, { body: { sub: p.user, status: 'suspended' } }); return (await s.setStatus('subject', p.user, 'suspended')).status; }, PB.state_store_events);
  { // after suspension the TTS must not issue for that user's runs
    const led = [...jp.ledger.values()].filter((x) => x.sub === sc.J3b.user);
    await sleep(600);
    const t = await jp.txnToken(led[0].job_run_id, led[0].op);
    ttsAfterSuspend = { issued: !t.error, error: t.error };
    sc.J3b.tts_after_suspension = ttsAfterSuspend;
  }
  log('mid-run done');
  // ---- J4 tamper ----
  {
    const p1 = await prepare(), p2 = await prepare();
    const e1 = await jp.enqueue({ sub: p1.user, tid: T.id, gref: p1.gref, fileId: p1.file, steps: 1 });
    const e2 = await jp.enqueue({ sub: p2.user, tid: T.id, gref: p2.gref, fileId: p2.file, steps: 1 });
    const other = ds.tenants[1].id;
    const otherFile = files.find((f) => f.id !== p1.file).id;
    const base = JSON.parse(fs.readFileSync(e1.file, 'utf8'));
    const cases = [
      ['tid_rewritten', { ...base, tid: other }],
      ['sub_rewritten', { ...base, sub: p2.user }],
      ['job_run_id_swapped', { ...base, job_run_id: e2.job_run_id }],
      ['params_rewritten', { ...base, params: { ...base.params, file_id: otherFile } }],
      ['unknown_job_run_id', { ...base, job_run_id: 'acc_' + 'x'.repeat(26) }],
    ];
    const res = [];
    for (const [name, m] of cases) { const f = jp.inject(m, name); const r = await jp.runMessage(f, { intervalMs: 50 }); res.push({ name, final: r.final, executed: r.out.filter((x) => x.executed).length, reason: r.out[0]?.reason }); run.append('inject.jsonl', { scenario: 'J4', event: 'tampered_message', name }); }
    // the untampered originals still run (control)
    const c1 = await jp.runMessage(e1.file, { intervalMs: 50 }), c2 = await jp.runMessage(e2.file, { intervalMs: 50 });
    sc.J4 = { cases: res, accepted: res.filter((x) => x.executed > 0).length, controls_executed: [c1.final, c2.final] };
  }
  log('J4 done');
  // ---- J6 / J7 outages ----
  async function outage(name, proc) {
    const p = await prepare();
    const e = await jp.enqueue({ sub: p.user, tid: T.id, gref: p.gref, fileId: p.file, steps: 6 });
    let tDown = null, tUp = null;
    const r = await jp.runMessage(e.file, { intervalMs: I, maxWaitMs: 15_000, onStep: async (x, k) => {
      if (k === 1 && x.executed && tDown === null) { await s.kill(proc); tDown = now(); run.append('inject.jsonl', { scenario: name, event: `${proc}_killed` }); setTimeout(async () => { await s.start(proc); tUp = now(); run.append('inject.jsonl', { scenario: name, event: `${proc}_restarted` }); }, 2000); }
    } });
    const during = r.out.filter((x) => tDown && x.t_auth_start >= tDown && (tUp === null || x.t_auth_start < tUp - 50));
    return { final: r.final, steps_attempted: r.out.length, executed_total: r.out.filter((x) => x.executed).length, attempts_during_outage: during.length, executed_during_outage: during.filter((x) => x.executed).length, waiting_reasons: [...new Set(during.map((x) => x.reason))] };
  }
  sc.J6 = await outage('J6', 'pdp');
  await sleep(1000);
  sc.J7 = await outage('J7', 'sts');
  log('outages done');
  await sleep(500);
  await s.stop(); s = null;
  // ---- J5 token scan (after everything) ----
  const jwtRe = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/;
  let hits = 0; const hitFiles = [];
  const scan = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) scan(p); else { const t = fs.readFileSync(p, 'utf8'); if (jwtRe.test(t) || userTokens.some((tok) => tok && t.includes(tok))) { hits++; hitFiles.push(path.relative(run.dir, p)); } } } };
  scan(path.join(run.dir, 'jobs'));
  sc.J5 = { scanned: 'jobs/（queue pending・done・dlq、job-ledger、job-events、job-output）', token_hits: hits, files: hitFiles };
  // ---- evaluation ----
  const rev = ['J1a', 'J1b', 'J2', 'J3', 'J3b'];
  const allowAfter = rev.reduce((a, k) => a + (k.startsWith('J1') ? sc[k].executed : sc[k].violations_beyond_bound), 0);
  const crit = {
    allow_after_revocation: { value: allowAfter, pass: allowAfter === 0 && sc.J3b.tts_after_suspension.issued === false },
    steps_executed_after_revocation: { value: allowAfter, pass: allowAfter === 0 },
    tamper_accepted: { value: sc.J4.accepted, pass: sc.J4.accepted === 0 && sc.J4.controls_executed.every((x) => x === 'done') },
    tokens_detected: { value: sc.J5.token_hits, pass: sc.J5.token_hits === 0 },
    fail_open: { value: sc.J6.executed_during_outage + sc.J7.executed_during_outage, pass: sc.J6.executed_during_outage + sc.J7.executed_during_outage === 0 && sc.J6.attempts_during_outage > 0 && sc.J7.attempts_during_outage > 0 },
  };
  Object.assign(evalOut, {
    criteria: crit, verdict: Object.values(crit).every((c) => c.pass) ? '合格' : '不合格',
    recorded: { I_job_ms: I, revocation_to_first_denial_ms: Object.fromEntries(['J2', 'J3', 'J3b'].map((k) => [k, sc[k].ms_revocation_to_first_denial])), last_execution_after_revocation_ms: Object.fromEntries(['J2', 'J3', 'J3b'].map((k) => [k, sc[k].ms_last_exec_after_revocation])) },
    limitations: ['façade は actor（実行主体）の権限・停止状態を判定しない（D26-04a の actor 判定は PoC の範囲外。subject の現在の権限と G 段だけで判定）', '委任 grant は AS の grant（gref）で代用し、ジョブ定義 ID・許可する実行主体の項目は持たない'],
  });
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack };
  evalOut.verdict = '中止';
  console.error(e.stack);
} finally {
  if (s) await s.stop();
  writeEval(run, evalOut, ['inject.jsonl', 'jobs/job-events.jsonl', 'jobs/job-ledger.jsonl']);
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
