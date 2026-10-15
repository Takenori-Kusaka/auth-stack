// Smoke test (harness check only, test plan §2.5: no pass/fail metrics, data under 12_poc/data/_prefreeze/smoke/).
// Path: login (BFF: PAR + PKCE + private_key_jwt + cert-bound opaque AT) -> edge (introspection) -> STS exchange
// (internal at+jwt) -> file-service PEP (V1–V14, L0) -> PDP façade (G 段 + engine) -> file read.
// Also: 3-hop tool.run (edge -> tool-service -> STS re-exchange -> file-service, Txn-Token), audit verification.
//   node smoke/smoke.js [--engine openfga|cedar]
import fs from 'node:fs';
import path from 'node:path';
import { Run } from '../harness/run.js';
import { startStack } from '../harness/stack.js';
import { verifyRun } from '../audit/verify.js';
import { args } from '../lib/runtime.js';

const a = args();
const engine = a.engine || process.env.PDP_ENGINE || 'openfga';
const run = new Run({ tc: 'smoke', purpose: `smoke-${engine}`, seed: 1 });
const steps = [];
const step = (name, ok, detail = {}) => { steps.push({ name, ok, ...detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail.note ? ' — ' + detail.note : ''}`); run.append('requests.jsonl', { step: name, ok, ...detail }); };
let s;
let status = 'completed';
try {
  s = await startStack({ tc: 'smoke', run, engine, profile: 'smoke', seed: 1 });
  step('stack started', true, { note: `engine=${engine} ports=${s.topo.ports.asA}..${s.topo.ports.harness}` });
  const ds = s.dataset;
  const [tA, tB] = ds.tenants;
  // a file in tenant A and its owner (owner can read, folder chain grants nothing extra needed)
  const file = ds.files.find((f) => f.tid === tA.id);
  const owner = file.owner;
  // 1. login via BFF
  const u = await s.login({ sub: owner, tid: tA.id, amr: 'pwd,otp' });
  step('login via BFF (PAR+PKCE+private_key_jwt, cert-bound opaque AT)', u.ok, { status: u.status });
  // 2. file read through edge -> STS -> PEP -> PDP
  const r = await u.call('GET', `/t/${tA.id}/files/${file.id}`);
  step('file read (edge -> STS exchange -> PEP -> PDP façade -> file-service)', r.status === 200 && r.body.content === file.content && !!r.body.decision_id, { status: r.status, decision_id: r.body?.decision_id });
  // 3. the same file through the other tenant's path / from another tenant's user must be denied (sanity only)
  const other = ds.users.find((x) => x.memberships.length === 1 && x.memberships[0].tid === tB.id);
  const u2 = await s.login({ sub: other.id, tid: tB.id, amr: 'pwd,otp' });
  const r2 = await u2.call('GET', `/t/${tA.id}/files/${file.id}`);
  const r3 = await u2.call('GET', `/t/${tB.id}/files/${file.id}`);
  step('cross-tenant read denied (sanity)', r2.status === 404 && r3.status === 404, { status_route_a: r2.status, status_route_b: r3.status });
  // 4. 3-hop tool.run (write tier -> Txn-Token): make the tool operator a viewer of the file in the same tenant
  const tool = ds.tools.find((t) => t.tid === tA.id);
  const operatorTuple = ds.tuples.find((t) => t.resource.type === 'proj/tool_instance' && t.resource.id === tool.id && t.relation === 'operator');
  const operator = operatorTuple.subject.id;
  const wr = await s.writeTuples(tA.id, { writes: [{ resource: { type: 'files/file', id: file.id }, relation: 'viewer', subject: { type: 'core/user', id: operator } }], on_duplicate: 'ignore' });
  step('test setup: grant operator viewer on file', wr.status === 200, { status: wr.status });
  const u3 = await s.login({ sub: operator, tid: tA.id, amr: 'pwd,otp' });
  const r4 = await u3.call('POST', `/t/${tA.id}/tools/${tool.id}/run`, { file_id: file.id, with_labels: true });
  step('tool.run 3-service chain A->B->C (edge -> tool-service -> file-service -> label-service; STS re-exchange per hop, act nesting, one Txn-Token)', r4.status === 200 && !!r4.body.downstream_decision_id && !!r4.body.label_decision_id, { status: r4.status, decision_id: r4.body?.decision_id, downstream_decision_id: r4.body?.downstream_decision_id, label_decision_id: r4.body?.label_decision_id });
  // 5. CLI client (public, DPoP-bound) read
  const cli = await s.loginCli({ sub: owner, tid: tA.id, amr: 'pwd,otp' });
  const r5 = cli.ok ? await cli.call('GET', `/t/${tA.id}/files/${file.id}`) : { status: 0 };
  step('public CLI client with DPoP (nonce) read', r5.status === 200, { status: r5.status, err: cli.error });
  // give async audit delivery a moment, then stop components so all files are flushed
  await new Promise((ok) => setTimeout(ok, 1500));
} catch (e) {
  status = 'aborted:harness_error';
  step('exception', false, { note: e.message, stack: e.stack });
} finally {
  if (s) await s.stop();
}
// 6. audit verification and reconstruction
try {
  const v = verifyRun(run.dir);
  fs.writeFileSync(path.join(run.dir, 'audit-verify.json'), JSON.stringify(v, null, 2));
  const tr = v.txns.find((t) => t.hops.length >= 3);
  step('audit chain + reconstruction', v.summary.ok, { note: `records=${v.summary.journal_records} invalid=${v.summary.invalid_records} txn_groups=${v.summary.reconstruction.txn_groups} findings=${v.summary.findings.length}` });
  step('3-hop (A->B->C) txn reconstructed from audit only', !!tr && tr.consistent, { hops: tr ? tr.hops.map((h) => `${h.action}@${h.resource_type}:${h.enforced}`) : [] });
} catch (e) {
  step('audit verification', false, { note: e.message });
}
const allOk = steps.every((x) => x.ok);
const meta = run.finish(allOk ? status : status === 'completed' ? 'completed_with_failures' : status, { smoke: { engine, steps: steps.map(({ stack, ...x }) => x) } });
console.log(JSON.stringify({ run_dir: run.dir, engine, ok: allOk, status: meta.status }, null, 2));
process.exit(allOk ? 0 : 1);
