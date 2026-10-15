// Open-loop load generator (test plan §2.7): arrival times are fixed in advance (Poisson process from a seeded
// PRNG); every request is fired at its scheduled time regardless of outstanding responses, and latency is measured
// from the scheduled send time (avoids coordinated omission). All samples are kept; failures are counted, not dropped.
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { seededRng } from '../../../lib/ids.js';

export function schedule(rate, n, seed) {
  const rng = seededRng(`sched:${seed}:${rate}:${n}`);
  const out = new Float64Array(n);
  let t = 0;
  for (let i = 0; i < n; i++) { t += -Math.log(1 - rng()) / rate * 1000; out[i] = t; } // ms offsets
  return out;
}

/**
 * fire(i) -> Promise<{ ok: boolean, status?: number, err?: string }>
 * Returns samples [{ i, sched_ms, sent_ms, done_ms, lat_ms (done - sched), send_lag_ms, ok, status, err }]
 */
export function openLoop({ rate, n, seed, fire, startDelayMs = 300 }) {
  const offs = schedule(rate, n, seed);
  const samples = new Array(n);
  const t0 = performance.now() + startDelayMs;
  const wall0 = Date.now() + startDelayMs;
  let i = 0, done = 0;
  return new Promise((resolve) => {
    const finish = (idx, sched, sent, res) => {
      const end = performance.now();
      samples[idx] = { i: idx, sched_ms: +(sched - t0).toFixed(3), sent_ms: +(sent - t0).toFixed(3), lat_ms: +(end - sched).toFixed(3), send_lag_ms: +(sent - sched).toFixed(3), ok: !!res.ok, status: res.status ?? null, err: res.err ?? null };
      if (++done === n) resolve({ samples, t0_wall: new Date(wall0).toISOString(), duration_ms: performance.now() - t0 });
    };
    const tick = () => {
      const now = performance.now();
      while (i < n && t0 + offs[i] <= now) {
        const idx = i++;
        const sched = t0 + offs[idx];
        const sent = performance.now();
        let p;
        try { p = Promise.resolve(fire(idx)); } catch (e) { p = Promise.resolve({ ok: false, err: e.message }); }
        p.then((res) => finish(idx, sched, sent, res || { ok: false, err: 'no result' }), (e) => finish(idx, sched, sent, { ok: false, err: String(e.code || e.message).slice(0, 80) }));
      }
      if (i < n) {
        const gap = t0 + offs[i] - performance.now();
        if (gap > 4) setTimeout(tick, gap - 3); else setImmediate(tick);
      }
    };
    tick();
  });
}

/** Host CPU utilisation sampler (all cores) using os.cpus() deltas. */
export function cpuSampler(intervalMs = 1000) {
  const snap = () => os.cpus().map((c) => c.times);
  let prev = snap();
  const out = [];
  const timer = setInterval(() => {
    const cur = snap();
    let busy = 0, total = 0;
    cur.forEach((t, k) => { const p = prev[k]; const b = (t.user - p.user) + (t.sys - p.sys) + (t.irq - p.irq) + (t.nice - p.nice); const tot = b + (t.idle - p.idle); busy += b; total += tot; });
    prev = cur;
    out.push({ t: new Date().toISOString(), cpu_util: total ? busy / total : null, free_mem: os.freemem() });
  }, intervalMs);
  timer.unref();
  return { stop: () => { clearInterval(timer); return out; }, samples: out };
}

/** CPU seconds per process (Windows, PowerShell Get-Process). Returns Map(pid -> cpu seconds). */
export function processCpu() {
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command', 'Get-Process | ForEach-Object { "$($_.Id) $($_.CPU) $($_.ProcessName)" }'], { encoding: 'utf8', timeout: 20_000, windowsHide: true });
    const m = new Map();
    for (const line of out.split(/\r?\n/)) { const [pid, cpu, ...name] = line.trim().split(' '); if (pid && cpu) m.set(Number(pid), { cpu: Number(cpu) || 0, name: name.join(' ') }); }
    return m;
  } catch { return null; }
}

/** CPU used by processes outside `ownPids` between two processCpu() snapshots, as a share of host capacity. */
export function foreignCpuShare(before, after, ownPids, wallMs) {
  if (!before || !after) return null;
  let sec = 0;
  const top = [];
  for (const [pid, a] of after) {
    if (ownPids.has(pid) || pid === 0) continue;
    if (/^Idle$|^System$|^Memory Compression$/.test(a.name)) continue;
    const b = before.get(pid);
    const d = a.cpu - (b ? b.cpu : 0);
    if (d > 0) { sec += d; top.push({ pid, name: a.name, cpu_s: +d.toFixed(2) }); }
  }
  top.sort((x, y) => y.cpu_s - x.cpu_s);
  return { foreign_cpu_s: +sec.toFixed(2), share: sec / ((wallMs / 1000) * os.cpus().length), top: top.slice(0, 8) };
}

export function summarize(samples) {
  const lat = samples.filter((s) => s.ok).map((s) => s.lat_ms).sort((a, b) => a - b);
  const all = samples.map((s) => s.lat_ms).sort((a, b) => a - b);
  const q = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.max(0, Math.ceil(p * arr.length) - 1))] : null);
  return { n: samples.length, ok: lat.length, failed: samples.length - lat.length, p50: q(lat, 0.5), p99: q(lat, 0.99), p999: q(lat, 0.999), max: lat.length ? lat[lat.length - 1] : null, p99_all_incl_failed: q(all, 0.99), max_send_lag_ms: Math.max(...samples.map((s) => s.send_lag_ms)) };
}
