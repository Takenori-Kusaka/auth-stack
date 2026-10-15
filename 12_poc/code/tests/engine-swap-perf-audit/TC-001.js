// TC-001 時計・probe・測定器の較正（preregistered-test-plan.md §4.1）
//   node tests/engine-swap-perf-audit/TC-001.js
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { ProcGroup } from '../../harness/proc.js';
import { createTopology } from '../../lib/topology.js';
import { request } from '../../lib/http.js';
import { openRun, groupPortBase, writeEval, sleep, HERE } from './common.js';
import { cpuSampler } from './lib/load.js';

const TC = 'TC-001';
const { run, params } = openRun(TC, { seed: 1 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const base = groupPortBase(TC);
const wallHr = () => performance.timeOrigin + performance.now();
const qs = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1))] : null; };
const stats = (arr) => ({ n: arr.length, min: qs(arr, 0), p50: qs(arr, 0.5), p99: qs(arr, 0.99), max: qs(arr, 1) });
let status = 'completed';
const evalOut = { tc: TC };
const pg = new ProcGroup({ logDir: path.join(run.dir, 'logs') });
const cpu = cpuSampler(1000);

async function rep(k) {
  const out = { rep: k };
  // (1) clocks of K processes vs the harness
  const procs = [];
  for (let i = 0; i < params.clock.processes; i++) procs.push(base + 1 + i);
  const clock = [];
  for (const port of procs) {
    const offs = [], offsMs = [], rtts = [];
    for (let j = 0; j < params.clock.exchanges_per_process; j++) {
      const t1 = wallHr();
      const r = await request(`http://127.0.0.1:${port}/`);
      const t2 = wallHr();
      const j2 = r.json();
      offs.push(j2.wall_hr - (t1 + t2) / 2);
      offsMs.push(j2.wall_ms - (t1 + t2) / 2);
      rtts.push(t2 - t1);
      run.append('clock.jsonl', { rep: k, port, t1, t2, child_wall_hr: j2.wall_hr, child_wall_ms: j2.wall_ms });
    }
    clock.push({ port, offset_hr_ms: stats(offs.map(Math.abs)), offset_datenow_ms: stats(offsMs.map(Math.abs)), rtt_ms: stats(rtts), bound_rtt_half_ms: stats(rtts.map((x) => x / 2)) });
  }
  out.clock = clock;
  // (2) known delay through the injection proxy
  const ctl = path.join(topo.secretsDir, 'inject-inj-cal.json');
  const delay = [];
  let passMedian = null;
  for (const ms of params.delay_injection.levels_ms) {
    fs.writeFileSync(ctl, JSON.stringify(ms === 0 ? { mode: 'pass' } : { mode: 'delay', ms, keepExisting: true }));
    run.append('inject.jsonl', { rep: k, mode: ms === 0 ? 'pass' : 'delay', ms });
    await sleep(200); // proxy polls its control file every 50 ms
    const lat = [];
    for (let j = 0; j < params.delay_injection.samples_per_level; j++) {
      const t1 = performance.now();
      await request(`http://127.0.0.1:${base + 10}/`);
      lat.push(performance.now() - t1);
    }
    if (ms === 0) passMedian = qs(lat, 0.5);
    const err = lat.map((x) => x - ms - passMedian);
    delay.push({ injected_ms: ms, measured_ms: stats(lat), error_ms: stats(err), abs_error_ms: stats(err.map(Math.abs)) });
    fs.appendFileSync(run.file(`delay-samples-rep${k}.csv`), lat.map((x, j) => `${k},${ms},${j},${x.toFixed(4)}`).join('\n') + '\n');
  }
  out.delay = delay;
  out.epsilon_inject_abs_p99_ms = Math.max(...delay.filter((d) => d.injected_ms > 0).map((d) => d.abs_error_ms.p99));
  // (3) probe interval q candidates
  const probe = [];
  for (const q of params.probe.q_candidates_ms) {
    const n = Math.min(200, Math.ceil(10000 / q));
    const ts = [];
    await new Promise((resolve) => { let c = 0; const f = () => { ts.push(performance.now()); if (++c > n) return resolve(); setTimeout(f, q); }; setTimeout(f, q); });
    const iv = ts.slice(1).map((t, i) => t - ts[i]);
    probe.push({ q_ms: q, intervals_ms: stats(iv), overshoot_ms: stats(iv.map((x) => x - q)) });
  }
  out.probe = probe;
  // (4) log write latency
  const lf = run.file(`logwrite-rep${k}.jsonl`);
  const lw = [];
  const line = JSON.stringify({ t: new Date().toISOString(), svc: 'calibration', ep: 'x', result: 'permitted', decision_id: 'a'.repeat(26), request_id: 'b'.repeat(26), pad: 'c'.repeat(60) }) + '\n';
  for (let j = 0; j < params.log_write.lines; j++) { const t1 = performance.now(); fs.appendFileSync(lf, line); lw.push(performance.now() - t1); }
  out.log_write_ms = stats(lw);
  return out;
}

