// Shared helpers for the test group "resilience-keys" (TC-010, TC-014, TC-015; README.md in this directory).
// - port blocks: config/ports.js (TC-010 = 42200, TC-014 = 42280, TC-015 = 42300); offsets 18 (spare2) and 19
//   (harness) of each block are used by in-process harness listeners of this group (JWKS redirector, attacker server)
// - run directories: 12_poc/data/resilience-keys/<TC>/<run-id>/ (test plan §2.9)
// - self-made freeze manifest (test plan §2.2 F-3/F-4; F-5 witness not available -> deviation RK-DEV-01) and C-2 check
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Run } from '../../harness/run.js';
import { CODE_DIR, POC_DIR, DATA_DIR, OPENFGA_BIN } from '../../lib/topology.js';
import { portBase } from '../../config/ports.js';

export const GROUP = 'resilience-keys';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FROZEN_PLAN_COMMIT = '151940ac00dc64a89ac5a5cd148e42326e7c5e73';
export const REPO_DIR = path.resolve(POC_DIR, '..');

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = (f) => sha(fs.readFileSync(f));
export const sha256 = sha;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function walk(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.run', 'out'].includes(e.name)) continue;
      if (dir === path.join(CODE_DIR, 'tests') && e.name !== GROUP) continue; // other groups' tests are not part of our SUT
      walk(p, filter, out);
    } else if (filter(p)) out.push(p);
  }
  return out;
}

/** Hash of every code / config file the run depends on (the code is not committed: git HEAD alone does not identify it). */
export function buildManifest(tc) {
  const files = walk(CODE_DIR, (p) => /\.(js|json|py|cedar|fga)$/.test(p) && !p.endsWith('package-lock.json')).sort()
    .map((f) => ({ path: path.relative(REPO_DIR, f).split(path.sep).join('/'), sha256: sha256File(f) }));
  const pkg = (n) => { try { return JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'node_modules', n, 'package.json'), 'utf8')).version; } catch { return null; } };
  const tools = {
    openfga: { sha256: fs.existsSync(OPENFGA_BIN) ? sha256File(OPENFGA_BIN) : null },
    cedar_wasm: pkg('@cedar-policy/cedar-wasm'), 'oidc-provider': pkg('oidc-provider'), jose: pkg('jose'), node: process.version,
    contracts: ['11_contracts/schemas/access-token-claims.schema.json', '11_contracts/schemas/audit-event.schema.json'].map((p) => ({ path: p, sha256: sha256File(path.join(REPO_DIR, p)) })),
  };
  const body = { tc, group: GROUP, plan_frozen_commit: FROZEN_PLAN_COMMIT, files, tools };
  return { ...body, manifest_sha256: sha(JSON.stringify(body)) };
}

const manifestDir = () => path.join(DATA_DIR, GROUP, '_freeze');
const manifestPath = (tc, ver) => path.join(manifestDir(), `manifest-${tc}-v${ver}.json`);
export function latestManifest(tc) {
  if (!fs.existsSync(manifestDir())) return null;
  const vs = fs.readdirSync(manifestDir()).map((f) => new RegExp(`^manifest-${tc}-v(\\d+)\\.json$`).exec(f)).filter(Boolean).map((m) => Number(m[1]));
  if (!vs.length) return null;
  const v = Math.max(...vs);
  return { ver: v, ...JSON.parse(fs.readFileSync(manifestPath(tc, v), 'utf8')) };
}

/** Freeze (F-3/F-4, without F-5). A new version is written only when the content changed; the reason is kept. */
export function freeze(tc, reason = 'initial freeze') {
  const m = buildManifest(tc);
  const prev = latestManifest(tc);
  if (prev && prev.manifest_sha256 === m.manifest_sha256) return prev;
  const ver = prev ? prev.ver + 1 : 1;
  fs.mkdirSync(manifestDir(), { recursive: true });
  const changed = prev ? m.files.filter((f) => !prev.files.find((g) => g.path === f.path && g.sha256 === f.sha256)).map((f) => f.path) : [];
  const out = { ...m, version: ver, frozen_at: new Date().toISOString(), reason, changed_since_previous: changed, previous: prev ? { ver: prev.ver, manifest_sha256: prev.manifest_sha256 } : null, witness: null };
  fs.writeFileSync(manifestPath(tc, ver), JSON.stringify(out, null, 2));
  return { ver, ...out };
}

