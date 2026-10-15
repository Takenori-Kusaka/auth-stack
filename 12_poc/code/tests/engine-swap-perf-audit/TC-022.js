// TC-022 特権操作・監査改ざん（論理）（preregistered-test-plan.md §4.22）
//   node tests/engine-swap-perf-audit/TC-022.js
// NOTE: this TC requires a witness (C-8). No witness exists for this group's runs, so the formal result is
// 「中止（C-8）」; the procedure is executed for reference and every value is recorded.
import fs from 'node:fs';
import path from 'node:path';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { ProcGroup } from '../../harness/proc.js';
import { loadTopology, loadSecrets } from '../../lib/topology.js';
import { verifyRun } from '../../audit/verify.js';
import { opaqueId } from '../../lib/ids.js';
import { openRun, groupPortBase, writeEval, sleep, readJsonl, HERE } from './common.js';
import { PrivilegedAccess } from './lib/priv.js';

const TC = 'TC-022';
const { run, params } = openRun(TC, { seed: 22, purpose: 'reference-execution-without-witness (C-8)' });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
let status = 'aborted:C-8';
const evalOut = { tc: TC, negatives: {}, positives: {} };
let s = null, pa = null;
const pg = new ProcGroup({ logDir: path.join(run.dir, 'logs-oob') });

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: groupPortBase(TC) });
  const oobPort = groupPortBase(TC) + 18;
  const startOob = () => pg.start('oob', process.execPath, [path.join(HERE, 'lib', 'oob-recorder.js'), String(oobPort), path.join(run.dir, 'oob')], { ready: { line: /READY / } });
  await startOob();
  const topo = loadTopology(s.topoFile);
  pa = new PrivilegedAccess({ topo, secrets: loadSecrets(topo), dataset: ds, oobUrl: `http://127.0.0.1:${oobPort}/`, maxConsecutivePair: params.parameters.max_consecutive_same_pair });
  const T = ds.tenants[0];
  const tFiles = ds.files.filter((f) => f.tid === T.id).slice(0, 3).map((f) => f.id);
  const tenantApprover = ds.tuples.find((x) => x.resource.type === 'core/tenant' && x.resource.id === T.id && x.relation === 'security_admin').subject.id;
  pa.customerApprovers.set(T.id, new Set([tenantApprover]));
  for (const [id, kind, qualified] of [['staff-support-1', 'support', false], ['staff-support-2', 'support', false], ['staff-approver-1', 'approver', true], ['staff-approver-2', 'approver', true], ['staff-sre-1', 'sre', true], ['staff-ciso-1', 'ciso', true], ['agent-1', 'ai_agent', false]]) pa.staff.set(id, { kind, qualified });
  pa.cases.set('CASE-1001', 'open'); pa.cases.set('CASE-1002', 'open'); pa.cases.set('CASE-1003', 'open'); pa.cases.set('CASE-1004', 'open');
  pa.incidents.add('INC-2026-0001');
  const N = evalOut.negatives, P = evalOut.positives;
  const neg = (id, r, extra = {}) => { N[id] = { succeeded: !!r.ok, reason: r.reason, ...extra }; run.append('requests.jsonl', { kind: 'negative', id, ok: !!r.ok, reason: r.reason, ...extra }); };
  const full = async (requester, approver, ticket, { durationMs = params.parameters.grant_duration_ms, ops = ['view_file_metadata', 'view_file_content'] } = {}) => {
    const rq = pa.requestElevation(requester, { ticket, reason: 'customer reported missing file', tid: T.id, files: tFiles.slice(0, 2), ops, durationMs });
    const a1 = pa.approveInternal(approver, rq.grantId);
    const a2 = pa.approveCustomer(tenantApprover, rq.grantId);
    const ac = await pa.activate(requester, rq.grantId, { amr: ['hwk', 'pin'] });
    return { grantId: rq.grantId, steps: [rq.ok, a1.ok, a2.ok, ac.ok] };
  };
  // ---- positive control: full JIT flow and access ----
  const g1 = await full('staff-support-1', 'staff-approver-1', 'CASE-1001');
  const p1 = await pa.access('staff-support-1', g1.grantId, 'view_file_content', tFiles[0]);
  P.jit_access = { steps: g1.steps, access_ok: p1.ok };
  if (!p1.ok) { const e = new Error(`positive control failed: ${JSON.stringify(g1.steps)} ${p1.reason}`); e.abort = 'C-3'; throw e; }
  // ---- negatives ----
  neg('N01', await pa.access('staff-support-2', null, 'view_file_content', tFiles[0]));
  { // N02: staff login to the customer tenant through the normal AS path
    let ok = false, why;
    try { const u = await s.login({ sub: 'staff-support-2', tid: T.id }); ok = !!u.ok; why = `status ${u.status}`; } catch (e) { ok = false; why = e.message.slice(0, 120); }
    neg('N02', { ok, reason: why });
  }
  { const r = await s.evaluate({ subject: { type: 'core/user', id: 'synstaffsupport2zzzzzzzzzz', properties: { tid: T.id, principal_type: 'human', acr: 'L3' } }, action: { name: 'read' }, resource: { type: 'files/file', id: tFiles[0], properties: { tid: T.id } }, context: { 'x-authz-profile': { profile_version: '1.0' } } }); const j = r.json(); neg('N03', { ok: j?.decision === true, reason: j?.context?.['x-authz-profile']?.reason }); }
  { const rq = pa.requestElevation('staff-support-2', { ticket: 'CASE-1002', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 }); neg('N04', pa.approveInternal('staff-support-2', rq.grantId)); }
  { // v4: self-approval by a qualified approver (the v3 N04 was refused by the qualification check before the self-approval rule)
    pa.staff.set('staff-approver-3', { kind: 'approver', qualified: true });
    const rq = pa.requestElevation('staff-approver-3', { ticket: 'CASE-1002', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 });
    neg('N04b', pa.approveInternal('staff-approver-3', rq.grantId), { requested: rq.ok });
  }
  { // N05: same approver/requester pair: 2 consecutive allowed, the 3rd refused
    const okRuns = [];
    for (let i = 0; i < 2; i++) { const rq = pa.requestElevation('staff-support-2', { ticket: 'CASE-1002', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 }); okRuns.push(pa.approveInternal('staff-approver-2', rq.grantId).ok); }
    const rq3 = pa.requestElevation('staff-support-2', { ticket: 'CASE-1002', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 });
    neg('N05', pa.approveInternal('staff-approver-2', rq3.grantId), { first_two_approved: okRuns });
  }
  { const g = await full('staff-support-2', 'staff-approver-1', 'CASE-1003'); neg('N06a', pa.modifyScope('staff-support-2', g.grantId, { files: [...tFiles] })); neg('N06b', await pa.access('staff-support-2', g.grantId, 'view_file_content', tFiles[2]), { note: '承認範囲外の資源' }); N.N06b_op = { succeeded: !!(await pa.access('staff-support-2', g.grantId, 'list_folder', tFiles[0])).ok, note: '承認範囲外の操作' }; neg('N09', await pa.access('staff-support-2', g.grantId, 'read_auth_secret', tFiles[0])); }
  { // N07: time limit
    const g = await full('staff-support-1', 'staff-approver-2', 'CASE-1004', { durationMs: params.parameters.grant_duration_ms });
    const before = await pa.access('staff-support-1', g.grantId, 'view_file_metadata', tFiles[0]);
    const gr = pa.grants.get(g.grantId);
    await sleep(Math.max(0, gr.expiresAt - Date.now()) + 300);
    const after = await pa.access('staff-support-1', g.grantId, 'view_file_metadata', tFiles[0]);
    neg('N07', after, { before_ok: before.ok, session_end_lag_ms: pa.sessions.get(g.grantId).endedAt - gr.expiresAt });
  }
  { const g = await full('staff-support-2', 'staff-approver-2', 'CASE-1003'); pa.closeCase('CASE-1003'); neg('N08', await pa.access('staff-support-2', g.grantId, 'view_file_metadata', tFiles[0]), { session_reason: pa.sessions.get(g.grantId)?.reason }); }
  { // N10: journal outage
    pa.cases.set('CASE-1005', 'open');
    const g = await full('staff-support-1', 'staff-approver-1', 'CASE-1005', { durationMs: 20_000 });
    await s.journalOutage(true);
    const r = await pa.access('staff-support-1', g.grantId, 'view_file_content', tFiles[0]);
    await s.journalOutage(false);
    await sleep(1500);
    neg('N10', r, { grant_active: g.steps.every(Boolean) });
  }
  neg('N11', pa.requestElevation('agent-1', { ticket: 'CASE-1001', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 }));
  { const rq = pa.requestElevation('staff-support-1', { ticket: 'CASE-1001', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 }); neg('N12', pa.approveInternal('agent-1', rq.grantId)); }
  neg('N13', await pa.breakGlass('agent-1', 'staff-ciso-1', 'INC-2026-0001', 'disable_tenant_sso'));
  // positive break-glass, then OOB down
  const bg = await pa.breakGlass('staff-sre-1', 'staff-ciso-1', 'INC-2026-0001', 'rotate_signing_key');
  P.break_glass = { ok: bg.ok, seq: bg.seq, reason: bg.reason };
  await pg.stop('oob');
  neg('N14', await pa.breakGlass('staff-sre-1', 'staff-ciso-1', 'INC-2026-0001', 'rotate_signing_key'));
  await startOob();
  neg('N15', await pa.breakGlass('staff-sre-1', 'staff-sre-1', 'INC-2026-0001', 'rotate_signing_key'));
  { const rq = pa.requestElevation('staff-support-1', { ticket: 'CASE-1001', reason: 'x', tid: T.id, files: [tFiles[0]], ops: ['view_file_metadata'], durationMs: 2000 }); pa.approveInternal('staff-approver-2', rq.grantId); neg('N16', pa.approveCustomer('staff-approver-1', rq.grantId)); pa.approveCustomer(tenantApprover, rq.grantId); neg('N17', await pa.activate('staff-support-1', rq.grantId, { amr: ['pwd', 'otp'] })); }
  await sleep(1500);
  pa.close(); pa = null;
  await s.stop(); s = null;
  // ---- tamper detection on copies ----
  const base = path.join(run.dir, 'tamper', 'base');
  for (const d of ['audit', 'audit-copy', 'audit-producers']) fs.cpSync(path.join(run.dir, d), path.join(base, d), { recursive: true });
  const baseV = verifyRun(base);
  const J = readJsonl(path.join(base, 'audit', 'journal.jsonl'));
  const privIdx = J.map((r, i) => [r, i]).filter(([r]) => r.family === 'privileged_access');
  const tamper = [];
  for (const variant of ['journal_only', 'journal_and_copy']) {
    for (const kind of ['modify', 'delete', 'truncate']) {
      const dir = path.join(run.dir, 'tamper', `${variant}-${kind}`);
      fs.cpSync(base, dir, { recursive: true });
      let L = fs.readFileSync(path.join(dir, 'audit', 'journal.jsonl'), 'utf8').split('\n').filter(Boolean);
      if (kind === 'modify') { const [r, i] = privIdx.find(([x]) => x.event_type === 'priv.access'); const m = { ...r, outcome: 'failure', detail: { ...r.detail, preapproved_action_id: 'view_file_metadata' } }; L[i] = JSON.stringify(m); }
      else if (kind === 'delete') { const [, i] = privIdx[Math.floor(privIdx.length / 2)]; L.splice(i, 1); }
      else L = L.slice(0, -2);
      fs.writeFileSync(path.join(dir, 'audit', 'journal.jsonl'), L.join('\n') + '\n');
      if (variant === 'journal_and_copy') fs.writeFileSync(path.join(dir, 'audit-copy', 'journal.jsonl'), L.join('\n') + '\n');
      const v = verifyRun(dir);
      tamper.push({ variant, kind, detected: !v.summary.ok, alarm: v.summary.findings.length > 0, checks: [...new Set(v.summary.findings.map((f) => f.check))] });
    }
  }
  const invalid = readJsonl(path.join(run.dir, 'audit', 'journal-invalid.jsonl')).filter((b) => b.rec?.family === 'privileged_access');
  const negIds = Object.keys(N).filter((k) => k.startsWith('N'));
  const crit = {
    reach_without_grant: { value: ['N01', 'N02', 'N03'].filter((k) => N[k].succeeded).length, pass: ['N01', 'N02', 'N03'].every((k) => !N[k].succeeded) },
    negatives_succeeded: { value: negIds.filter((k) => N[k].succeeded).length, n: negIds.length, pass: negIds.every((k) => !N[k].succeeded) },
    success_after_expiry: { value: ['N07', 'N08'].filter((k) => N[k].succeeded).length, pass: !N.N07.succeeded && !N.N08.succeeded && N.N07.before_ok },
    tamper_detection_rate: { value: tamper.filter((t) => t.detected).length / tamper.length, base_ok: baseV.summary.ok, pass: baseV.summary.ok && tamper.every((t) => t.detected) },
    alarm_missing: { value: tamper.filter((t) => !t.alarm).length, pass: tamper.every((t) => t.alarm) },
    e7_records_quarantined: { value: invalid.length, pass: invalid.length === 0, note: '補助（E7 記録がスキーマに適合して記録されたこと）' },
  };
  const reference = Object.values(crit).every((c) => c.pass) ? '基準を満たす（参考）' : '基準を満たさない（参考）';
  Object.assign(evalOut, { criteria: crit, tamper, positives: P, recorded: { session_end_lag_after_time_limit_ms: N.N07.session_end_lag_ms }, reference_result: reference, verdict: '中止', abort: { code: 'C-8', reason: '立会人不在（本 TC は立会いを合否条件にする）。手順は参考として実行した' } });
  log(`reference ${reference}; formal 中止（C-8）`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  status = e.abort === 'C-3' ? 'aborted:C-3' : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack };
  evalOut.verdict = '中止';
  console.error(e.stack);
} finally {
  if (pa) pa.close();
  if (s) await s.stop();
  await pg.stopAll();
  writeEval(run, evalOut, ['requests.jsonl', 'audit/journal.jsonl']);
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict, reference: evalOut.reference_result }));
}
