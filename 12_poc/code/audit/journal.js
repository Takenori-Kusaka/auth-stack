// Cell audit journal (ADR-014 D14-23 "journaled" stage). Append-only JSONL with an independent copy.
// - mTLS; only registered producers are accepted, and a producer may only write records carrying its own
//   producer_id (DV-9).
// - Every record is validated against 11_contracts/schemas/audit-event.schema.json; invalid records are kept
//   in journal-invalid.jsonl (never silently dropped) and counted.
// - Outage injection (TC-011 H1): POST /admin/outage {down:true|false} makes /events answer 503.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { boot, ready, onShutdown } from '../lib/runtime.js';
import { createServer, listen, router, readJson, send, peerCert } from '../lib/http.js';
import { spiffeIdFromPeer } from '../lib/pki.js';
import { tlsFor } from '../lib/topology.js';
import { CONTRACTS_DIR } from '../lib/jwt.js';

const { topo, log } = boot('journal');
const schema = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'schemas/audit-event.schema.json'), 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const dir = path.join(topo.dataDir, 'audit');
const copyDir = path.join(topo.dataDir, 'audit-copy');
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(copyDir, { recursive: true });
const journalFile = path.join(dir, 'journal.jsonl');
const copyFile = path.join(copyDir, 'journal.jsonl');
const invalidFile = path.join(dir, 'journal-invalid.jsonl');

const registered = new Set(Object.values(topo.workloads).map((w) => w.spiffeId));
const state = { down: false, accepted: 0, invalid: 0, refused: 0 };

const r = router();
r.add('POST', '/events', async (req, res) => {
  if (state.down) { state.refused++; return send(res, 503, 'journal unavailable', { 'retry-after': '1' }); }
  const peer = spiffeIdFromPeer(peerCert(req));
  if (!peer || !registered.has(peer)) return send(res, 401, 'unregistered producer');
  const body = await readJson(req);
  const recs = (body && Array.isArray(body.records)) ? body.records : [];
  let accepted = 0, invalid = 0;
  const lines = [], bad = [];
  for (const rec of recs) {
    if (!rec || !rec.integrity || rec.integrity.producer_id !== peer) { bad.push({ reason: 'producer_mismatch', peer, rec }); invalid++; continue; }
    const out = { ...rec, record_stage: 'journaled', received_time: new Date().toISOString() };
    if (!validate(out)) {
      bad.push({ reason: 'schema', errors: validate.errors.slice(0, 10), rec: out });
      invalid++;
      continue;
    }
    lines.push(JSON.stringify(out));
    accepted++;
  }
  if (lines.length) {
    const blob = lines.join('\n') + '\n';
    fs.appendFileSync(journalFile, blob);
    fs.appendFileSync(copyFile, blob); // independent copy (TC-016 中止基準 C-6 の前提)
  }
  if (bad.length) fs.appendFileSync(invalidFile, bad.map((b) => JSON.stringify(b)).join('\n') + '\n');
  state.accepted += accepted;
  state.invalid += invalid;
  if (invalid) log.warn('invalid audit records', { invalid, first: bad[0] && (bad[0].errors || bad[0].reason) });
  return send(res, 200, { accepted, invalid });
});
r.add('POST', '/admin/outage', async (req, res) => {
  const b = (await readJson(req)) || {};
  state.down = !!b.down;
  log.info('outage toggled', { down: state.down });
  return send(res, 200, { down: state.down });
});
r.add('GET', '/admin/stats', (req, res) => send(res, 200, { ...state, journalFile, copyFile }));
r.add('GET', '/healthz', (req, res) => send(res, 200, { ok: true }));

const server = createServer({ tls: tlsFor(topo, 'journal', { mtls: 'required' }), handler: (q, s) => r.handle(q, s), onError: (e) => log.error('handler', { e: e.message }) });
await listen(server, topo.ports.journal);
ready('journal', topo.urls.journal);
onShutdown(() => new Promise((res) => server.close(res)));
