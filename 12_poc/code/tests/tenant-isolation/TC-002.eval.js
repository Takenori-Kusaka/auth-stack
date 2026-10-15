// TC-002 evaluator (frozen with the runner; test plan §2.6: computes the metrics from the raw data only).
//   node tests/tenant-isolation/TC-002.eval.js <run-dir>
// Output: <run-dir>/eval.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const runDir = process.argv[2];
if (!runDir) { console.error('usage: TC-002.eval.js <run-dir>'); process.exit(2); }
const P = JSON.parse(fs.readFileSync(path.join(runDir, 'params.json'), 'utf8'));
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const inputs = {};
const read = (f) => { if (fs.existsSync(f)) inputs[path.relative(runDir, f).split(path.sep).join('/')] = sha(f); return readJsonl(f); };

function layerOracle(r, edgeByTrace, pepByTrace) {
  // returns null (not applicable) | { expected, observed, ok }
  if (r.cross !== 'X1' || r.observed !== 'deny') return null;
  if (r.ch === 'facade_eval' || r.ch === 'facade_batch') {
    const exp = r.s_tid !== r.r_tid || r.res.tid !== r.r_tid ? 'deny_guardrail:g1_tenant_mismatch' : 'deny_guardrail:g1_not_member';
    return { expected: exp, observed: r.reason, ok: r.reason === exp };
  }
  if (r.ch === 'edge') {
    if (r.path_tid !== r.token_tid) {
      const atEdge = !r.trace_id; // the edge's own denials carry no x-edge-trace-id
      return { expected: 'edge:route_tenant_mismatch', observed: atEdge ? 'edge' : 'service', ok: atEdge };
    }
    const foreignPrimary = r.res && r.res.tid !== r.token_tid;
    const foreignSecondary = r.extra && ((r.extra.file_tenant && r.extra.file_tenant !== r.token_tid) || (r.extra.to_tenant && r.extra.to_tenant !== r.token_tid));
    if (!foreignPrimary && !foreignSecondary) return null;
    if (!foreignPrimary && r.ep === 'file.move') return null; // target-folder check is a service store check (no L0 resource)
    const peps = pepByTrace.get(r.trace_id) || [];
    const l0 = peps.some((p) => String(p.internal_reason || '').startsWith('deny_l0'));
    return { expected: 'pep:deny_l0', observed: peps.map((p) => `${p.svc}:${p.internal_reason}`).join(',') || (r.trace_id ? 'no-pep-record' : 'edge'), ok: l0 };
  }
  if (r.ch === 'direct') {
    const peps = pepByTrace.get(r.trace_id) || [];
    if (r.res.tid !== r.token_tid) {
      const l0 = peps.some((p) => String(p.internal_reason || '').startsWith('deny_l0'));
      return { expected: 'pep:deny_l0', observed: peps.map((p) => `${p.svc}:${p.internal_reason}`).join(',') || 'no-pep-record', ok: l0 };
    }
    const g1 = peps.some((p) => String(p.internal_reason || '') === 'deny_pdp:deny_guardrail:g1_not_member');
    return { expected: 'pdp:g1_not_member', observed: peps.map((p) => `${p.svc}:${p.internal_reason}`).join(',') || 'no-pep-record', ok: g1 };
  }
  return null;
}

