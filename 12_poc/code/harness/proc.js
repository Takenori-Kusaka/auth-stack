// Process management for tests: start/stop/kill components, wait for readiness, capture logs.
// Each TC starts and stops its own processes (no shared long-running services between TCs).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { request } from '../lib/http.js';

export class ProcGroup {
  constructor({ logDir }) {
    this.logDir = logDir;
    fs.mkdirSync(logDir, { recursive: true });
    this.procs = new Map();
  }

  /**
   * start(name, command, args, { env, cwd, ready: { line?: RegExp, url?: string, tls? }, timeoutMs })
   * Resolves when the readiness condition holds. stdout/stderr go to <logDir>/<name>.log.
   */
  start(name, command, args, opts = {}) {
    if (this.procs.has(name)) throw new Error(`${name} already running`);
    const log = fs.createWriteStream(path.join(this.logDir, `${name}.log`), { flags: 'a' });
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const p = { name, child, log, startedAt: Date.now(), exited: null };
    this.procs.set(name, p);
    child.on('exit', (code, sig) => { p.exited = { code, sig, at: Date.now() }; log.write(`\n# exited code=${code} sig=${sig}\n`); });
    child.stderr.on('data', (d) => log.write(d));
    const timeoutMs = opts.timeoutMs || 30_000;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err) reject(err); else resolve(p);
      };
      const timer = setTimeout(() => finish(new Error(`${name} not ready within ${timeoutMs} ms (see ${path.join(this.logDir, name + '.log')})`)), timeoutMs);
      let buf = '';
      child.stdout.on('data', (d) => {
        log.write(d);
        if (opts.ready && opts.ready.line) {
          buf += d.toString();
          if (opts.ready.line.test(buf)) finish();
          if (buf.length > 100_000) buf = buf.slice(-10_000);
        }
      });
      child.on('exit', (code) => finish(new Error(`${name} exited during startup (code ${code}); see ${name}.log`)));
      child.on('error', (e) => finish(e));
      if (opts.ready && opts.ready.url) {
        const poll = async () => {
          while (!done) {
            try {
              const r = await request(opts.ready.url, { tls: opts.ready.tls, timeoutMs: 1000 });
              if (r.status < 500) return finish();
            } catch { /* not yet */ }
            await new Promise((r) => setTimeout(r, 150));
          }
        };
        poll();
      }
      if (!opts.ready) finish();
    });
  }

  /** Graceful stop: "shutdown" on stdin, then hard kill after graceMs. */
  async stop(name, { graceMs = 3000 } = {}) {
    const p = this.procs.get(name);
    if (!p) return;
    this.procs.delete(name);
    if (p.exited) return p.exited;
    const exited = new Promise((r) => p.child.once('exit', (code, sig) => r({ code, sig })));
    try { p.child.stdin.write('shutdown\n'); } catch { /* ignore */ }
    const t = setTimeout(() => { try { p.child.kill('SIGKILL'); } catch { /* ignore */ } }, graceMs);
    const res = await exited;
    clearTimeout(t);
    p.log.end();
    return res;
  }

  /** Hard kill (fault injection: process crash). */
  async kill(name) {
    const p = this.procs.get(name);
    if (!p) return;
    this.procs.delete(name);
    if (p.exited) return p.exited;
    const exited = new Promise((r) => p.child.once('exit', (code, sig) => r({ code, sig })));
    p.child.kill('SIGKILL');
    const res = await exited;
    p.log.end();
    return res;
  }

  running(name) { const p = this.procs.get(name); return !!(p && !p.exited); }

  async stopAll() {
    const names = [...this.procs.keys()].reverse();
    for (const n of names) await this.stop(n);
  }
}
