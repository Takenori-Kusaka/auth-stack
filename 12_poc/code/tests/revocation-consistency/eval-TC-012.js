// TC-012 evaluator (frozen with the TC; §2.6). Rules: params/TC-012.json classification_rule / pass_rules.
//   node tests/revocation-consistency/eval-TC-012.js [--manifest-version N]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from '../../lib/topology.js';
import { args } from '../../lib/runtime.js';
import { loadParams, latestManifest, GROUP } from './common.js';

const a = args();
const P = loadParams('TC-012');
const ver = Number(a['manifest-version'] || latestManifest('TC-012')?.ver);
const man = JSON.parse(fs.readFileSync(path.join(DATA_DIR, GROUP, '_freeze', `manifest-TC-012-v${ver}.json`), 'utf8'));
const tcDir = path.join(DATA_DIR, GROUP, 'TC-012');
const L = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const runs = [];
for (const d of (fs.existsSync(tcDir) ? fs.readdirSync(tcDir) : []).sort()) {
  const dir = path.join(tcDir, d);
  if (!fs.existsSync(path.join(dir, 'run.json'))) continue;
  const meta = J(path.join(dir, 'run.json'));
  if (meta.frozen_manifest?.version !== ver) continue;
  if (!meta.status?.startsWith('completed')) { runs.push({ run: d, status: meta.status, evaluated: false }); continue; }
  const M = J(path.join(dir, 'models.json'));
  const rev = Object.fromEntries(Object.entries(M.models).map(([k, v]) => [k, v.revision]));
  const shadow = L(path.join(dir, 'shadow.jsonl'));
  const n = shadow.length;
  const refMeta = J(path.join(dir, 'ref-meta.json'));
  const bIdx = new Map(refMeta.belongs_users.map((u, j) => [u, n + j]));
  const ref = {};
  for (const k of Object.keys(M.models)) {
    const rows = L(path.join(dir, `ref-${k}.jsonl`));
    ref[k] = shadow.map((s, i) => (rows[i].allowed === null || rows[bIdx.get(s.user)].allowed === null ? null : rows[i].allowed && rows[bIdx.get(s.user)].allowed));
  }
  const fac = Object.fromEntries(Object.keys(M.models).map((k) => [k, shadow.map((s) => s.d[k])]));
  const facErrors = shadow.filter((s) => s.status !== 200 || Object.values(s.d).some((x) => x === null)).length;
  // ---- (2) shadow classification
  const classify = (src, c) => {
    const X = new Set(), N = new Set(), I = new Set();
    for (let i = 0; i < n; i++) {
      const b = src.v1[i], iv = src.v2[i], cv = src[c][i];
      if (cv === b) continue;
      if (cv === iv) I.add(i); else if (cv && !iv) X.add(i); else if (!cv && iv) N.add(i);
    }
    return { X, N, I };
  };
  const cands = [...M.widening_candidates, 'v2n'];
  const shadowRows = cands.map((c) => {
    const f = classify(fac, c), r = classify(ref, c);
    const missed = [...r.X].filter((i) => !f.X.has(i));
    const falseX = [...f.X].filter((i) => !r.X.has(i));
    return { candidate: c, X_facade: f.X.size, X_reference: r.X.size, X_missed: missed.length, X_false: falseX.length, N_facade: f.N.size, N_reference: r.N.size, intended_facade: f.I.size, blocked: f.X.size > 0, exercised: r.X.size > 0, missed_examples: missed.slice(0, 3).map((i) => shadow[i]) };
  });
  const intended = (() => { let x = 0; for (let i = 0; i < n; i++) if (fac.v2[i] !== fac.v1[i]) x++; return x; })();
  const xRefTotal = shadowRows.reduce((s, r) => s + r.X_reference, 0);
  const xDetected = shadowRows.reduce((s, r) => s + (r.X_reference - r.X_missed), 0);
  const notBlocked = shadowRows.filter((r) => r.exercised && !r.blocked).map((r) => r.candidate);
  // ---- (3) rollback
  const rb = J(path.join(dir, 'rollback.json'));
  const resurrect = rb.pairs.reduce((s, p) => s + ['with_token', 'no_token', 'pin_v1', 'pin_v2'].filter((k) => p.after_rollback[k].decision === true).length, 0) + rb.service_checks.filter((x) => x.status === 200).length;
  const rbControl = rb.pairs.every((p) => p.before_revoke_v2.decision === true && p.after_revoke_v2.decision === false) && rb.service_checks.every((x) => x.login);
  const afterRbRev = rb.pairs.every((p) => p.after_rollback.no_token.model_revision === rev.v1);
  // ---- (4) CI + gate
  const ci = L(path.join(dir, 'ci-reports.jsonl'));
  const mutatedKey = (k) => (k === 'v2' ? `${P.models.v2_intended.type}#${P.models.v2_intended.permission}` : k === 'v2w' ? `${P.models.v2w_unapproved_widening.type}#${P.models.v2w_unapproved_widening.permission}` : M.mutants.find((m) => m.key === k)?.id);
  const ciRows = ['v2', ...M.widening_candidates].map((k) => {
    const r = ci.find((x) => x.candidate === k);
    const key = mutatedKey(k);
    const flagged = !!r && r.requires_approval && (r.widening.some((w) => w.key === key) || r.unproven.includes(key) || r.approval_reasons.some((x) => x.endsWith(`:${key}`)));
    return { candidate: k, mutated: key, requires_approval: r?.requires_approval, flagged_mutated_permission: flagged, via: r ? (r.widening.some((w) => w.key === key) ? 'widening_witness' : r.unproven.includes(key) ? 'unproven' : 'other') : null };
  });
  const regs = L(path.join(dir, 'registrations.jsonl'));
  const noAppr = regs.filter((x) => !x.with_approvals && (x.note || '').startsWith('widening candidate') || (x.key === 'v2' && !x.with_approvals));
  const represent = regs.filter((x) => /^re_present|^replay/.test(x.key));
  const distributedWithoutApproval = noAppr.filter((x) => x.status === 201).length + represent.filter((x) => x.status === 201).length;
  const gateRefused = noAppr.filter((x) => x.status === 403).length;
  const registry = J(path.join(dir, 'registry-after-gate.json'));
  // ---- (5) Cedar analysis vs CI
  const ced = L(path.join(dir, 'cedar-analysis.jsonl'));
  const cedarRows = ced.map((c) => {
    const r = ci.find((x) => x.candidate === c.candidate);
    const covered = new Set([...(r?.widening || []).map((w) => w.key), ...(r?.unproven || []), ...(r?.approval_reasons || []).map((x) => x.split(':').slice(1).join(':'))]);
    return { candidate: c.candidate, cedar_widening_keys: c.widening_keys, not_detected_by_ci: c.widening_keys.filter((k) => !covered.has(k)) };
  });
  // ---- 2 generators (OpenFGA via façade, Cedar in-process) for v1 and v2
  const cedar = L(path.join(dir, 'cedar.jsonl'));
  const gen = { diffs: 0, allow_widening: 0, narrowing_explained: 0, narrowing_unexplained: 0, cedar_errors: 0, examples: [] };
  for (const c of cedar) for (const k of ['v1', 'v2']) {
    const f = fac[k][c.i], cd = c.d[k], r = ref[k][c.i];
    if (typeof cd === 'object' && cd !== null) gen.cedar_errors++;
    const cb = typeof cd === 'boolean' ? cd : null;
    if (f === cb) continue;
    gen.diffs++;
    if ((f === true && r === false) || (cb === true && r === false)) gen.allow_widening++;
    else if (cb === null) gen.narrowing_explained++; // Cedar evaluation error recorded (cause known)
    else gen.narrowing_unexplained++;
    if (gen.examples.length < 5) gen.examples.push({ i: c.i, model: k, openfga: f, cedar: cd, reference: r, request: shadow[c.i] });
  }
  const ev = {
    tc: 'TC-012', run: d, manifest_version: ver, manifest_sha256: man.manifest_sha256, evaluated_at: new Date().toISOString(),
    requests: { total: n, recorded: shadow.filter((s) => s.src === 'recorded').length, property: shadow.filter((s) => s.src === 'property').length, facade_errors: facErrors },
    control: { intended_differences_v1_v2: intended, rollback_control: rbControl, rollback_model_effective: afterRbRev },
    metrics: {
      shadow: { x_reference_total: xRefTotal, x_detected: xDetected, detection_rate: xRefTotal ? xDetected / xRefTotal : null, candidates_exercised: shadowRows.filter((r) => r.exercised).length, candidates_total: shadowRows.length - 1, candidates_not_blocked: notBlocked, false_x: shadowRows.reduce((s, r) => s + r.X_false, 0), rows: shadowRows },
      rollback: { resurrections: resurrect, pairs: rb.pairs.length, service_checks: rb.service_checks.length, rollback_ack_ms: rb.rollback_ack_ms, rollback_effective_ms: rb.rollback_effective_ms },
      ci: { candidates: ciRows.length, flagged: ciRows.filter((r) => r.flagged_mutated_permission).length, rows: ciRows },
      gate: { submitted_without_approval: noAppr.length, refused_403: gateRefused, re_presented: represent.map((x) => ({ key: x.key, status: x.status, problem: x.problem })), distributed_without_approval: distributedWithoutApproval, current_after_gate: registry.current, current_is_v1: registry.current === rev.v1 },
      cedar_analysis: { candidates: cedarRows.length, not_detected_by_ci_total: cedarRows.reduce((s, r) => s + r.not_detected_by_ci.length, 0), rows: cedarRows },
      two_generators: gen,
    },
  };
  const m = ev.metrics;
  ev.verdict = {
    unapproved_widening_detected_100: m.shadow.x_detected === m.shadow.x_reference_total && m.shadow.candidates_not_blocked.length === 0,
    rollback_no_resurrection: m.rollback.resurrections === 0,
    ci_detects_100: m.ci.flagged === m.ci.candidates && m.gate.refused_403 === m.gate.submitted_without_approval,
    no_distribution_without_approval: m.gate.distributed_without_approval === 0 && m.gate.current_is_v1,
    two_generators: gen.allow_widening > 0 ? false : gen.narrowing_unexplained > 0 ? 'undecided' : true,
  };
  const controlOk = intended > 0 && rbControl && afterRbRev && facErrors === 0;
  const vals = Object.values(ev.verdict);
  ev.result = !controlOk ? 'aborted:C-3' : vals.every((v) => v === true) ? 'pass' : vals.some((v) => v === false) ? 'fail' : 'undecided';
  ev.inputs = Object.fromEntries(['shadow.jsonl', 'registrations.jsonl', 'ci-reports.jsonl', 'cedar.jsonl', 'cedar-analysis.jsonl', 'rollback.json', 'models.json', 'ref-v1.jsonl', 'run.json'].filter((f) => fs.existsSync(path.join(dir, f))).map((f) => [f, sha(path.join(dir, f))]));
  fs.writeFileSync(path.join(dir, 'eval.json'), JSON.stringify(ev, null, 2));
  runs.push({ run: d, status: meta.status, evaluated: true, result: ev.result, verdict: ev.verdict, control: ev.control, headline: { detection: `${xDetected}/${xRefTotal}`, resurrections: resurrect, ci: `${m.ci.flagged}/${m.ci.candidates}`, gate_refused: `${gateRefused}/${noAppr.length}`, distributed_without_approval: distributedWithoutApproval, two_gen_diffs: gen.diffs, cedar_not_detected_by_ci: m.cedar_analysis.not_detected_by_ci_total, rollback_effective_ms: rb.rollback_effective_ms } });
}
const done = runs.filter((r) => r.evaluated);
const overall = !done.length ? 'incomplete' : done[done.length - 1].result;
fs.writeFileSync(path.join(tcDir, `eval-summary-v${ver}.json`), JSON.stringify({ tc: 'TC-012', manifest_version: ver, manifest_sha256: man.manifest_sha256, overall, runs }, null, 2));
console.log(JSON.stringify({ overall, runs }, null, 2));
