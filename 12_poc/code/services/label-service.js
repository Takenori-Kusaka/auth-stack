// label-service (reference service C): data-classification labels of files, kept in its own store with the
// owner tenant per file (resource-derived tenant for L0). Called by file-service (B) for
// GET /t/:tid/files/:id?labels=1, which makes tool.run a three-service chain A (tool) -> B (file) -> C (label)
// under one Txn-Token (claims-catalog §2.4, TC-016).
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { createServer, listen, send, peerCert } from '../lib/http.js';
import { spiffeIdFromPeer } from '../lib/pki.js';
import { tlsFor } from '../lib/topology.js';
import { createPep } from '../pep/sdk.js';

const { topo, secrets, log } = boot('label-service');
const ds = readJsonFile(topo.files.dataset, { files: [] });
const labels = new Map(ds.files.map((f) => [f.id, { tid: f.tid, labels: f.labels || ['INT'] }]));
const pep = await createPep({ topo, secrets, workload: 'label-service', log });
const resolver = async ({ id }) => { const l = labels.get(id); return l ? { tid: l.tid } : { notFound: true }; };

async function handler(req, res) {
  const url = new URL(req.url, 'https://local');
  if (url.pathname === '/healthz') return send(res, 200, { ok: true });
  if (url.pathname.startsWith('/admin/')) {
    const who = spiffeIdFromPeer(peerCert(req));
    if (who !== topo.workloads.harness.spiffeId && who !== topo.workloads.admin.spiffeId) return send(res, 403, { error: 'forbidden' });
    if (url.pathname === '/admin/counters') return send(res, 200, { counters: pep.counterSnapshot(), audit: pep.audit.counters });
    return send(res, 404, { error: 'not_found' });
  }
  const g = await pep.guard(req, res, { resolver });
  if (!g.ok) return;
  const { ep, params } = g.ctx;
  if (ep.id === 'label.read') return send(res, 200, { id: params.id, labels: labels.get(params.id).labels, decision_id: g.ctx.decision.decision_id });
  return send(res, 404, { error: 'not_found' });
}

const server = createServer({ tls: tlsFor(topo, 'label-service', { mtls: 'required' }), handler, onError: (e) => log.error('handler', { e: e.stack }) });
await listen(server, topo.ports.label);
ready('label-service', topo.urls.label);
onShutdown(async () => { pep.stop(); await new Promise((r) => server.close(r)); });