function evalConfig(dir, name) {
  const reqs = read(path.join(dir, 'requests.jsonl'));
  const ops = read(path.join(dir, 'ops.jsonl'));
  const summary = fs.existsSync(path.join(dir, 'summary.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8')) : null;
  if (summary) inputs[path.relative(runDir, path.join(dir, 'summary.json')).split(path.sep).join('/')] = sha(path.join(dir, 'summary.json'));
  const edgeRows = read(path.join(dir, 'edge', 'edge-requests.jsonl'));
  const pepRows = [];
  if (fs.existsSync(path.join(dir, 'pep'))) for (const f of fs.readdirSync(path.join(dir, 'pep'))) pepRows.push(...read(path.join(dir, 'pep', f)));
  const edgeByTrace = new Map();
  for (const e of edgeRows) if (e.trace_id) edgeByTrace.set(e.trace_id, e);
  const pepByTrace = new Map();
  for (const p of pepRows) if (p.trace_id) { if (!pepByTrace.has(p.trace_id)) pepByTrace.set(p.trace_id, []); pepByTrace.get(p.trace_id).push(p); }

  const cross = reqs.filter((r) => r.cross);
  const same = reqs.filter((r) => !r.cross);
  const violations = reqs.filter((r) => r.violation);
  const by = (rows, key) => rows.reduce((o, r) => { const k = key(r); o[k] = (o[k] || 0) + 1; return o; }, {});
  const positives = same.filter((r) => r.expected_sys);
  const positiveFail = positives.filter((r) => r.observed !== 'allow');
  const decided = same.filter((r) => r.observed !== 'error');
  const mismatch = decided.filter((r) => (r.observed === 'allow') !== r.expected_sys);
  const errors = reqs.filter((r) => r.observed === 'error');
  const o2 = cross.map((r) => ({ r, l: layerOracle(r, edgeByTrace, pepByTrace) })).filter((x) => x.l);
  const o2bad = o2.filter((x) => !x.l.ok);
  // 参考（v1.1 で追加。凍結前の規則ではない）: edge probes whose only foreign object is secondary (tool.run's file) and whose
  // first service denied the same-tenant primary object at the R stage are not expected to reach L0 at all
  const o2refBad = o2bad.filter((x) => !(x.r.ch === 'edge' && x.r.res && x.r.res.tid === x.r.token_tid && /deny_pdp:deny_no_relation/.test(x.l.observed) && !/deny_l0/.test(x.l.observed)));
  const itemViolations = reqs.flatMap((r) => (r.items || []).filter((i) => i.violation).map((i) => ({ probe: r.i, ...i })));
  const searchCandidatesNonMember = reqs.filter((r) => r.ch === 'facade_search' && !r.member_of_s_tid).reduce((n, r) => n + (r.returned || 0), 0);
  const writeRejectExpectedButAccepted = ops.filter((o) => o.expect_reject && o.accepted);
  // distribution of generated step kinds vs frozen weights (abort rule)
  const dist = {};
  let distOk = true;
  if (summary) {
    const counts = summary.step_kind_counts || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const wsum = Object.values(P.step_weights).reduce((a, b) => a + b, 0);
    for (const [k, w] of Object.entries(P.step_weights)) {
      const p = w / wsum;
      const obs = counts[k] || 0;
      const z = total ? (obs - total * p) / Math.sqrt(total * p * (1 - p)) : 0;
      dist[k] = { expected_share: p, observed: obs, z: Math.round(z * 100) / 100 };
      if (Math.abs(z) > P.abort.distribution_z) distOk = false;
    }
  }
  // minimisation of counterexamples: the violating request is a single request; the op prefix is reduced to the ops
  // that touched one of the objects / subjects involved (isolation-based minimisation, no re-execution)
  const minimised = violations.slice(0, 50).map((r) => {
    const ids = new Set([r.sub, r.res?.id, r.extra?.file_id, r.extra?.to_folder].filter(Boolean));
    const touching = ops.filter((o) => o.accepted && [...(o.writes || []), ...(o.deletes || [])].some((t) => ids.has(t.resource.id) || ids.has(t.subject.id)));
    return { probe: r, ops_before_minimisation: ops.filter((o) => o.t <= r.sent).length, ops_after_minimisation: touching.filter((o) => o.t <= r.sent) };
  });
  const isMain = !name.startsWith('mutant-');
  const abort = [];
  if (isMain && positives.length && positiveFail.length / positives.length > P.abort.positive_control_failure_max_rate) abort.push(`C-3 positive control failure ${positiveFail.length}/${positives.length}`);
  if (isMain && decided.length >= P.abort.agreement_mismatch_min_probes && mismatch.length / decided.length > P.abort.agreement_mismatch_max_rate) abort.push(`TC-002 abort: reference/engine disagreement on same-tenant probes ${mismatch.length}/${decided.length}`);
  if (isMain && !distOk) abort.push('TC-002 abort: generator distribution outside the frozen weights');
  if (summary == null) abort.push('no summary (configuration did not complete)');
  const n = cross.length;
  return {
    config: name, engine: summary?.engine, model: summary?.model, mutant: summary?.mutant || null,
    n_probes: reqs.length, n_cross: n, n_cross_x1: cross.filter((r) => r.cross === 'X1').length, n_cross_x2: cross.filter((r) => r.cross === 'X2').length, n_same: same.length,
    cross_by_channel: by(cross, (r) => r.ch), cross_by_channel_ep: by(cross, (r) => `${r.ch}:${r.ep || r.perm || r.type || ''}`),
    violations_o1: violations.length, violations_o1_x1: violations.filter((r) => r.cross === 'X1').length, violations_o1_x2: violations.filter((r) => r.cross === 'X2').length,
    violations_by_channel: by(violations, (r) => `${r.ch}:${r.ep || r.perm || ''}:${r.cross}`), list_item_violations: itemViolations.length,
    residual_rate_upper_95: n ? 3 / n : null,
    o2_applicable: o2.length, o2_violations: o2bad.length, o2_violation_examples: o2bad.slice(0, 10).map((x) => ({ i: x.r.i, ch: x.r.ch, ep: x.r.ep, expected: x.l.expected, observed: x.l.observed })),
    o2_violations_by: by(o2bad, (x) => `${x.r.ch}:${x.l.expected}`),
    reference_o2_refined_violations: o2refBad.length, reference_o2_refined_by: by(o2refBad, (x) => `${x.r.ch}:${x.r.ep || ''}:${x.l.expected}`),
    positive_controls: positives.length, positive_control_failures: positiveFail.length, positive_failure_examples: positiveFail.slice(0, 5).map((r) => ({ i: r.i, ch: r.ch, ep: r.ep, status: r.status, reason: r.reason })),
    same_tenant_decided: decided.length, agreement_mismatches: mismatch.length, mismatch_examples: mismatch.slice(0, 10).map((r) => ({ i: r.i, ch: r.ch, ep: r.ep || r.perm, observed: r.observed, expected_sys: r.expected_sys, status: r.status, reason: r.reason })),
    errors: errors.length, error_examples: errors.slice(0, 5).map((r) => ({ i: r.i, ch: r.ch, ep: r.ep, status: r.status, reason: r.reason })),
    ops: ops.length, ops_rejected: ops.filter((o) => !o.accepted).length, cross_tenant_writes_expected_reject_but_accepted: writeRejectExpectedButAccepted.length,
    search_candidates_for_non_member_claimed_tid: searchCandidatesNonMember,
    distribution: dist, distribution_ok: distOk,
    counterexamples: minimised,
    abort,
    elapsed_ms: summary?.elapsed_ms,
  };
}

