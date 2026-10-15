// Shared helpers for the test group "revocation-consistency" (TC-008, TC-009, TC-012; see README.md here).
// - port blocks: README POC-03 §5 (TC-008 = 42160, TC-009 = 42180, TC-012 = 42240); a second concurrent
//   stack of the same TC uses the group-private block 44000 + nn*20 (never used by the other groups)
// - frozen run directories: 12_poc/data/revocation-consistency/<TC>/<run-id>/ (test plan §2.9)
// - freeze manifest (test plan §2.2 F-3/F-4, without the witness step F-5 -> deviation RC-DEV-01) and C-2 check
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Run } from '../../harness/run.js';
import { CODE_DIR, POC_DIR, DATA_DIR, OPENFGA_BIN } from '../../lib/topology.js';
import { generate } from '../../data/gen-synthetic.js';
import { syntheticId, seededRng } from '../../lib/ids.js';
import { portBase } from '../../config/ports.js';

export const GROUP = 'revocation-consistency';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FROZEN_PLAN_COMMIT = '151940ac00dc64a89ac5a5cd148e42326e7c5e73';
export const REPO_DIR = path.resolve(POC_DIR, '..');

export function tcPortBase(tc, sub = 0) {
  if (sub === 0) return portBase(tc);
  const n = Number(/^TC-0*(\d+)$/.exec(tc)[1]);
  return 44000 + n * 20 + (sub - 1) * 600;
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = (f) => sha(fs.readFileSync(f));
export const sha256 = sha;

function walk(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.run', 'out'].includes(e.name)) continue;
      if (dir === path.join(CODE_DIR, 'tests') && e.name !== GROUP) continue; // other groups' tests are not ours
      walk(p, filter, out);
    } else if (filter(p)) out.push(p);
  }
  return out;
}

// files of this group that belong to another TC are not part of this TC's package
const mine = (p, tc) => { const rel = path.relative(path.join(CODE_DIR, 'tests', GROUP), p); if (rel.startsWith('..')) return true; return rel === 'common.js' || rel.includes(tc); };
export function buildManifest(tc) {
  const files = walk(CODE_DIR, (p) => /\.(js|json|py)$/.test(p) && !p.endsWith('package-lock.json') && !p.endsWith('package.json') && mine(p, tc)).sort()
    .map((f) => ({ path: path.relative(REPO_DIR, f).split(path.sep).join('/'), sha256: sha256File(f) }));
  const pkg = (n) => { try { return JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'node_modules', n, 'package.json'), 'utf8')).version; } catch { return null; } };
  const tools = {
    openfga: { sha256: fs.existsSync(OPENFGA_BIN) ? sha256File(OPENFGA_BIN) : null },
    cedar_wasm: pkg('@cedar-policy/cedar-wasm'), 'oidc-provider': pkg('oidc-provider'), jose: pkg('jose'), 'fast-check': pkg('fast-check'), node: process.version,
  };
  const body = { tc, group: GROUP, plan_frozen_commit: FROZEN_PLAN_COMMIT, files, tools };
  return { ...body, manifest_sha256: sha(JSON.stringify(body)) };
}

const manifestDir = () => path.join(DATA_DIR, GROUP, '_freeze');
function manifestPath(tc, ver) { return path.join(manifestDir(), `manifest-${tc}-v${ver}.json`); }
export function latestManifest(tc) {
  if (!fs.existsSync(manifestDir())) return null;
  const vs = fs.readdirSync(manifestDir()).map((f) => new RegExp(`^manifest-${tc}-v(\\d+)\\.json$`).exec(f)).filter(Boolean).map((m) => Number(m[1]));
  if (!vs.length) return null;
  const v = Math.max(...vs);
  return { ver: v, ...JSON.parse(fs.readFileSync(manifestPath(tc, v), 'utf8')) };
}

/** Freeze (F-3/F-4). A new version is written only when the content changed; the reason is kept. */
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

export function loadParams(tc) {
  const f = path.join(HERE, 'params', `${tc}.json`);
  return { file: f, sha256: sha256File(f), ...JSON.parse(fs.readFileSync(f, 'utf8')) };
}

