// Component bootstrap helpers: argument parsing, structured logging, ready signalling.
// Every component is started as `node <component>.js --topology <file> [--name <instance>]` and prints
// a single line `READY <name> <url>` on stdout once it is listening (the harness waits for it).
import fs from 'node:fs';
import { loadTopology, loadSecrets } from './topology.js';

export function args(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[k] = v;
    }
  }
  return out;
}

export function boot(defaultName) {
  const a = args();
  const file = a.topology || process.env.POC_TOPOLOGY;
  if (!file) {
    console.error('usage: node <component>.js --topology <topology.json>');
    process.exit(2);
  }
  const topo = loadTopology(file);
  const secrets = loadSecrets(topo);
  const name = a.name || defaultName;
  return { topo, secrets, name, args: a, log: logger(name) };
}

export function logger(name) {
  const level = process.env.POC_LOG || 'info';
  const order = { debug: 0, info: 1, warn: 2, error: 3 };
  const emit = (lvl, msg, extra) => {
    if (order[lvl] < order[level]) return;
    const line = JSON.stringify({ t: new Date().toISOString(), c: name, lvl, msg, ...(extra || {}) });
    (lvl === 'error' || lvl === 'warn' ? process.stderr : process.stderr).write(line + '\n');
  };
  return {
    debug: (m, e) => emit('debug', m, e),
    info: (m, e) => emit('info', m, e),
    warn: (m, e) => emit('warn', m, e),
    error: (m, e) => emit('error', m, e),
  };
}

export function ready(name, url) {
  process.stdout.write(`READY ${name} ${url}\n`);
}

export function onShutdown(fn) {
  const h = async () => { try { await fn(); } finally { process.exit(0); } };
  process.on('SIGTERM', h);
  process.on('SIGINT', h);
  // Windows: the harness also sends "shutdown\n" on stdin as a portable stop signal
  if (process.stdin && !process.stdin.isTTY) {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => { if (String(d).includes('shutdown')) h(); });
    process.stdin.on('error', () => {});
  }
}

export function readJsonFile(f, dflt) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; }
}
