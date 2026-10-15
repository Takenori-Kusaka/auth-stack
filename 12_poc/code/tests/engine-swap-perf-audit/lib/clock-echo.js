// TC-001 helper process: an HTTP endpoint that answers with its own clock readings (wall clock with sub-ms
// resolution via performance.timeOrigin + performance.now(), Date.now(), and the monotonic hrtime).
//   node clock-echo.js <port>
import http from 'node:http';
import { performance } from 'node:perf_hooks';

const port = Number(process.argv[2]);
const srv = http.createServer((req, res) => {
  const body = JSON.stringify({ wall_hr: performance.timeOrigin + performance.now(), wall_ms: Date.now(), mono_ns: process.hrtime.bigint().toString(), pid: process.pid });
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
});
srv.keepAliveTimeout = 60_000;
srv.listen(port, '127.0.0.1', () => process.stdout.write(`READY clock-echo ${port}\n`));
process.stdin.on('data', (d) => { if (String(d).includes('shutdown')) process.exit(0); });