export function planUnchangedSinceFreeze() {
  try {
    const frozen = execFileSync('git', ['-C', REPO_DIR, 'show', `${FROZEN_PLAN_COMMIT}:12_poc/preregistered-test-plan.md`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
    return sha(frozen) === sha256File(path.join(POC_DIR, 'preregistered-test-plan.md'));
  } catch { return false; }
}

export function loadParams(tc, name = tc) {
  const f = path.join(HERE, 'params', `${name}.json`);
  return { file: f, sha256: sha256File(f), ...JSON.parse(fs.readFileSync(f, 'utf8')) };
}

export function gitHead() { try { return execFileSync('git', ['-C', REPO_DIR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } }

/** Open a measurement run (C-2 check: current tree == latest frozen manifest, plan identical to the frozen commit). */
export function openRun(tc, { seed = 1, purpose = 'measurement', paramsName } = {}) {
  const m = latestManifest(tc);
  const cur = buildManifest(tc);
  const params = loadParams(tc, paramsName);
  const run = new Run({ tc: `${GROUP}/${tc}`, frozen: true, seed, manifestHash: cur.manifest_sha256, witness: null, purpose });
  Object.assign(run.meta, {
    tc_id: tc, group: GROUP, repo_head: gitHead(),
    params: { file: path.relative(REPO_DIR, params.file).split(path.sep).join('/'), sha256: params.sha256 },
    frozen_manifest: m ? { version: m.ver, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at } : null,
    plan: { file: '12_poc/preregistered-test-plan.md', frozen_commit: FROZEN_PLAN_COMMIT, identical_to_frozen: planUnchangedSinceFreeze() },
    code_tree_sha256: cur.manifest_sha256, port_base: portBase(tc),
    note: 'self-made freeze manifest; independent witness (F-5, §2.6) not available -> provisional result (RK-DEV-01)',
  });
  run.writeJson('run.json', run.meta);
  const c2 = !m ? 'no frozen manifest' : m.manifest_sha256 !== cur.manifest_sha256 ? `manifest mismatch frozen=${m.manifest_sha256} current=${cur.manifest_sha256}` : null;
  // The plan text is not part of the execution environment: the authoritative plan is the frozen commit (read with
  // git show). A working-tree edit of the plan by another party (v0.2, 2026-10-15T02:52:30Z) is recorded, not a C-2
  // abort (deviation RK-DEV-05).
  if (!run.meta.plan.identical_to_frozen) { run.meta.plan.working_tree_differs = true; run.writeJson('run.json', run.meta); }
  if (c2) {
    const diff = m ? cur.files.filter((f) => !m.files.find((g) => g.path === f.path && g.sha256 === f.sha256)).map((f) => f.path) : [];
    run.writeJson('c2-mismatch.json', { reason: c2, changed_files: diff });
    run.finish('aborted:C-2', { abort_reason: c2 });
    throw Object.assign(new Error(`C-2: ${c2}`), { run, abort: 'C-2' });
  }
  return { run, params, manifest: m };
}

/** Nearest-rank quantile from the sample (§2.7: quantiles are computed from the stored sample). */
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

/** TCP client connections to `port` with their owning PID (netstat -ano). Windows only; returns [] elsewhere. */
export function tcpClientsTo(port) {
  return new Promise((resolve) => {
    execFile('netstat', ['-ano', '-p', 'tcp'], { windowsHide: true, timeout: 5000, maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
      if (err || !out) return resolve({ ok: false, rows: [] });
      const rows = [];
      for (const line of out.split(/\r?\n/)) {
        const m = /^\s*TCP\s+(\S+):(\d+)\s+(\S+):(\d+)\s+(\S+)\s+(\d+)/.exec(line);
        if (!m) continue;
        if (Number(m[4]) === port && ['ESTABLISHED', 'SYN_SENT'].includes(m[5])) rows.push({ local: `${m[1]}:${m[2]}`, state: m[5], pid: Number(m[6]) });
      }
      resolve({ ok: true, rows });
    });
  });
}

/** Append-only JSONL writer bound to a run directory (adds a high-resolution stamp). */
export function recorder(run, file) {
  return (rec) => run.append(file, { mono_us: Number(process.hrtime.bigint() / 1000n), ...rec });
}

export function readJsonl(f) {
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

export function writeEval(dir, ev) {
  const inputs = [];
  const walkDir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walkDir(p); else if (!/^eval(-rd+)?.json$/.test(e.name) && e.name !== 'SHA256SUMS' && !/\.sqlite/.test(e.name)) inputs.push({ file: path.relative(dir, p).split(path.sep).join('/'), sha256: sha256File(p) }); } };
  walkDir(dir);
  const out = { ...ev, evaluated_at: new Date().toISOString(), evaluator: { file: path.relative(REPO_DIR, ev.evaluatorFile || '').split(path.sep).join('/'), sha256: ev.evaluatorFile ? sha256File(ev.evaluatorFile) : null }, inputs };
  delete out.evaluatorFile;
  // never overwrite an evaluator output: later re-evaluations go to eval-rN.json (§2.9 append-only)
  let name = 'eval.json';
  for (let i = 2; fs.existsSync(path.join(dir, name)); i++) name = `eval-r${i}.json`;
  out.output_file = name;
  fs.writeFileSync(path.join(dir, name), JSON.stringify(out, null, 2));
  return out;
}
