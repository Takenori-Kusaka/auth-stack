// Shared helpers for the test group "engine-swap-perf-audit" (TC-001, TC-013, TC-016, TC-017, TC-018, TC-019,
// TC-020, TC-022, TC-023, TC-026, TC-027, TC-028; see README.md in this directory).
// - fixed port block per TC (group-private range 43000 + nn*20, so that this group never collides with the
//   other test groups that run in parallel on the README POC-03 blocks 42000–42599)
// - frozen run directories under 12_poc/data/engine-swap-perf-audit/<TC>/<run-id>/ (test plan §2.9)
// - freeze manifest (test plan §2.2 F-3/F-4; C-2 check at run start)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Run } from '../../harness/run.js';
import { CODE_DIR, POC_DIR, DATA_DIR, OPENFGA_BIN } from '../../lib/topology.js';

export const GROUP = 'engine-swap-perf-audit';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FROZEN_PLAN_COMMIT = '151940ac00dc64a89ac5a5cd148e42326e7c5e73';
export const REPO_DIR = path.resolve(POC_DIR, '..');
export const GROUP_BASE = 43000;

/** Port block of a TC for this group: 43000 + nn*20 (+ sub-block offset for a second concurrent stack). */
export function groupPortBase(tc, sub = 0) {
  const n = Number(/^TC-0*(\d+)$/.exec(tc)[1]);
  return GROUP_BASE + n * 20 + sub * 600; // sub=1 -> 43600 + nn*20 (second stack of the same TC)
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = (f) => sha(fs.readFileSync(f));

function walk(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.run', 'out'].includes(e.name) && !(dir === path.join(CODE_DIR, 'tests') && e.name !== GROUP)) walk(p, filter, out); }
    else if (filter(p)) out.push(p);
  }
  return out;
}

/** Files that make up the freeze package of one TC (plan, params, test, evaluator, platform code, tools). */
export function packageFiles(tc) {
  const code = walk(CODE_DIR, (p) => /\.(js|json|py)$/.test(p) && !p.endsWith('package-lock.json'))
    .filter((p) => !p.includes(`${path.sep}tests${path.sep}`) || p.includes(`${path.sep}tests${path.sep}${GROUP}${path.sep}`));
  return code.sort();
}

/** The frozen plan is the version in the frozen commit (the working tree may carry later, unfrozen edits). */
export function frozenPlan() {
  const buf = execFileSync('git', ['-C', REPO_DIR, 'show', `${FROZEN_PLAN_COMMIT}:12_poc/preregistered-test-plan.md`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  const wt = fs.readFileSync(path.join(POC_DIR, 'preregistered-test-plan.md'));
  return { sha256: sha(buf), worktree_sha256: sha(wt), worktree_differs: sha(buf) !== sha(wt) };
}

export function buildManifest(tc) {
  const plan = frozenPlan();
  const files = [{ path: `12_poc/preregistered-test-plan.md@${FROZEN_PLAN_COMMIT}`, sha256: plan.sha256 }, ...packageFiles(tc).map((f) => ({ path: path.relative(REPO_DIR, f).split(path.sep).join('/'), sha256: sha256File(f) }))];
  const pkg = (n) => { try { return JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'node_modules', n, 'package.json'), 'utf8')).version; } catch { return null; } };
  const tools = {
    openfga: { path: path.relative(REPO_DIR, OPENFGA_BIN).split(path.sep).join('/'), sha256: fs.existsSync(OPENFGA_BIN) ? sha256File(OPENFGA_BIN) : null },
    cedar_wasm: { version: pkg('@cedar-policy/cedar-wasm'), wasm_sha256: (() => { try { return sha256File(path.join(CODE_DIR, 'node_modules/@cedar-policy/cedar-wasm/nodejs/cedar_wasm_bg.wasm')); } catch { return null; } })() },
    'oidc-provider': pkg('oidc-provider'), jose: pkg('jose'), 'fast-check': pkg('fast-check'), node: process.version,
  };
  const body = { tc, group: GROUP, plan_frozen_commit: FROZEN_PLAN_COMMIT, files, tools };
  const hash = sha(JSON.stringify(body));
  return { ...body, manifest_sha256: hash };
}

function manifestPath(tc, ver) { return path.join(DATA_DIR, '_freeze', GROUP, `manifest-${tc}-v${ver}.json`); }
export function latestManifest(tc) {
  const dir = path.join(DATA_DIR, '_freeze', GROUP);
  if (!fs.existsSync(dir)) return null;
  const vs = fs.readdirSync(dir).map((f) => new RegExp(`^manifest-${tc}-v(\\d+)\\.json$`).exec(f)).filter(Boolean).map((m) => Number(m[1]));
  if (!vs.length) return null;
  const v = Math.max(...vs);
  return { ver: v, ...JSON.parse(fs.readFileSync(manifestPath(tc, v), 'utf8')) };
}
/** Freeze (F-3/F-4 without the witness steps F-5: deviation DEV-01). Writes a new version only when the content changed. */
export function freeze(tc, reason = 'initial freeze') {
  const m = buildManifest(tc);
  const prev = latestManifest(tc);
  if (prev && prev.manifest_sha256 === m.manifest_sha256) return prev;
  const ver = prev ? prev.ver + 1 : 1;
  fs.mkdirSync(path.dirname(manifestPath(tc, ver)), { recursive: true });
  const out = { ...m, version: ver, frozen_at: new Date().toISOString(), reason, previous: prev ? { ver: prev.ver, manifest_sha256: prev.manifest_sha256 } : null, witness: null };
  fs.writeFileSync(manifestPath(tc, ver), JSON.stringify(out, null, 2));
  return out;
}

