// TC-008 evaluator (frozen with the TC; §2.6: pass/fail computed mechanically from the raw data only).
//   node tests/revocation-consistency/eval-TC-008.js [--manifest-versions 2,3]
// Several frozen versions can be given when the platform changed between conditions (C-2 re-freeze, disclosed):
// for every condition the last completed run among those versions is evaluated; the version is reported per run.
// Reads every completed/aborted run of the TC under 12_poc/data/revocation-consistency/TC-008/, writes eval.json
// into each run directory and eval-summary-v<N>.json next to them.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from '../../lib/topology.js';
import { args } from '../../lib/runtime.js';
import { loadParams, latestManifest, summary, GROUP } from './common.js';

const a = args();
const P = loadParams('TC-008');
const vers = String(a['manifest-versions'] || latestManifest('TC-008')?.ver).split(',').map(Number);
const ver = Math.max(...vers);
const mans = Object.fromEntries(vers.map((v) => [v, JSON.parse(fs.readFileSync(path.join(DATA_DIR, GROUP, '_freeze', `manifest-TC-008-v${v}.json`), 'utf8'))]));
const man = { manifest_sha256: vers.map((v) => `v${v}:${mans[v].manifest_sha256}`).join(' ') };
const tcDir = path.join(DATA_DIR, GROUP, 'TC-008');
const L = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ttlMs = (t) => (t ? Number(/^(\d+)s$/.exec(t)[1]) * 1000 : 0);

// epsilon: a frozen TC-001 calibration value if one exists (field epsilon_ms), else the in-run measurement error
function tc001Epsilon() {
  const found = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== '_prefreeze') walk(p); } else if (e.name === 'calib.json' && p.includes(`${path.sep}TC-001${path.sep}`)) found.push(p); } };
  walk(DATA_DIR);
  for (const f of found.sort().reverse()) { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (typeof j.epsilon_ms === 'number') return { source: f, epsilon_ms: j.epsilon_ms }; } catch { /* ignore */ } }
  return null;
}
const ext = tc001Epsilon();

