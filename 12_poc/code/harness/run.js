// Run directory and raw-data conventions (test plan §2.9).
//   frozen run   : 12_poc/data/<TC-ID>/<run-id>/
//   pre-freeze   : 12_poc/data/_prefreeze/<TC-ID>/<run-id>/   (smoke / calibration; never used for pass/fail, §2.5)
// Files: run.json, env.json, inject.jsonl, requests.jsonl, decisions.jsonl, audit.jsonl, eval.json, SHA256SUMS
// (+ component sub-directories written by the stack). Append-only; aborted runs are kept with their reason.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DATA_DIR, OPENFGA_BIN, CODE_DIR } from '../lib/topology.js';

function sha256File(f) { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); }
function tryExec(cmd, args) { try { return execFileSync(cmd, args, { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `unavailable: ${(e.stderr || e.message || '').toString().trim().slice(0, 200)}`; } }

export function gitCommit() { return tryExec('git', ['-C', CODE_DIR, 'rev-parse', 'HEAD']); }
export function gitDirty() { return tryExec('git', ['-C', CODE_DIR, 'status', '--porcelain', '--', '.']).length > 0; }

export function envInfo() {
  const pkg = (n) => { try { return JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'node_modules', n, 'package.json'), 'utf8')).version; } catch { return null; } };
  return {
    captured_at: new Date().toISOString(),
    os: { platform: os.platform(), release: os.release(), arch: os.arch(), cpus: os.cpus().length, cpu_model: os.cpus()[0]?.model, total_mem: os.totalmem() },
    node: process.version,
    python: tryExec('python', ['--version']),
    packages: { 'oidc-provider': pkg('oidc-provider'), '@cedar-policy/cedar-wasm': pkg('@cedar-policy/cedar-wasm'), jose: pkg('jose'), 'fast-check': pkg('fast-check'), ajv: pkg('ajv') },
    openfga: { path: OPENFGA_BIN, sha256: fs.existsSync(OPENFGA_BIN) ? sha256File(OPENFGA_BIN) : null, version: tryExec(OPENFGA_BIN, ['version']) },
    time_sync: tryExec('w32tm', ['/query', '/status']),
    clock: { wall: new Date().toISOString(), hrtime_ns: process.hrtime.bigint().toString() },
  };
}

export class Run {
  constructor({ tc, frozen = false, runId, seed, operator = 'ai-agent (Claude)', witness = null, manifestHash = null, purpose }) {
    this.tc = tc;
    this.runId = runId || `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z')}-${crypto.randomBytes(3).toString('hex')}`;
    this.dir = frozen ? path.join(DATA_DIR, tc, this.runId) : path.join(DATA_DIR, '_prefreeze', tc, this.runId);
    fs.mkdirSync(this.dir, { recursive: true });
    this.meta = {
      tc, run_id: this.runId, frozen, purpose: purpose || (frozen ? 'measurement' : 'prefreeze'),
      manifest_hash: manifestHash, git_commit: gitCommit(), git_dirty: gitDirty(),
      started_at: new Date().toISOString(), ended_at: null, operator, witness, seed: seed ?? null, status: 'running',
    };
    this.writeJson('run.json', this.meta);
    this.writeJson('env.json', envInfo());
    this.streams = new Map();
  }

  file(name) { return path.join(this.dir, name); }
  writeJson(name, obj) { fs.writeFileSync(this.file(name), JSON.stringify(obj, null, 2)); }
  append(name, rec) { fs.appendFileSync(this.file(name), JSON.stringify({ t: new Date().toISOString(), ...rec }) + '\n'); }

  /** Finish: status 'completed' | 'aborted:<C-x reason>'. Writes SHA256SUMS over every file in the run directory. */
  finish(status = 'completed', extra = {}) {
    this.meta = { ...this.meta, ...extra, status, ended_at: new Date().toISOString() };
    this.writeJson('run.json', this.meta);
    const lines = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name !== 'SHA256SUMS' && !e.name.endsWith('.sqlite-shm') && !e.name.endsWith('.sqlite-wal')) lines.push(`${sha256File(p)}  ${path.relative(this.dir, p).split(path.sep).join('/')}`);
      }
    };
    walk(this.dir);
    lines.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
    fs.writeFileSync(this.file('SHA256SUMS'), lines.join('\n') + '\n');
    return this.meta;
  }
}

/** Latency helper: monotonic clock in µs plus wall-clock ISO time. */
export function stamp() { return { wall: new Date().toISOString(), mono_us: Number(process.hrtime.bigint() / 1000n) }; }