let topo;
try {
  topo = await createTopology({ tc: TC, portBase: base, runId: run.runId, dataDir: run.dir });
  const topoFile = path.join(topo.secretsDir, 'topology.json');
  const mono0 = process.hrtime.bigint(); const wall0 = Date.now();
  for (let i = 0; i < params.clock.processes; i++) await pg.start(`clock-echo-${i}`, process.execPath, [path.join(HERE, 'lib', 'clock-echo.js'), String(base + 1 + i)], { ready: { line: /READY / } });
  await pg.start('inj-cal', process.execPath, [path.join(HERE, '..', '..', 'inject', 'proxy.js'), '--topology', topoFile, '--name', 'inj-cal', '--listen', String(base + 10), '--upstream', `127.0.0.1:${base + 1}`, '--mode', 'http'], { ready: { line: /READY / } });
  const reps = [];
  for (let k = 1; k <= params.repetitions; k++) { log(`rep ${k}`); reps.push(await rep(k)); }
  const monoMs = Number(process.hrtime.bigint() - mono0) / 1e6, wallMs = Date.now() - wall0;
  const cpuSamples = cpu.stop();
  // stability rule (abort)
  const a = reps[0], b = reps[1];
  const ratio = (x, y) => Math.max(x, y) / Math.max(1e-9, Math.min(x, y));
  const injP99 = [a.epsilon_inject_abs_p99_ms, b.epsilon_inject_abs_p99_ms];
  const clkP99 = [Math.max(...a.clock.map((c) => c.bound_rtt_half_ms.p99)), Math.max(...b.clock.map((c) => c.bound_rtt_half_ms.p99))];
  const unstable = (ratio(...injP99) > 2 && Math.abs(injP99[0] - injP99[1]) > 2) || (ratio(...clkP99) > 2 && Math.abs(clkP99[0] - clkP99[1]) > 1);
  const eps = Math.max(...injP99, ...reps.flatMap((r) => r.clock.map((c) => Math.max(c.bound_rtt_half_ms.p99, c.offset_datenow_ms.p99))));
  const calib = {
    measured_at: new Date().toISOString(), host_cpu_util_mean: cpuSamples.length ? cpuSamples.reduce((s, x) => s + x.cpu_util, 0) / cpuSamples.length : null,
    epsilon_ms: { definition: 'max(注入遅延の |誤差| の p99、時計 offset の上限 rtt/2 の p99、Date.now() 基準の |offset| の p99)（2 反復の最大）', value: eps, inject_abs_p99_by_rep: injP99, clock_bound_p99_by_rep: clkP99 },
    timestamp_resolution_ms: { components_wall_clock: 1, note: '部品の記録は new Date().toISOString()（ミリ秒）' },
    mono_vs_wall_drift_ms: { mono_ms: monoMs, wall_ms: wallMs, diff_ms: wallMs - monoMs },
    probe_effective: reps.map((r) => r.probe),
    eps_plus_q_ms: params.probe.q_candidates_ms.map((q) => ({ q_ms: q, eps_plus_q_ms: eps + q, overshoot_p99_ms: Math.max(...reps.map((r) => r.probe.find((p) => p.q_ms === q).overshoot_ms.p99)) })),
    log_write_ms: reps.map((r) => r.log_write_ms),
    reference_ratios: Object.fromEntries([[200, 'revocationPollMs'], [5000, 'M_rev']].map(([u, n]) => [n, params.probe.q_candidates_ms.map((q) => ({ q_ms: q, ratio: (eps + q) / u }))])),
  };
  run.writeJson('calib.json', calib);
  run.writeJson('reps.json', reps);
  if (unstable) { status = 'aborted:TC-001-unstable'; evalOut.abort = { code: 'TC-001 中止基準', reason: 'ε の分布が反復間で大きく変わった', injP99, clkP99 }; }
  Object.assign(evalOut, { verdict: unstable ? '中止' : '判定保留', note: '合否基準の比率が TBD（所有者 SRE 責任者）のため値の記録のみ', stability: { unstable, injP99, clkP99 }, calib });
  writeEval(run, evalOut, ['calib.json', 'reps.json', 'clock.jsonl', 'inject.jsonl']);
  log(`epsilon ${eps.toFixed(3)} ms; unstable=${unstable}`);
} catch (e) {
  status = 'aborted:harness_error';
  evalOut.abort = { code: 'harness_error', reason: e.message, stack: e.stack };
  writeEval(run, { ...evalOut, verdict: '中止' });
  console.error(e.stack);
} finally {
  await pg.stopAll();
  const meta = run.finish(status, { verdict: evalOut.verdict || '中止' });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
