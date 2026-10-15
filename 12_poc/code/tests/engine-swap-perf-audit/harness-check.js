// Pre-freeze harness check for this group's port blocks (§2.5: smoke only; no pass/fail metrics).
//   node tests/engine-swap-perf-audit/harness-check.js [--engine openfga|cedar] [--tc TC-013]
import { Run } from '../../harness/run.js';
import { startStack } from '../../harness/stack.js';
import { args } from '../../lib/runtime.js';
import { GROUP, groupPortBase } from './common.js';

const a = args();
const engine = a.engine || 'openfga';
const tc = a.tc || 'TC-013';
const run = new Run({ tc: `${GROUP}/harness-check`, purpose: `harness-check-${engine}-${tc}`, seed: 1 });
const t0 = Date.now();
let s;
try {
  s = await startStack({ tc, run, engine, profile: 'smoke', seed: 1, portBase: groupPortBase(tc) });
  const t1 = Date.now();
  const ds = s.dataset;
  const tA = ds.tenants[0];
  const file = ds.files.find((f) => f.tid === tA.id);
  const u = await s.login({ sub: file.owner, tid: tA.id });
  const r = await u.call('GET', `/t/${tA.id}/files/${file.id}`);
  console.log(JSON.stringify({ engine, startup_ms: t1 - t0, login_ok: u.ok, read_status: r.status }));
} catch (e) { console.error(e.stack); }
finally { if (s) await s.stop(); run.finish('completed', { engine }); console.log('total_ms', Date.now() - t0, run.dir); }
