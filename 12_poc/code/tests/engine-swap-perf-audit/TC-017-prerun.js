// TC-017 予行（§2.5「試行回数を決めるための所要時間の見積り」、§4.17 手順「到着率の水準は飽和点の手前までを予行で決めて凍結」）.
// Ramps the open-loop arrival rate per condition and records only whether the generator/target kept up
// (all requests completed within the window + 2 s, no failures). Latency quantiles are NOT computed (§4.17).
//   node tests/engine-swap-perf-audit/TC-017-prerun.js
import { Run } from '../../harness/run.js';
import { GROUP, groupPortBase, sleep } from './common.js';
import { openLoop } from './lib/load.js';
import { CONDITIONS, dataset, queryPool, openStack, fgaTarget, makeFire, inprocCedar } from './lib/tc017-targets.js';
import fs from 'node:fs';
import path from 'node:path';

const params = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'params', 'TC-017.json'), 'utf8'));
const run = new Run({ tc: `${GROUP}/TC-017`, purpose: 'prerun-rate-estimation (§2.5, latency not aggregated)', seed: params.seed });
const ds = dataset(params);
const pool = queryPool(ds, params.pool_size, params.seed);
const portBase = groupPortBase('TC-017');
const ramp = params.prerun.check_rates;
const rampLogin = params.prerun.login_rates;
const result = {};
async function rampOne(key, fire, rates, secs) {
  const out = [];
  for (const rate of rates) {
    const n = Math.max(20, Math.round(rate * secs));
    const t = Date.now();
    const r = await openLoop({ rate, n, seed: 999, fire });
    const failed = r.samples.filter((x) => !x.ok).length;
    const kept = r.duration_ms <= (n / rate) * 1000 + 2000;
    out.push({ rate, n, failed, kept_up: kept && failed === 0, wall_ms: Date.now() - t });
    run.append('prerun.jsonl', { key, rate, n, failed, kept_up: kept && failed === 0 });
    console.log(key, rate, failed, kept && failed === 0);
    if (!(kept && failed === 0)) break;
    await sleep(500);
  }
  const ok = out.filter((x) => x.kept_up).map((x) => x.rate);
  result[key] = { steps: out, highest_kept_rate: ok.length ? Math.max(...ok) : 0 };
}
try {
  let s = await openStack('S1', { tc: 'TC-017', run, ds, portBase });
  const ctx = { s, fga: await fgaTarget(s), loginUsers: pool.map((q) => ({ user: q.user, tid: q.tid })) };
  await rampOne('K1', makeFire('fga', ctx, pool), ramp, params.prerun.secs);
  await rampOne('K2', makeFire('facade', ctx, pool), ramp, params.prerun.secs);
  await rampOne('L1', makeFire('login', ctx, pool), rampLogin, params.prerun.login_secs);
  await s.stop();
  s = await openStack('S2', { tc: 'TC-017', run, ds, portBase });
  const ctx2 = { s, fga: await fgaTarget(s) };
  await rampOne('K3', makeFire('fga', ctx2, pool), ramp, params.prerun.secs);
  await rampOne('K4', makeFire('facade', ctx2, pool), ramp, params.prerun.secs);
  await s.stop();
  s = await openStack('S3', { tc: 'TC-017', run, ds, portBase });
  await rampOne('K6', makeFire('facade', { s }, pool), ramp, params.prerun.secs);
  await s.stop();
  const ced = await inprocCedar(ds);
  await rampOne('K5', makeFire('cedar-inproc', { cedar: ced }, pool), ramp, params.prerun.secs);
} catch (e) { console.error(e.stack); run.append('prerun.jsonl', { error: e.message }); }
run.writeJson('prerun-result.json', result);
run.finish('completed', { purpose: 'prerun' });
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.highest_kept_rate]))), run.dir);