const cfgRoot = path.join(runDir, 'configs');
const configs = fs.existsSync(cfgRoot) ? fs.readdirSync(cfgRoot).sort().map((d) => evalConfig(path.join(cfgRoot, d), d)) : [];
const main = configs.filter((c) => !c.mutant);
const muts = configs.filter((c) => c.mutant);
// O2 counts for detection only when the baseline with the same engine/model (C1) shows no O2 violation at all
const baseline = main.find((c) => c.engine === P.mutants.engine && c.model === P.mutants.model);
const o2Usable = !!baseline && baseline.o2_violations === 0;
const mutantResults = muts.map((m) => ({ mutant: m.mutant, detected: m.violations_o1 > 0 || (o2Usable && m.o2_violations > 0), by_o1: m.violations_o1 > 0, by_o2: o2Usable && m.o2_violations > 0, o1: m.violations_o1, o2: m.o2_violations, n_cross: m.n_cross, aborted: m.abort.length > 0 }));
const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
const correct = main.filter((c) => c.model === 'correct');
const permitAll = main.filter((c) => c.model === 'permit_all');
const aborted = main.filter((c) => c.abort.length);
const criteria = [
  { id: 'K1', text: '明示付与のない越境 allow 0 件（n 回の範囲、n = ⌈3/p_max⌉、p_max は KP-4）', observed: correct.map((c) => ({ config: c.config, n: c.n_cross, violations: c.violations_o1, list_item_violations: c.list_item_violations })), threshold: 0, threshold_status: 'p_max TBD (KP-4); n is provisional', met_on_observed_n: correct.length > 0 && correct.every((c) => c.violations_o1 === 0 && c.list_item_violations === 0) },
  { id: 'K2', text: '全域 permit モデルでも越境 allow 0 件', observed: permitAll.map((c) => ({ config: c.config, n: c.n_cross, violations: c.violations_o1, x1: c.violations_o1_x1, x2: c.violations_o1_x2, list_item_violations: c.list_item_violations })), threshold: 0, threshold_status: 'n depends on p_max (KP-4)', met_on_observed_n: permitAll.length > 0 && permitAll.every((c) => c.violations_o1 === 0 && c.list_item_violations === 0) },
  { id: 'K3', text: '変異体の検出力（記録、下限は TBD: CISO, G4, K-03(b)）', observed: { detected: mutantResults.filter((m) => m.detected).length, total: mutantResults.length, by_class: mutantResults.reduce((o, m) => { const c = m.mutant.split('-')[0][0]; (o[c] ||= { detected: 0, total: 0 }).total++; if (m.detected) o[c].detected++; return o; }, {}) }, threshold: null, threshold_status: 'TBD' },
];
const verdict = aborted.length ? '中止' : '判定保留';
const out = {
  tc: 'TC-002', evaluator: 'tests/tenant-isolation/TC-002.eval.js', evaluated_at: new Date().toISOString(), run_id: run.run_id, manifest_hash: run.manifest_hash,
  verdict, verdict_reason: aborted.length ? `abort criteria met in ${aborted.map((c) => c.config).join(', ')}` : 'TC-002 は §3.4 で「待（KP-4 の p_max）」。n を決める p_max と検出力の下限が TBD のため、合否を置かず値を記録する（依頼の規則: 基準が TBD のものは判定保留）',
  criteria, mutants: mutantResults, mutant_o2_usable: o2Usable,
  reference_mutants_refined_o2: (() => { const b = baseline?.reference_o2_refined_violations; const usable = b === 0; return { note: '参考: v1.1 で追加した O2 の精緻化（凍結前の規則ではない。合否・検出力の正式値には使わない）', baseline_refined_o2: b ?? null, usable, mutants: muts.map((m) => ({ mutant: m.mutant, o1: m.violations_o1, refined_o2: m.reference_o2_refined_violations, detected: m.violations_o1 > 0 || (usable && m.reference_o2_refined_violations > 0) })) }; })(), mutant_baseline: baseline?.config || null, configs, input_sha256: inputs,
};
fs.writeFileSync(path.join(runDir, process.argv[3] || 'eval.json'), JSON.stringify(out, null, 2)); // argv[3]: reference re-evaluation file name
console.log(JSON.stringify({ verdict, criteria: criteria.map((c) => ({ id: c.id, observed: c.observed, met_on_observed_n: c.met_on_observed_n })), mutants: mutantResults, aborts: aborted.map((c) => ({ c: c.config, a: c.abort })), o2: main.map((c) => ({ c: c.config, o2: c.o2_violations, o2app: c.o2_applicable })) }, null, 1));