const runs = fs.existsSync(tcDir) ? fs.readdirSync(tcDir).filter((d) => fs.existsSync(path.join(tcDir, d, 'run.json'))) : [];
const results = [];
for (const d of runs.sort()) {
  const dir = path.join(tcDir, d);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
  if (!vers.includes(meta.frozen_manifest?.version)) continue;
  const cond = meta.condition;
  // the last completed run of the condition among the given versions
  const later = runs.filter((x) => x > d).map((x) => JSON.parse(fs.readFileSync(path.join(tcDir, x, 'run.json'), 'utf8'))).some((m) => vers.includes(m.frozen_manifest?.version) && m.condition?.id === cond?.id && m.status?.startsWith('completed'));
  if (later) { results.push({ run: d, condition: cond?.id, status: meta.status, evaluated: false, superseded: true }); continue; }
  if (!meta.status?.startsWith('completed')) { results.push({ run: d, condition: cond?.id, status: meta.status, evaluated: false }); continue; }
  const reqs = L(path.join(dir, 'requests.jsonl'));
  const trials = L(path.join(dir, 'trials.jsonl')).filter((t) => t.ev === 'done');
  const ex = L(path.join(dir, 'examples.jsonl'));
  const raw = L(path.join(dir, 'raw.jsonl'));
  const lateness = reqs.map((r) => r.sent_ms - r.sched_ms);
  const epsIn = Math.max(0, ...lateness);
  const eps = ext ? ext.epsilon_ms : epsIn;
  const q = meta.probe_interval_ms;
  const ttl = ttlMs(cond.openfga_check_cache_ttl);
  const sdk = cond.sdk_cache_ms || 0;
  const maxAge = { rs: (cond.facade_fence ? 0 : ttl) + sdk, rs_tok: 0, w: 0, p: 0 };
  const byTrialStream = new Map();
  for (const r of reqs) { const k = `${r.trial}|${r.stream}`; if (!byTrialStream.has(k)) byTrialStream.set(k, []); byTrialStream.get(k).push(r); }
  const rows = [];
  let controlFail = 0, controlTotal = 0;
  for (const t of trials) {
    for (const [stream, ok] of Object.entries(t.control)) {
      controlTotal++;
      if (!ok) { controlFail++; continue; }
      const kind = stream.startsWith('rs_tok') ? 'rs_tok' : stream.replace(/\d+$/, '');
      const rs = (byTrialStream.get(`${t.trial}|${stream}`) || []).filter((r) => r.sent_ms > t.t0_ms);
      const stale = rs.filter((r) => r.status === 200);
      const dur = stale.length ? Math.max(...stale.map((r) => r.sent_ms)) - t.t0_ms : 0;
      const firstDeny = rs.filter((r) => r.status !== 200).map((r) => r.sent_ms - t.t0_ms);
      const other = rs.filter((r) => r.status !== 200 && r.status !== 404).length;
      const bound = maxAge[kind] + q + eps;
      rows.push({ trial: t.trial, stream, kind, post_requests: rs.length, stale_allows: stale.length, stale_ms: +dur.toFixed(3), first_non_allow_ms: firstDeny.length ? +Math.min(...firstDeny).toFixed(3) : null, non_404_denials: other, configured_max_age_ms: maxAge[kind], bound_ms: +bound.toFixed(3), within_bound: dur <= bound });
    }
  }
  const of = (k) => rows.filter((r) => r.kind === k);
  const fenceTrials = trials.filter((t) => t.fence);
  const rollbackAccepted = fenceTrials.filter((t) => t.fence.old_status === 200).length + fenceTrials.filter((t) => t.fence.forged_status === 200).length;
  const replayAllows = trials.filter((t) => t.old_token_replay?.decision === true).length;
  // examples
  const enforcedPaths = new Set(['service', 'facade_token', ...(cond.facade_fence ? ['facade_notoken'] : [])]);
  const exRows = ex.map((e) => {
    const leaks = {};
    for (const x of e.after) { const leak = x.path === 'service' ? x.status === 200 : x.decision === true; leaks[x.path] = (leaks[x.path] || 0) + (leak ? 1 : 0); }
    const control = e.warm.every((w) => w === 200 || w === true) && (e.example === 'A' ? e.move_status === 200 && e.restore_status === 200 : e.append_status === 200);
    return { example: e.example, i: e.i, control, leaks };
  });
  const exLeakEnforced = exRows.filter((r) => r.control).reduce((n, r) => n + Object.entries(r.leaks).filter(([p]) => enforcedPaths.has(p)).reduce((m, [, v]) => m + v, 0), 0);
  const exLeakInfo = exRows.filter((r) => r.control).reduce((n, r) => n + Object.entries(r.leaks).filter(([p]) => !enforcedPaths.has(p)).reduce((m, [, v]) => m + v, 0), 0);
  const exControlFail = exRows.filter((r) => !r.control).length;
  const rawRows = raw.map((r) => ({ i: r.i, control: r.service.share_status === 200, facade_grant_ok: r.facade.after_grant.decision === true, facade_revoke_ok: r.facade.after_revoke.decision === false, service_share_ok: r.service.after_share === 200, service_revoke_ok: r.service.after_revoke === 404 }));
  const rawIncons = rawRows.filter((r) => r.control).reduce((n, r) => n + [r.facade_grant_ok, r.facade_revoke_ok, r.service_share_ok, r.service_revoke_ok].filter((x) => !x).length, 0);
  const c3 = controlTotal ? controlFail / controlTotal > P.c3_max_control_failure_ratio : false;
  const ev = {
    tc: 'TC-008', condition: cond, run: d, manifest_version: meta.frozen_manifest.version, manifest_sha256: mans[meta.frozen_manifest.version].manifest_sha256, evaluated_at: new Date().toISOString(),
    epsilon: { value_ms: +eps.toFixed(3), source: ext ? ext.source : 'in-run (max prober send lateness)', in_run_ms: +epsIn.toFixed(3) }, q_ms: q,
    control: { failed_streams: controlFail, total_streams: controlTotal, c3_abort: c3, example_control_failures: exControlFail, raw_control_failures: rawRows.filter((r) => !r.control).length },
    metrics: {
      write_stale_allows: of('w').reduce((n, r) => n + r.stale_allows, 0),
      privileged_stale_allows: of('p').reduce((n, r) => n + r.stale_allows, 0),
      rs_stale_ms: summary(of('rs').map((r) => r.stale_ms)), rs_tok_stale_ms: summary(of('rs_tok').map((r) => r.stale_ms)),
      w_stale_ms: summary(of('w').map((r) => r.stale_ms)), p_stale_ms: summary(of('p').map((r) => r.stale_ms)),
      rs_trials_with_stale_allow: of('rs').filter((r) => r.stale_allows > 0).length, rs_trials: of('rs').length,
      rs_out_of_bound: rows.filter((r) => (r.kind === 'rs' || r.kind === 'rs_tok') && !r.within_bound).length,
      examples: { iterations: exRows.length, leaks_enforced_paths: exLeakEnforced, leaks_non_enforced_paths_info: exLeakInfo, enforced_paths: [...enforcedPaths] },
      read_after_write_inconsistencies: rawIncons, raw_iterations: rawRows.length,
      fence_rollback_accepted: rollbackAccepted, fence_rollback_attempts: fenceTrials.length * 2, old_token_replay_allows: replayAllows,
    },
  };
  const m = ev.metrics;
  ev.verdict = {
    write_privileged_stale_allow_0: m.write_stale_allows + m.privileged_stale_allows === 0,
    examples_leak_0_enforced: m.examples.leaks_enforced_paths === 0,
    read_after_write_0: m.read_after_write_inconsistencies === 0,
    fence_rollback_0: m.fence_rollback_accepted === 0 && m.old_token_replay_allows === 0,
    rs_within_configured_bound: m.rs_out_of_bound === 0,
  };
  ev.result = c3 ? 'aborted:C-3' : Object.values(ev.verdict).every(Boolean) ? 'pass' : 'fail';
  ev.inputs = Object.fromEntries(['requests.jsonl', 'trials.jsonl', 'examples.jsonl', 'raw.jsonl', 'inject.jsonl', 'run.json', 'layers.json'].filter((f) => fs.existsSync(path.join(dir, f))).map((f) => [f, sha(path.join(dir, f))]));
  fs.writeFileSync(path.join(dir, 'eval.json'), JSON.stringify(ev, null, 2));
  fs.writeFileSync(path.join(dir, 'stale-per-trial.csv'), ['trial,stream,kind,post_requests,stale_allows,stale_ms,first_non_allow_ms,non_404_denials,configured_max_age_ms,bound_ms,within_bound', ...rows.map((r) => Object.values(r).join(','))].join('\n') + '\n');
  results.push({ run: d, condition: cond.id, manifest_version: meta.frozen_manifest.version, status: meta.status, evaluated: true, result: ev.result, verdict: ev.verdict, metrics: ev.metrics, epsilon: ev.epsilon, control: ev.control });
}
const evaluated = results.filter((r) => r.evaluated);
const condsSeen = new Set(evaluated.map((r) => r.condition));
const missing = P.conditions.map((c) => c.id).filter((c) => !condsSeen.has(c));
const overall = missing.length ? 'incomplete' : evaluated.some((r) => r.result === 'aborted:C-3') ? 'aborted:C-3' : evaluated.every((r) => r.result === 'pass') ? 'pass' : 'fail';
const out = { tc: 'TC-008', manifest_versions: vers, manifest_sha256: man.manifest_sha256, evaluated_at: new Date().toISOString(), overall, missing_conditions: missing, runs: results };
fs.writeFileSync(path.join(tcDir, `eval-summary-v${vers.join('-')}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ overall, runs: results.map((r) => ({ c: r.condition, status: r.status, result: r.result, rs_stale_ms: r.metrics?.rs_stale_ms, w: r.metrics?.write_stale_allows, p: r.metrics?.privileged_stale_allows, ex: r.metrics?.examples, raw: r.metrics?.read_after_write_inconsistencies, fence: r.metrics?.fence_rollback_accepted, oob: r.metrics?.rs_out_of_bound, eps: r.epsilon?.value_ms })) }, null, 2));
