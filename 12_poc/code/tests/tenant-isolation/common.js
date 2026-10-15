// Shared helpers for the tenant-isolation test group (TC-002, TC-003).
//  - run directories under 12_poc/data/tenant-isolation/<TC-ID>/<run-id>/ (§2.9 layout, frozen=true)
//  - freeze manifest (§2.2 F-3/F-4 as far as one implementer can do it; no independent witness, see deviations)
//  - persistent reference-evaluator client (ref_server.py -> ref/ref_eval.py)
//  - test-only mutants (TC-002 step (4)) materialised under 12_poc/code/.run/ (git-ignored)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Run } from '../../harness/run.js';
import { CODE_DIR, POC_DIR, DATA_DIR, RUN_SECRETS_DIR } from '../../lib/topology.js';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GROUP = 'tenant-isolation';
export const GROUP_DATA = path.join(DATA_DIR, GROUP);
export const PLAN_FILE = path.join(POC_DIR, 'preregistered-test-plan.md');
export const CONTRACTS_SRC = path.resolve(POC_DIR, '..', '11_contracts');
export const PLAN_FREEZE_COMMIT = '151940ac00dc64a89ac5a5cd148e42326e7c5e73';

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = (f) => sha256(fs.readFileSync(f));

/** All code files that the TC depends on (excluding node_modules, .run, other groups' tests). Sorted relative paths. */
export function codeFiles(codeDir = CODE_DIR) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.run'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      const rel = path.relative(codeDir, p).split(path.sep).join('/');
      if (rel.startsWith('tests/') && rel !== 'tests/tenant-isolation' && !rel.startsWith('tests/tenant-isolation/')) continue; // other groups' tests are not inputs of this group
      if (e.isDirectory()) walk(p);
      else if (/\.(js|py|json|fga|cedar)$/.test(e.name)) out.push(rel);
    }
  };
  walk(codeDir);
  return out.sort();
}

/** Manifest (§2.2 F-3/F-4) of a code tree: SHA-256 of every code file, the plan, the OpenFGA binary. */
export function manifestFor(tc, codeDir = CODE_DIR) {
  const files = {};
  for (const f of codeFiles(codeDir)) files[`12_poc/code/${f}`] = sha256File(path.join(codeDir, f));
  files['12_poc/preregistered-test-plan.md'] = sha256File(path.join(codeDir, '..', 'preregistered-test-plan.md'));
  const contracts = path.join(codeDir, '..', '..', '11_contracts');
  const walkC = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkC(p);
      else files[`11_contracts/${path.relative(contracts, p).split(path.sep).join('/')}`] = sha256File(p);
    }
  };
  if (fs.existsSync(contracts)) walkC(contracts);
  const ofga = path.join(codeDir, '..', 'tools', 'openfga', 'openfga.exe');
  if (fs.existsSync(ofga)) files['12_poc/tools/openfga/openfga.exe'] = sha256File(ofga);
  const lock = path.join(codeDir, 'package-lock.json');
  const body = { tc, plan_freeze_commit: PLAN_FREEZE_COMMIT, node: process.version, files };
  return { ...body, manifest_sha256: sha256(JSON.stringify(body)), package_lock_sha256: fs.existsSync(lock) ? sha256File(lock) : null };
}

/**
 * Freeze = snapshot. The base code (12_poc/code) is shared with other test groups that keep changing it, so the
 * frozen package of a TC is a byte copy of the code tree taken at freeze time under
 * 12_poc/code/.run/snapshots/<TC>-v<k>/code (git-ignored; node_modules, data and tools are junctions to the
 * originals). Measurement runs are started from the snapshot; the manifest (hashes) is stored under
 * 12_poc/data/tenant-isolation/_freeze/. A run whose own tree does not hash to its manifest is invalid (C-2).
 */
