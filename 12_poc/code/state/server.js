// Cell state store (ADR-006 失効状態の配布、ADR-005 D1-6 発行台帳、ADR-021 D21-07 配置、G 段規則 2・3・6 の状態).
// One process per cell. Consumers (PEP SDK, edge, STS/TTS, façade) poll it; every change bumps `epoch`.
//  - revocations: scope ∈ {sub, sid, gref, client, tid, cell, kid, jti_ref} × revoked_at (ms). A token issued at or
//    before revoked_at for a matching scope is revoked (範囲×失効時刻の境界, ADR-006 D6-06).
//  - status: tenant / subject suspension (G 段規則 2・3), freeze flag (規則 6).
//  - placement: tenant -> cell (signed distribution in the design; plain here, documented gap).
//  - ledger: issued jti_ref set (ADR-005 D1-6 privileged checks).
import fs from 'node:fs';
import path from 'node:path';
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { createServer, listen, router, readJson, send, peerCert } from '../lib/http.js';
import { spiffeIdFromPeer } from '../lib/pki.js';
import { tlsFor } from '../lib/topology.js';

const { topo, log } = boot('state-store');
const dataset = readJsonFile(topo.files.dataset, { tenants: [] });
const st = {
  epoch: 1,
  revocations: [], // { epoch, scope, value, at, reason }
  tenants: {}, // tid -> 'active' | 'suspended'
  subjects: {}, // sub -> 'active' | 'suspended'
  freeze: false,
  algPolicy: null, // RK-07: versioned crypto profile (CP) for verifiers { version, at: [...], txn: [...] }
  placement: {}, // tid -> cell
  ledger: new Map(), // jti_ref -> { iss, kind, exp }
};
for (const t of dataset.tenants || []) { st.placement[t.id] = t.cell || topo.cellId; st.tenants[t.id] = t.status || 'active'; }
const logFile = path.join(topo.dataDir, 'state-changes.jsonl');
function record(ev) { fs.appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), epoch: st.epoch, ...ev }) + '\n'); }

const writers = new Set(['as-a', 'as-b', 'sts', 'pdp', 'admin', 'harness', 'edge'].map((n) => topo.workloads[n].spiffeId));
function caller(req) { return spiffeIdFromPeer(peerCert(req)); }
function mustWrite(req, res) {
  if (!writers.has(caller(req))) { send(res, 403, 'forbidden'); return false; }
  return true;
}

const SCOPES = new Set(['sub', 'sid', 'gref', 'client', 'tid', 'cell', 'kid', 'jti_ref']);
const r = router();
r.add('GET', '/healthz', (q, s) => send(s, 200, { ok: true, epoch: st.epoch }));
r.add('GET', '/revocations', (req, res, p, url) => {
  const since = Number(url.searchParams.get('since') || 0);
  return send(res, 200, {
    epoch: st.epoch,
    served_at: Date.now(),
    entries: st.revocations.filter((e) => e.epoch > since),
    status: { tenants: st.tenants, subjects: st.subjects, freeze: st.freeze, ...(st.algPolicy ? { alg_policy: st.algPolicy } : {}) },
    placement: st.placement,
  });
});
r.add('POST', '/revocations', async (req, res) => {
  if (!mustWrite(req, res)) return;
  const b = (await readJson(req)) || {};
  const list = Array.isArray(b.entries) ? b.entries : [b];
  const out = [];
  for (const e of list) {
    if (!SCOPES.has(e.scope) || typeof e.value !== 'string') return send(res, 400, 'bad revocation');
    st.epoch += 1;
    const ent = { epoch: st.epoch, scope: e.scope, value: e.value, at: e.at || Date.now(), reason: e.reason || 'unspecified', revocation_id: e.revocation_id };
    st.revocations.push(ent);
    record({ op: 'revoke', ...ent });
    out.push(ent);
  }
  log.info('revoked', { n: out.length, epoch: st.epoch });
  return send(res, 200, { epoch: st.epoch, entries: out });
});
r.add('POST', '/status', async (req, res) => {
  if (!mustWrite(req, res)) return;
  const b = (await readJson(req)) || {};
  if (b.kind === 'tenant') st.tenants[b.id] = b.status;
  else if (b.kind === 'subject') st.subjects[b.id] = b.status;
  else if (b.kind === 'freeze') st.freeze = !!b.status;
  else if (b.kind === 'alg_policy') {
    // RK-07 (ADR-015 D15-71): monotonic CP versions; re-presenting an older or equal version is refused
    const v = Number(b.id);
    if (!Number.isInteger(v) || !b.status || !Array.isArray(b.status.at) || !Array.isArray(b.status.txn)) return send(res, 400, 'bad alg_policy');
    if (st.algPolicy && v <= st.algPolicy.version) { record({ op: 'alg_policy_rejected', version: v, current: st.algPolicy.version }); return send(res, 409, { error: 'stale_cp_version', current: st.algPolicy.version }); }
    st.algPolicy = { version: v, at: b.status.at, txn: b.status.txn };
  }
  else return send(res, 400, 'bad status');
  st.epoch += 1;
  record({ op: 'status', ...b });
  return send(res, 200, { epoch: st.epoch });
});
r.add('POST', '/placement', async (req, res) => {
  if (!mustWrite(req, res)) return;
  const b = (await readJson(req)) || {};
  st.placement[b.tid] = b.cell;
  st.epoch += 1;
  record({ op: 'placement', ...b });
  return send(res, 200, { epoch: st.epoch });
});
r.add('POST', '/ledger', async (req, res) => {
  if (!mustWrite(req, res)) return;
  const b = (await readJson(req)) || {};
  for (const e of [].concat(b.entries || b)) st.ledger.set(e.jti_ref, { iss: e.iss, kind: e.kind, exp: e.exp });
  return send(res, 200, { size: st.ledger.size });
});
r.add('GET', '/ledger/:ref', (req, res, p) => (st.ledger.has(p.ref) ? send(res, 200, st.ledger.get(p.ref)) : send(res, 404, 'unknown')));

const server = createServer({ tls: tlsFor(topo, 'state-store', { mtls: 'required' }), handler: (q, s) => r.handle(q, s), onError: (e) => log.error('handler', { e: e.message }) });
await listen(server, topo.ports.state);
ready('state-store', topo.urls.state);
onShutdown(() => new Promise((res) => server.close(res)));
