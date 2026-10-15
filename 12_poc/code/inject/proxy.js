// Fault-injection proxy (test plan §3.1 "障害注入プロキシ", fail-mode FM-01/FM-02/FM-13).
//   node inject/proxy.js --topology <t> --name inj-pep --listen <port> --upstream <host:port> --mode tcp|http
// Control: the proxy polls a JSON file <secretsDir>/inject-<name>.json ({ mode, ms, status, ... }) every 50 ms,
// so the harness changes faults without an extra port. Every applied change is appended to
// <dataDir>/inject/<name>.jsonl (the inject.jsonl of §2.9).
// tcp modes : pass | delay {ms} | blackhole | reset
// http modes: pass | delay {ms} | blackhole | reset | status {status} | allow_all | deny_all | stale_body {replace:{k:v}}
// (http mode is for the plain-HTTP façade -> OpenFGA link; tcp mode works on any link including mTLS ones)
import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { boot, ready, onShutdown } from '../lib/runtime.js';

const { topo, name, args, log } = boot('inject-proxy');
const listenPort = Number(args.listen);
const [uh, up] = String(args.upstream).split(':');
const mode = args.mode || 'tcp';
const ctlFile = path.join(topo.secretsDir, `inject-${name}.json`);
const logDir = path.join(topo.dataDir, 'inject');
fs.mkdirSync(logDir, { recursive: true });
const injLog = path.join(logDir, `${name}.jsonl`);
const sockets = new Set();
let cfg = { mode: 'pass' };
let lastRaw = '';
function poll() {
  try {
    const raw = fs.existsSync(ctlFile) ? fs.readFileSync(ctlFile, 'utf8') : '{"mode":"pass"}';
    if (raw !== lastRaw) {
      lastRaw = raw;
      cfg = JSON.parse(raw);
      // a new fault must also hit kept-alive connections: drop them so clients reconnect into the new mode
      if (cfg.mode !== 'pass' && !cfg.keepExisting) for (const so of sockets) so.destroy();
      fs.appendFileSync(injLog, JSON.stringify({ t: new Date().toISOString(), hr: process.hrtime.bigint().toString(), applied: cfg }) + '\n');
    }
  } catch { /* partial write: retry next tick */ }
}
poll();
const timer = setInterval(poll, 50);

let server;
if (mode === 'tcp') {
  server = net.createServer((client) => {
    sockets.add(client);
    client.on('close', () => sockets.delete(client));
    const c = cfg;
    if (c.mode === 'reset') { client.resetAndDestroy ? client.resetAndDestroy() : client.destroy(); return; }
    if (c.mode === 'blackhole') { client.on('data', () => {}); client.on('error', () => {}); return; }
    const connect = () => {
      const upstream = net.connect(Number(up), uh);
      sockets.add(upstream);
      upstream.on('close', () => sockets.delete(upstream));
      client.pipe(upstream).pipe(client);
      const kill = () => { client.destroy(); upstream.destroy(); };
      client.on('error', kill);
      upstream.on('error', kill);
    };
    if (c.mode === 'delay') { client.pause(); setTimeout(() => { client.resume(); connect(); }, c.ms || 1000); }
    else if (c.mode === 'delay_each') {
      // RK-10: every client -> upstream chunk is held for ms (models a PDP that answers every request late, FM-01),
      // unlike 'delay', which only delays the connection set-up and leaves kept-alive connections fast
      const upstream = net.connect(Number(up), uh);
      sockets.add(upstream);
      upstream.on('close', () => sockets.delete(upstream));
      client.on('data', (d) => setTimeout(() => { if (!upstream.destroyed) upstream.write(d); }, c.ms || 1000));
      upstream.pipe(client);
      const kill = () => { client.destroy(); upstream.destroy(); };
      client.on('error', kill); upstream.on('error', kill); client.on('close', () => upstream.destroy());
    } else connect();
  });
} else {
  server = http.createServer((req, res) => {
    const c = cfg;
    if (c.mode === 'reset') { req.socket.destroy(); return; }
    if (c.mode === 'blackhole') return;
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () => {
      const go = () => {
        if (c.mode === 'status') { res.writeHead(c.status || 500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ code: 'injected', message: 'injected fault' })); return; }
        const ureq = http.request({ host: uh, port: Number(up), method: req.method, path: req.url, headers: req.headers }, (ures) => {
          const out = [];
          ures.on('data', (d) => out.push(d));
          ures.on('end', () => {
            let buf = Buffer.concat(out);
            if (['allow_all', 'deny_all', 'stale_body'].includes(c.mode) && /json/.test(ures.headers['content-type'] || '')) {
              try {
                const j = JSON.parse(buf.toString('utf8'));
                if (c.mode === 'allow_all' && 'allowed' in j) j.allowed = true;
                if (c.mode === 'deny_all' && 'allowed' in j) j.allowed = false;
                if (c.mode === 'stale_body' && c.replace) Object.assign(j, c.replace);
                buf = Buffer.from(JSON.stringify(j));
              } catch { /* leave body */ }
            }
            const h = { ...ures.headers, 'content-length': buf.length };
            res.writeHead(ures.statusCode, h);
            res.end(buf);
          });
        });
        ureq.on('error', () => { if (!res.headersSent) { res.writeHead(502); res.end(); } });
        ureq.end(Buffer.concat(chunks));
      };
      if (c.mode === 'delay') setTimeout(go, c.ms || 1000); else go();
    });
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
}
server.listen(listenPort, '127.0.0.1', () => ready(name, `${mode}://127.0.0.1:${listenPort}`));
onShutdown(() => { clearInterval(timer); for (const s of sockets) s.destroy(); return new Promise((r) => server.close(r)); });
log.info('inject proxy', { listenPort, upstream: args.upstream, mode });
