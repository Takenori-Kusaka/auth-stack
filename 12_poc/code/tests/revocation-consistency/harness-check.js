// Pre-freeze harness check (test plan §2.5: smoke only, no pass/fail metrics). Starts the TC-008 stack,
// logs probe users in, grants / revokes and times single calls to size q and the trial durations.
//   node tests/revocation-consistency/harness-check.js [--openfga-cache 2s]
import { startStack } from '../../harness/stack.js';
import { openRun, datasetWithProbeUsers, monoMs, sleep } from './common.js';
import { args } from '../../lib/runtime.js';

const a = args();
const { run } = openRun('TC-008', { prefreeze: true, purpose: 'harness-check' });
const { ds, tenant, users } = datasetWithProbeUsers({ seed: 1, n: 3 });
const flags = a['openfga-cache'] ? ['--check-query-cache-enabled', '--check-query-cache-ttl', a['openfga-cache']] : [];
const t0 = monoMs();
const s = await startStack({ tc: 'TC-008', run, engine: 'openfga', dataset: ds, openfgaFlags: flags, env: a['sdk-cache'] ? Object.fromEntries(['file-service', 'tool-service'].map((n) => [n, { PEP_DECISION_CACHE_MS: a['sdk-cache'] }])) : {} });
console.log('stack up ms', Math.round(monoMs() - t0));
try {
  const tid = tenant.id;
  const file = ds.files.find((f) => f.tid === tid);
  const tool = ds.tools.find((t) => t.tid === tid);
  const proj = ds.projects.find((p) => p.id === tool.project);
  const [u1, u2, u3] = users;
  const T = (type, id, rel, uid) => ({ resource: { type, id }, relation: rel, subject: { type: 'core/user', id: uid } });
  let r = await s.writeTuples(tid, { writes: [T('files/file', file.id, 'viewer', u1), T('files/file', file.id, 'editor', u2), T('proj/project', proj.id, 'owner', u3)] });
  console.log('grant', r.status, r.text);
  const l1 = await s.login({ sub: u1, tid, amr: 'pwd,otp' });
  const l2 = await s.login({ sub: u2, tid, amr: 'pwd,otp' });
  const l3 = await s.login({ sub: u3, tid, amr: 'pwd,fido' });
  console.log('logins', l1.ok, l2.ok, l3.ok);
  for (const [name, fn] of [
    ['read', () => l1.call('GET', `/t/${tid}/files/${file.id}`)],
    ['write', () => l2.call('PUT', `/t/${tid}/files/${file.id}`, { content: 'x' })],
    ['config', () => l3.call('PUT', `/t/${tid}/tools/${tool.id}/config`, { config: { a: 1 } })],
  ]) {
    const lat = [];
    let last;
    for (let i = 0; i < 10; i++) { const t = monoMs(); last = await fn(); lat.push(monoMs() - t); }
    console.log(name, last.status, JSON.stringify(last.body).slice(0, 120), 'lat ms', lat.map((x) => Math.round(x)).join(' '));
  }
  const td = monoMs();
  r = await s.deleteTuples(tid, [T('files/file', file.id, 'viewer', u1)]);
  console.log('revoke', r.status, Math.round(monoMs() - td), 'ms');
  for (let i = 0; i < 30; i++) { const x = await l1.call('GET', `/t/${tid}/files/${file.id}`); process.stdout.write(`${x.status} `); await sleep(100); }
  console.log();
} finally {
  await s.stop();
  run.finish('completed');
}
