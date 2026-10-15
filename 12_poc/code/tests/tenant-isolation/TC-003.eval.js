// TC-003 evaluator (frozen with the runner; test plan §2.6).
//   node tests/tenant-isolation/TC-003.eval.js <run-dir>      -> <run-dir>/eval.json
// 合否基準 (§4.3): 受理 0 件、許されない属性の返却 0 件. 中止基準: ledger と実装の operation 数の不一致; C-3 (正例の失敗 > 0).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const runDir = process.argv[2];
const P = JSON.parse(fs.readFileSync(path.join(runDir, 'params.json'), 'utf8'));
const inputs = {};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const readJsonl = (f) => { if (!fs.existsSync(f)) return []; inputs[path.relative(runDir, f).split(path.sep).join('/')] = sha(f); return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); };
const ledgerCheck = JSON.parse(fs.readFileSync(path.join(runDir, 'ledger-check.json'), 'utf8'));
const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
const engines = [];
for (const e of P.engines) {
  const dir = path.join(runDir, 'configs', e);
  if (!fs.existsSync(dir)) { engines.push({ engine: e, missing: true }); continue; }
  const reqs = readJsonl(path.join(dir, 'requests.jsonl'));
  const effects = readJsonl(path.join(dir, 'effects.jsonl'))[0] || null;
  const negatives = reqs.filter((r) => !r.positive && r.accepted !== undefined);
  const accepted = negatives.filter((r) => r.accepted === true);
  const positives = reqs.filter((r) => r.positive);
  const positiveFail = positives.filter((r) => !r.ok_positive);
  const exposures = reqs.flatMap((r) => (r.exposure || []).map((x) => ({ i: r.i, case: r.case, ep: r.ep, ...x })));
  const effectFindings = effects ? effects.effect_findings : [{ finding: 'effects not recorded' }];
  const by = (rows, k) => rows.reduce((o, r) => { o[k(r)] = (o[k(r)] || 0) + 1; return o; }, {});
  const opsCovered = [...new Set(reqs.map((r) => r.ep))].sort();
  const coverage = {};
  for (const r of reqs) { if (r.positive) continue; const c = { auth: 'e', bola: 'a', bola_list: 'a', function: 'b', mass: 'c' }[r.cls]; if (c) (coverage[r.ep] ||= new Set()).add(c); }
  engines.push({
    engine: e,
    negatives: negatives.length + effectFindings.length * 0, negatives_by_class: by(negatives, (r) => r.cls), negatives_by_case: by(negatives, (r) => r.case),
    effect_based_cases: reqs.filter((r) => r.effect_based).length,
    accepted: accepted.length, accepted_examples: accepted.slice(0, 20).map((r) => ({ i: r.i, case: r.case, ep: r.ep, via: r.via, who: r.who, method: r.method, status: r.status })),
    effect_findings: effectFindings,
    exposures: exposures.length, exposure_examples: exposures.slice(0, 20),
    positives: positives.length, positive_failures: positiveFail.map((r) => ({ i: r.i, ep: r.ep, status: r.status })),
    status_by_case: by(reqs, (r) => `${r.case} ${r.status}`),
    operations_covered: opsCovered, coverage_by_operation: Object.fromEntries(Object.entries(coverage).map(([k, v]) => [k, [...v].sort().join('')])),
    effects: effects ? effects.effects : null, store: effects ? effects.store : null,
  });
}
const abort = [];
if (!ledgerCheck.match) abort.push('ledger/implementation operation count mismatch');
for (const e of engines) {
  if (e.missing) abort.push(`${e.engine}: configuration missing`);
  else if (e.positive_failures.length > P.abort.positive_control_failure_max) abort.push(`C-3 ${e.engine}: positive control failures ${e.positive_failures.length}`);
}
const acceptedTotal = engines.reduce((n, e) => n + (e.accepted || 0) + (e.effect_findings ? e.effect_findings.length : 0), 0);
const exposureTotal = engines.reduce((n, e) => n + (e.exposures || 0), 0);
const verdict = abort.length ? '中止' : acceptedTotal === 0 && exposureTotal === 0 ? '合格' : '不合格';
const out = {
  tc: 'TC-003', evaluator: 'tests/tenant-isolation/TC-003.eval.js', evaluated_at: new Date().toISOString(), run_id: run.run_id, manifest_hash: run.manifest_hash,
  verdict, abort,
  criteria: [
    { id: 'K1', text: '受理 0 件', observed: acceptedTotal, detail: engines.map((e) => ({ engine: e.engine, accepted_requests: e.accepted, persisted_effects: e.effect_findings?.length })), met: acceptedTotal === 0 },
    { id: 'K2', text: '許されない属性の返却 0 件', observed: exposureTotal, met: exposureTotal === 0 },
  ],
  ledger_check: ledgerCheck, engines, input_sha256: inputs,
};
fs.writeFileSync(path.join(runDir, 'eval.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ verdict, abort, criteria: out.criteria, accepted_examples: engines.map((e) => e.accepted_examples), effect_findings: engines.map((e) => e.effect_findings), exposures: engines.map((e) => e.exposure_examples) }, null, 1));
