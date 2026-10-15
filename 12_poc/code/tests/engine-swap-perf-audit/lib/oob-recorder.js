// TC-022 helper process: out-of-band record store for break-glass (ADR-029 D29-74: if the out-of-band record cannot
// be written, break-glass is not executed). Plain HTTP on loopback, append-only JSONL in its own directory.
//   node oob-recorder.js <port> <dir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [port, dir] = [Number(process.argv[2]), process.argv[3]];
fs.mkdirSync(dir, { recursive: true });
const f = path.join(dir, 'oob-records.jsonl');
http.createServer((req, res) => {
  let b = '';
  req.on('data', (d) => (b += d));
  req.on('end', () => {
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    try { const rec = JSON.parse(b); fs.appendFileSync(f, JSON.stringify({ t: new Date().toISOString(), ...rec }) + '\n'); res.writeHead(201, { 'content-type': 'application/json' }); res.end('{"ok":true}'); } catch { res.writeHead(400); res.end(); }
  });
}).listen(port, '127.0.0.1', () => process.stdout.write(`READY oob-recorder ${port}\n`));
process.stdin.on('data', (d) => { if (String(d).includes('shutdown')) process.exit(0); });
