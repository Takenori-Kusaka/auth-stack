// tool-service (reference service A): tool instances under projects. tool.run reads an input file from
// file-service on behalf of the user (hop A -> B): the access token is re-exchanged at the STS for the
// file-service audience (act = tool-service) and the Txn-Token / traceparent are passed unchanged (OB-09).
import crypto from 'node:crypto';
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { createServer, listen, readJson, send, peerCert } from '../lib/http.js';
import { spiffeIdFromPeer } from '../lib/pki.js';
import { tlsFor } from '../lib/topology.js';
import { createPep } from '../pep/sdk.js';

const { topo, secrets, log } = boot('tool-service');
const ds = readJsonFile(topo.files.dataset, { tools: [] });
const tools = new Map(ds.tools.map((t) => [t.id, { ...t, config: {} }]));
const pep = await createPep({ topo, secrets, workload: 'tool-service', log });
const resolver = async ({ id }) => { const t = tools.get(id); return t ? { tid: t.tid } : { notFound: true }; };

async function handler(req, res) {
  const url = new URL(req.url, 'https://local');
  if (url.pathname === '/healthz') return send(res, 200, { ok: true });
  if (url.pathname.startsWith('/admin/')) {
    const who = spiffeIdFromPeer(peerCert(req));
    if (who !== topo.workloads.harness.spiffeId && who !== topo.workloads.admin.spiffeId) return send(res, 403, { error: 'forbidden' });
    if (url.pathname === '/admin/counters') return send(res, 200, { counters: pep.counterSnapshot(), audit: pep.audit.counters });
    return send(res, 404, { error: 'not_found' });
  }
  const body = ['POST', 'PUT'].includes(req.method) ? (await readJson(req)) || {} : {};
  const g = await pep.guard(req, res, { resolver });
  if (!g.ok) return;
  const { ep, params, tid } = g.ctx;
  const tool = tools.get(params.id);
  switch (ep.id) {
    case 'tool.view':
      return send(res, 200, { id: tool.id, project: tool.project });
    case 'tool.run': {
      if (typeof body.file_id !== 'string') return send(res, 400, { error: 'invalid_request' });
      const down = await pep.callDownstream(g.ctx, {
        baseUrl: topo.urls.file, audience: topo.audiences.file, scope: 'files.read', method: 'GET', path: `/t/${tid}/files/${encodeURIComponent(body.file_id)}${body.with_labels ? '?labels=1' : ''}`,
      });
      if (down.error) return send(res, 503, { error: 'unavailable' });
      if (down.status !== 200) return send(res, down.status === 404 ? 404 : 503, { error: down.status === 404 ? 'not_found' : 'unavailable' });
      const content = String(down.body.content || '');
      return send(res, 200, {
        tool: tool.id, input: body.file_id,
        result: { length: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex') },
        decision_id: g.ctx.decision.decision_id, downstream_decision_id: down.body.decision_id,
        ...(down.body.labels ? { labels: down.body.labels, label_decision_id: down.body.label_decision_id } : {}),
      });
    }
    case 'tool.config': {
      const cfg = body.config;
      if (!cfg || typeof cfg !== 'object' || Object.keys(body).some((k) => k !== 'config')) return send(res, 400, { error: 'invalid_request' });
      tool.config = cfg;
      return send(res, 200, { id: tool.id, config: tool.config });
    }
    default:
      return send(res, 404, { error: 'not_found' });
  }
}

const server = createServer({ tls: tlsFor(topo, 'tool-service', { mtls: 'required' }), handler, onError: (e) => log.error('handler', { e: e.stack }) });
await listen(server, topo.ports.tool);
ready('tool-service', topo.urls.tool);
onShutdown(async () => { pep.stop(); await new Promise((r) => server.close(r)); });