export function planUnchangedSinceFreeze() {
  try {
    const frozen = execFileSync('git', ['-C', REPO_DIR, 'show', `${FROZEN_PLAN_COMMIT}:12_poc/preregistered-test-plan.md`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
    return sha(frozen) === sha256File(path.join(POC_DIR, 'preregistered-test-plan.md'));
  } catch { return false; }
}

export function loadParams(tc) {
  const f = path.join(HERE, 'params', `${tc}.json`);
  return { file: f, sha256: sha256File(f), ...JSON.parse(fs.readFileSync(f, 'utf8')) };
}

/**
 * Open a frozen run: checks C-2 (manifest of the current tree == latest frozen manifest) and that the plan is
 * byte-identical to the frozen commit. On mismatch the run is created and immediately finished as aborted:C-2.
 */
export const HARNESS_CHECK = process.argv.includes('--harness-check');

export function openRun(tc, { seed = 1, purpose = 'measurement' } = {}) {
  if (HARNESS_CHECK) {
    // §2.5 harness check (smoke): pre-freeze directory, no evaluation of pass/fail metrics
    const params = loadParams(tc);
    const run = new Run({ tc: `${GROUP}/${tc}`, frozen: false, seed, purpose: 'harness-check (§2.5: smoke, no pass/fail evaluation)' });
    return { run, params, manifest: null };
  }
  const m = latestManifest(tc);
  const cur = buildManifest(tc);
  const params = loadParams(tc);
  const run = new Run({ tc: `${GROUP}/${tc}`, frozen: true, seed, manifestHash: cur.manifest_sha256, witness: null, purpose });
  run.meta.tc_id = tc;
  run.meta.group = GROUP;
  run.meta.params = { file: path.relative(REPO_DIR, params.file).split(path.sep).join('/'), sha256: params.sha256 };
  run.meta.frozen_manifest = m ? { version: m.ver, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at } : null;
  const fp = frozenPlan();
  run.meta.plan = { file: '12_poc/preregistered-test-plan.md', frozen_commit: FROZEN_PLAN_COMMIT, followed: 'frozen commit version (v0.1)', frozen_sha256: fp.sha256, worktree_sha256: fp.worktree_sha256, worktree_differs_from_frozen: fp.worktree_differs };
  run.meta.code_tree_sha256 = cur.manifest_sha256;
  run.meta.port_base = groupPortBase(tc);
  run.writeJson('run.json', run.meta);
  const c2 = !m ? 'no frozen manifest' : m.manifest_sha256 !== cur.manifest_sha256 ? `manifest mismatch frozen=${m.manifest_sha256} current=${cur.manifest_sha256}` : null;
  if (c2) {
    const diff = m ? cur.files.filter((f) => !m.files.find((g) => g.path === f.path && g.sha256 === f.sha256)).map((f) => f.path) : [];
    run.writeJson('c2-mismatch.json', { reason: c2, changed_files: diff });
    run.finish('aborted:C-2', { abort_reason: c2 });
    throw Object.assign(new Error(`C-2: ${c2}`), { run, abort: 'C-2' });
  }
  return { run, params, manifest: m };
}

/** Quantile directly from the sample (nearest-rank, §2.7). */
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}
export function bootstrapCI(sample, q, { B = 1000, seed = 1 } = {}) {
  if (sample.length < 2) return null;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const est = [];
  for (let b = 0; b < B; b++) {
    const r = new Array(sample.length);
    for (let i = 0; i < sample.length; i++) r[i] = sample[Math.floor(rnd() * sample.length)];
    r.sort((x, y) => x - y);
    est.push(quantile(r, q));
  }
  est.sort((x, y) => x - y);
  return [quantile(est, 0.025), quantile(est, 0.975)];
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Write eval.json with the hashes of the input files used (§2.6 (2)). */
export function writeEval(run, evalObj, inputs = []) {
  const hashes = {};
  for (const f of inputs) { const p = path.isAbsolute(f) ? f : run.file(f); if (fs.existsSync(p)) hashes[path.relative(run.dir, p).split(path.sep).join('/')] = sha256File(p); }
  run.writeJson('eval.json', { evaluated_at: new Date().toISOString(), evaluator: 'tests/engine-swap-perf-audit (frozen with the TC manifest)', witness_signature: null, ...evalObj, input_hashes: hashes });
}

export function readJsonl(f) { return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; }