export function freezeSnapshot(tc) {
  const dir = path.join(GROUP_DATA, '_freeze');
  fs.mkdirSync(dir, { recursive: true });
  const k = fs.readdirSync(dir).filter((f) => f.startsWith(`manifest-${tc}-v`)).length + 1;
  const root = path.join(RUN_SECRETS_DIR, 'snapshots', `${tc}-v${k}`);
  // mini repository layout: <root>/12_poc/{code, data -> real, tools -> real, plan}, <root>/11_contracts (copy)
  const pocOut = path.join(root, '12_poc');
  const codeOut = path.join(pocOut, 'code');
  for (const f of codeFiles(CODE_DIR).concat(['package.json', 'package-lock.json'].filter((x) => fs.existsSync(path.join(CODE_DIR, x))))) {
    const to = path.join(codeOut, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(CODE_DIR, f), to);
  }
  fs.cpSync(CONTRACTS_SRC, path.join(root, '11_contracts'), { recursive: true });
  fs.copyFileSync(PLAN_FILE, path.join(pocOut, 'preregistered-test-plan.md'));
  fs.symlinkSync(path.join(CODE_DIR, 'node_modules'), path.join(codeOut, 'node_modules'), 'junction');
  fs.symlinkSync(DATA_DIR, path.join(pocOut, 'data'), 'junction');
  fs.symlinkSync(path.join(POC_DIR, 'tools'), path.join(pocOut, 'tools'), 'junction');
  const m = manifestFor(tc, codeOut);
  const file = path.join(dir, `manifest-${tc}-v${k}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...m, version: k, snapshot_root: pocOut, frozen_at: new Date().toISOString(), frozen_by: 'ai-agent (Claude)', witness: null, note: 'implementer freeze; no independent witness (deviation)' }, null, 2));
  return { file, root: pocOut, manifest: m, version: k };
}

/** C-2 check for the tree this process runs from (must be a snapshot whose manifest is stored). */
export function checkManifest(tc) {
  const dir = path.join(GROUP_DATA, '_freeze');
  const here = path.resolve(POC_DIR);
  const cands = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith(`manifest-${tc}-v`)).map((f) => ({ f: path.join(dir, f), m: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) })) : [];
  const saved = cands.find((c) => path.resolve(c.m.snapshot_root) === here);
  if (!saved) return { ok: false, reason: `not started from a frozen snapshot of ${tc} (C-2)` };
  const m = manifestFor(tc, CODE_DIR);
  if (m.manifest_sha256 !== saved.m.manifest_sha256) {
    const diff = Object.keys({ ...saved.m.files, ...m.files }).filter((k) => saved.m.files[k] !== m.files[k]);
    return { ok: false, reason: 'manifest mismatch (C-2)', diff };
  }
  return { ok: true, manifest: m, file: saved.f, version: saved.m.version, frozenAt: saved.m.frozen_at };
}

/** Run directory for this group: 12_poc/data/tenant-isolation/<TC>/<run-id>/ */
export function newRun(tc, { seed, manifestHash, purpose, prefreeze = false } = {}) {
  const r = new Run({ tc: prefreeze ? tc : `${GROUP}/${tc}`, frozen: !prefreeze, seed, manifestHash, purpose: purpose || (prefreeze ? 'prefreeze-timing' : 'measurement') });
  r.meta.tc = tc;
  r.meta.group = GROUP;
  r.meta.prefreeze = prefreeze;
  r.meta.plan = { file: '12_poc/preregistered-test-plan.md', freeze_commit: PLAN_FREEZE_COMMIT, sha256: sha256File(PLAN_FILE) };
  r.meta.code_dir = CODE_DIR;
  r.meta.code_tree_sha256 = sha256(codeFiles().map((f) => `${f}:${sha256File(path.join(CODE_DIR, f))}`).join('\n'));
  r.meta.witness = null;
  r.writeJson('run.json', r.meta);
  return r;
}

// ------------------------------------------------------------------------------------------------
// Reference evaluator client
// ------------------------------------------------------------------------------------------------
export class RefOracle {
  constructor() {
    this.p = spawn('python', ['-I', path.join(HERE, 'ref_server.py')], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.buf = '';
    this.waiters = [];
    this.err = '';
    this.p.stdout.on('data', (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i);
        this.buf = this.buf.slice(i + 1);
        const w = this.waiters.shift();
        if (w) w(JSON.parse(line));
      }
    });
    this.p.stderr.on('data', (d) => { this.err += d.toString(); });
  }
  send(msg) { return new Promise((ok) => { this.waiters.push(ok); this.p.stdin.write(JSON.stringify(msg) + '\n'); }); }
  init(cams, tuplesFile) { return this.send({ op: 'init', cams, tuples: tuplesFile }); }
  write(tuples) { return this.send({ op: 'write', tuples }); }
  delete(tuples) { return this.send({ op: 'delete', tuples }); }
  async check(model, user, type, id, permission, now = new Date()) {
    const r = await this.send({ op: 'q', model, user, type, id, permission, now: now.toISOString() });
    return r.allowed;
  }
  close() { try { this.p.stdin.end(); } catch { /* ignore */ } }
}

// ------------------------------------------------------------------------------------------------
// Mutants (test-only copies of component files with one deliberate defect)
// ------------------------------------------------------------------------------------------------
/**
 * Materialise a mutant: copies the listed files (relative to CODE_DIR) to <dir>/<rel>, applies the string
 * replacements (each must match exactly once) and rewrites relative imports to the original tree unless the
 * import target is part of the mutant set. Returns { scripts } for startStack (component -> path).
 */
export function materialiseMutant(mut, dir) {
  const set = new Set(mut.files.map((f) => f.path));
  for (const f of mut.files) {
    const src = path.join(CODE_DIR, f.path);
    let txt = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n'); // patterns are written with LF
    for (const [a, b] of f.replace || []) {
      const n = txt.split(a).length - 1;
      if (n !== 1) throw new Error(`mutant ${mut.id}: pattern occurs ${n} times in ${f.path}: ${a.slice(0, 80)}`);
      txt = txt.replace(a, () => b);
    }
    txt = txt.replace(/(from\s+|import\s*\()'(\.{1,2}\/[^']+)'/g, (m, pre, spec) => {
      const target = path.relative(CODE_DIR, path.resolve(path.dirname(src), spec)).split(path.sep).join('/');
      if (set.has(target)) return `${pre}'${spec}'`;
      return `${pre}'${pathToFileURL(path.join(CODE_DIR, target)).href}'`;
    });
    const out = path.join(dir, f.path);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `// MUTANT ${mut.id} (test-only, generated by tests/tenant-isolation/common.js; never deployed)\n${txt}`);
  }
  const scripts = {};
  for (const [comp, rel] of Object.entries(mut.components || {})) scripts[comp] = path.join(dir, rel);
  return { scripts, dir };
}

export const MUTANT_ROOT = path.join(RUN_SECRETS_DIR, 'mutants');

export function writeJsonl(file, rows) { fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')); }
export function readJsonl(file) { if (!fs.existsSync(file)) return []; return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