export function gitHead() { try { return execFileSync('git', ['-C', REPO_DIR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } }

/** Open a frozen run (C-2 check: current tree == latest frozen manifest, plan identical to the frozen commit). */
export function openRun(tc, { seed = 1, purpose = 'measurement', prefreeze = false } = {}) {
  const m = latestManifest(tc);
  const cur = buildManifest(tc);
  const params = loadParams(tc);
  const run = prefreeze
    ? new Run({ tc: `${GROUP}/${tc}`, frozen: false, seed, purpose })
    : new Run({ tc: `${GROUP}/${tc}`, frozen: true, seed, manifestHash: cur.manifest_sha256, witness: null, purpose });
  Object.assign(run.meta, {
    tc_id: tc, group: GROUP, repo_head: gitHead(),
    params: { file: path.relative(REPO_DIR, params.file).split(path.sep).join('/'), sha256: params.sha256 },
    frozen_manifest: m ? { version: m.ver, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at } : null,
    plan: { file: '12_poc/preregistered-test-plan.md', frozen_commit: FROZEN_PLAN_COMMIT, governing: 'frozen commit blob', working_tree_identical_to_frozen: planUnchangedSinceFreeze() },
    code_tree_sha256: cur.manifest_sha256, port_base: tcPortBase(tc),
  });
  run.writeJson('run.json', run.meta);
  if (prefreeze) return { run, params, manifest: m };
  const c2 = !m ? 'no frozen manifest' : m.manifest_sha256 !== cur.manifest_sha256 ? `manifest mismatch frozen=${m.manifest_sha256} current=${cur.manifest_sha256}` : null; // the governing plan is the blob of the frozen commit (read from git); a later working-tree edit of the plan is recorded, not an abort (RC-DEV-09)
  if (c2) {
    const diff = m ? cur.files.filter((f) => !m.files.find((g) => g.path === f.path && g.sha256 === f.sha256)).map((f) => f.path) : [];
    run.writeJson('c2-mismatch.json', { reason: c2, changed_files: diff });
    run.finish('aborted:C-2', { abort_reason: c2 });
    throw Object.assign(new Error(`C-2: ${c2}`), { run, abort: 'C-2' });
  }
  return { run, params, manifest: m };
}

/**
 * Synthetic dataset (DEC-4) plus fresh "probe" users that are members of the largest tenant and have no
 * other relation (no groups, no ownership), so that every grant they hold is one the test wrote.
 */
export function datasetWithProbeUsers({ seed = 1, profile = 'small', n = 8, tag = 'probe' } = {}) {
  const ds = generate({ seed, profile });
  const tenant = ds.tenants.find((t) => t.size === 'L') || ds.tenants[0];
  const rng = seededRng(`${tag}:${seed}`);
  const users = [];
  for (let i = 0; i < n; i++) {
    const id = syntheticId(rng);
    ds.users.push({ id, status: 'active', memberships: [{ tid: tenant.id, kind: 'member', status: 'active' }], probe: true });
    ds.tuples.push({ tid: tenant.id, resource: { type: 'core/tenant', id: tenant.id }, relation: 'member', subject: { type: 'core/user', id } });
    users.push(id);
  }
  return { ds, tenant, users };
}

/** Nearest-rank quantile from the sample (§2.7). */
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}
export function summary(values) {
  const s = [...values].sort((a, b) => a - b);
  return { n: s.length, min: s[0] ?? null, p50: quantile(s, 0.5), p99: quantile(s, 0.99), max: s.length ? s[s.length - 1] : null };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const monoMs = () => Number(process.hrtime.bigint()) / 1e6;

export function writeCsv(file, rows, cols) {
  const c = cols || (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v) => { if (v === undefined || v === null) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  fs.writeFileSync(file, [c.join(','), ...rows.map((r) => c.map((k) => esc(r[k])).join(','))].join('\n') + '\n');
}

/**
 * Open-loop prober (§2.7: arrival times fixed in advance, latency measured from the scheduled time).
 * fn(k) -> Promise<{ status, ... }>. Records scheduled / sent / response times on the harness monotonic clock (ms).
 */
export function startProber({ name, intervalMs, fn, onResult }) {
  const t0 = monoMs();
  let k = 0;
  let stopped = false;
  const inflight = new Set();
  const tick = () => {
    if (stopped) return;
    const sched = t0 + k * intervalMs;
    const idx = k++;
    const sent = monoMs();
    const p = (async () => {
      let r;
      try { r = await fn(idx); } catch (e) { r = { status: 0, error: e.message }; }
      const resp = monoMs();
      onResult({ probe: name, k: idx, sched_ms: sched, sent_ms: sent, resp_ms: resp, wall: new Date().toISOString(), ...r });
    })();
    inflight.add(p);
    p.finally(() => inflight.delete(p));
    const next = t0 + k * intervalMs;
    setTimeout(tick, Math.max(0, next - monoMs()));
  };
  tick();
  return { stop: async () => { stopped = true; await Promise.allSettled([...inflight]); } };
}

/**
 * Keep-alive race with the 5 s server idle timeout (lib/http.js keepAliveTimeout): a reused idle socket can be
 * reset before the request is read. Retry harness requests (idempotent in these tests) on ECONNRESET / EPIPE /
 * ECONNABORTED. Measurement probes do not use this (a failed probe is recorded as status 0, i.e. not an allow).
 */
export function hardenReq(s) {
  const req0 = s.req;
  s.req = async (url, o) => { for (let i = 0; ; i++) { try { return await req0(url, o); } catch (e) { if (i >= 3 || !['ECONNRESET', 'EPIPE', 'ECONNABORTED'].includes(e.code)) throw e; await sleep(50); } } };
  return s;
}
