// TC-017 小規模負荷の p50/p99/p99.9（記録のみ、preregistered-test-plan.md §4.17）
//   node tests/engine-swap-perf-audit/TC-017.js
// Levels come from the frozen params (set from the pre-run TC-017-prerun.js). Open-loop arrivals, latency from the
// scheduled send time, all samples saved as CSV, failures counted. Host condition: CPU used by processes outside
// this TC's process tree during a level must stay within the frozen share (else that level is aborted / retried).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openRun, groupPortBase, writeEval, sleep, bootstrapCI, quantile } from './common.js';
import { openLoop, cpuSampler, processCpu, foreignCpuShare, summarize } from './lib/load.js';
import { CONDITIONS, dataset, queryPool, openStack, fgaTarget, makeFire, inprocCedar } from './lib/tc017-targets.js';

const TC = 'TC-017';
const { run, params } = openRun(TC, { seed: 17 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = dataset(params);
const pool = queryPool(ds, params.pool_size, params.seed);
const portBase = groupPortBase(TC);
const levels = params.levels; // { K1: [r25, r50, r75], ... }
const N = params.samples_per_level;
let status = 'completed';
const evalOut = { tc: TC, results: [], host_aborts: [] };
let s = null;
let abortTc = null;

function ownPids() { const set = new Set([process.pid]); if (s) for (const p of s.procs.procs.values()) set.add(p.child.pid); return set; }
const isTool = (name) => /^(powershell|conhost|WmiPrvSE)$/i.test(name || '');

async function measure(key, fire, levelName, rate, n, extra = {}) {
  for (let attempt = 0; attempt <= params.host_condition.max_retries_per_level; attempt++) {
    const before = processCpu();
    const cpu = cpuSampler(1000);
    const t0 = Date.now();
    const r = await openLoop({ rate, n, seed: `${key}:${levelName}:${attempt}`, fire });
    const wall = Date.now() - t0;
    const host = cpu.stop();
    const after = processCpu();
    const fshare = foreignCpuShare(before, new Map([...(after || new Map())].filter(([, v]) => !isTool(v.name))), ownPids(), wall);
    const csv = path.join(run.dir, 'samples', `${key}-${levelName}${attempt ? `-retry${attempt}` : ''}.csv`);
    fs.mkdirSync(path.dirname(csv), { recursive: true });
    fs.writeFileSync(csv, 'i,sched_ms,sent_ms,lat_ms,send_lag_ms,ok,status,err\n' + r.samples.map((x) => [x.i, x.sched_ms, x.sent_ms, x.lat_ms, x.send_lag_ms, x.ok ? 1 : 0, x.status ?? '', JSON.stringify(x.err ?? '')].join(',')).join('\n') + '\n');
    const sum = summarize(r.samples);
    const okLat = r.samples.filter((x) => x.ok).map((x) => x.lat_ms).sort((a, b) => a - b);
    const k = params.k_tail;
    const rec = {
      key, condition: CONDITIONS[key].label, level: levelName, rate_per_s: rate, n, attempt, started_at: r.t0_wall, wall_ms: wall, ...sum,
      p99_valid: n * 0.01 >= k, p999_valid: n * 0.001 >= k,
      p99_ci95: n * 0.01 >= k ? bootstrapCI(okLat, 0.99, { B: 500 }) : null,
      p999_ci95: n * 0.001 >= k ? bootstrapCI(okLat, 0.999, { B: 500 }) : null,
      host_cpu_util_mean: host.length ? host.reduce((a, x) => a + x.cpu_util, 0) / host.length : null,
      foreign_cpu: fshare, samples_csv: path.relative(run.dir, csv).split(path.sep).join('/'), csv_rows: r.samples.length, ...extra,
    };
    if (!rec.p999_valid) rec.p999 = '標本不足';
    if (!rec.p99_valid) rec.p99 = '標本不足';
    run.append('levels.jsonl', rec);
    const bad = fshare && fshare.share > params.host_condition.max_foreign_cpu_share;
    if (!bad) { evalOut.results.push(rec); log(`${key} ${levelName} ${rate}/s n=${n} p50=${sum.p50} p99=${rec.p99} p99.9=${rec.p999} failed=${sum.failed} foreign=${fshare?.share?.toFixed(2)}`); return rec; }
    evalOut.host_aborts.push({ key, level: levelName, attempt, foreign: fshare });
    log(`${key} ${levelName}: host condition violated (foreign ${fshare.share.toFixed(2)}), attempt ${attempt}`);
    if (attempt < params.host_condition.max_retries_per_level) await sleep(params.host_condition.retry_wait_s * 1000);
  }
  abortTc = { key, level: levelName };
  throw Object.assign(new Error(`host condition violated twice at ${key} ${levelName}`), { abort: 'TC-017 中止基準（ホストの他プロセスの負荷）' });
}

async function runLevels(key, fire) {
  const [r25, r50, r75] = levels[key];
  await measure(key, fire, 'L25', r25, N.L25);
  await measure(key, fire, 'L50', r50, N.L50);
  await measure(key, fire, 'L75', r75, N.L75);
}

try {
  if (!levels || typeof levels !== 'object') throw new Error('levels not frozen');
  const env0 = { cpus: os.cpus().length, cpu_model: os.cpus()[0]?.model, total_mem: os.totalmem() };
  run.writeJson('host.json', env0);
  // S1: OpenFGA without check cache -> K1, K2, L1
  s = await openStack('S1', { tc: TC, run, ds, portBase });
  let ctx = { s, fga: await fgaTarget(s), loginUsers: pool.map((q) => ({ user: q.user, tid: q.tid })) };
  await runLevels('K1', makeFire('fga', ctx, pool));
  await runLevels('K2', makeFire('facade', ctx, pool));
  await runLevels('L1', makeFire('login', ctx, pool));
  await s.stop(); s = null;
  // S2: OpenFGA with check cache -> K3, K4, K7 (cold)
  s = await openStack('S2', { tc: TC, run, ds, portBase });
  ctx = { s, fga: await fgaTarget(s) };
  await runLevels('K3', makeFire('fga', ctx, pool));
  await runLevels('K4', makeFire('facade', ctx, pool));
  await s.restart('openfga'); await s.restart('pdp');
  await measure('K7', makeFire('facade', ctx, pool), 'cold', levels.K4[1], params.cold.n, { cold: 'openfga と pdp の再起動直後から計測' });
  await s.stop(); s = null;
  // S3: Cedar via façade -> K6, K8 (cold)
  s = await openStack('S3', { tc: TC, run, ds, portBase });
  ctx = { s };
  await runLevels('K6', makeFire('facade', ctx, pool));
  await s.restart('pdp');
  await measure('K8', makeFire('facade', ctx, pool), 'cold', levels.K6[1], params.cold.n, { cold: 'pdp の再起動直後から計測（PIP スナップショット再読込み）' });
  await s.stop(); s = null;
  // K5: Cedar in-process
  const ced = await inprocCedar(ds);
  await runLevels('K5', makeFire('cedar-inproc', { cedar: ced }, pool));
  // cold first-k view
  for (const r of evalOut.results.filter((x) => x.cold)) {
    const rows = fs.readFileSync(path.join(run.dir, r.samples_csv), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
    const first = rows.slice(0, params.cold.report_first).filter((x) => x[5] === '1').map((x) => Number(x[3])).sort((a, b) => a - b);
    r.first_k = { k: params.cold.report_first, p50: quantile(first, 0.5), p99: quantile(first, 0.99), max: first[first.length - 1] };
  }
  // façade added latency (L50 p50 difference) and harness validity checks
  const at = (k, l) => evalOut.results.find((x) => x.key === k && x.level === l);
  evalOut.facade_added_ms_p50_L50 = { openfga_nocache: at('K2', 'L50') && at('K1', 'L50') ? at('K2', 'L50').p50 - at('K1', 'L50').p50 : null, openfga_cache: at('K4', 'L50') && at('K3', 'L50') ? at('K4', 'L50').p50 - at('K3', 'L50').p50 : null, cedar: at('K6', 'L50') && at('K5', 'L50') ? at('K6', 'L50').p50 - at('K5', 'L50').p50 : null, note: 'façade は G 段の所属確認と R 段の 2 回 engine を呼ぶ。直接 Check は R 段の 1 回だけ。各水準の到着率は条件ごとに異なる' };
  const validity = evalOut.results.map((r) => ({ key: r.key, level: r.level, all_samples_saved: r.csv_rows === r.n, latency_from_schedule: true, failures_counted: typeof r.failed === 'number' }));
  evalOut.harness_validity = { ok: validity.every((v) => v.all_samples_saved && v.failures_counted), rows: validity };
  evalOut.verdict = '判定保留';
  evalOut.note = '合否を置かない TC（記録のみ）。系統 1 の遅延は相対比較にだけ使う（NA-POC-1）。tail は実測範囲外へ外挿しない（ARC-13 §9.2）';
} catch (e) {
  status = e.abort ? 'aborted:TC-017-host-load' : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, at: abortTc, stack: e.stack };
  evalOut.verdict = '中止';
  console.error(e.stack);
} finally {
  if (s) await s.stop();
  writeEval(run, evalOut, ['levels.jsonl', 'host.json']);
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
