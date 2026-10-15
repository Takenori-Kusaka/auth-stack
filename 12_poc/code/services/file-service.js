// file-service (reference service B): files and folders with the resource owner tenant in its own store
// (resource-derived tenant, ADR-021 D21-14), PEP SDK on every entry point, relationship updates through a
// transactional outbox (authorization-model.md §11, CL-0157 / TC-009) and consistency tokens stored with the
// content (CT-1). Store: node:sqlite file under the run data directory.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { createServer, listen, readJson, send, request, peerCert } from '../lib/http.js';
import { spiffeIdFromPeer } from '../lib/pki.js';
import { tlsFor, clientTls } from '../lib/topology.js';
import { opaqueId, syntheticId } from '../lib/ids.js';
import { createPep } from '../pep/sdk.js';

const { topo, secrets, log } = boot('file-service');
const dir = path.join(topo.dataDir, 'file-service');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, 'files.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, tid TEXT NOT NULL, parent TEXT, owner TEXT);
  CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, tid TEXT NOT NULL, folder TEXT NOT NULL, owner TEXT, content TEXT, version INTEGER NOT NULL DEFAULT 1, ctoken TEXT);
  CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, tid TEXT NOT NULL, payload TEXT NOT NULL, file_id TEXT, delivered INTEGER NOT NULL DEFAULT 0, delivered_at TEXT, attempts INTEGER NOT NULL DEFAULT 0);
`);
const seeded = db.prepare('SELECT COUNT(*) AS n FROM folders').get().n > 0;
if (!seeded) {
  const ds = readJsonFile(topo.files.dataset, { folders: [], files: [] });
  const insF = db.prepare('INSERT INTO folders (id, tid, parent, owner) VALUES (?, ?, ?, ?)');
  const insD = db.prepare('INSERT INTO files (id, tid, folder, owner, content) VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  for (const f of ds.folders) insF.run(f.id, f.tid, f.parent, f.owner);
  for (const d of ds.files) insD.run(d.id, d.tid, d.folder, d.owner, d.content);
  db.exec('COMMIT');
}
const q = {
  file: db.prepare('SELECT * FROM files WHERE id = ?'),
  folder: db.prepare('SELECT * FROM folders WHERE id = ?'),
  filesIn: db.prepare('SELECT id FROM files WHERE folder = ? AND tid = ? ORDER BY id'),
  updContent: db.prepare('UPDATE files SET content = ?, version = version + 1, ctoken = COALESCE(?, ctoken) WHERE id = ?'),
  insFile: db.prepare('INSERT INTO files (id, tid, folder, owner, content) VALUES (?, ?, ?, ?, ?)'),
  delFile: db.prepare('DELETE FROM files WHERE id = ?'),
  moveFile: db.prepare('UPDATE files SET folder = ?, version = version + 1 WHERE id = ?'),
  setCtoken: db.prepare('UPDATE files SET ctoken = ? WHERE id = ?'),
  outboxAdd: db.prepare('INSERT INTO outbox (tid, payload, file_id) VALUES (?, ?, ?)'),
  outboxPending: db.prepare('SELECT * FROM outbox WHERE delivered = 0 ORDER BY seq LIMIT 50'),
  outboxDone: db.prepare('UPDATE outbox SET delivered = 1, delivered_at = ?, attempts = attempts + 1 WHERE seq = ?'),
  outboxFail: db.prepare('UPDATE outbox SET attempts = attempts + 1 WHERE seq = ?'),
};

const pep = await createPep({ topo, secrets, workload: 'file-service', log });
const tls = clientTls(topo, 'file-service');
const kUrl = Buffer.from(secrets.kSignedUrl, 'hex');
// fault knobs for TC-009 / TC-024 (POST /admin/fault from harness/admin)
const fault = { outboxDelayMs: Number(process.env.FILE_OUTBOX_DELAY_MS || 0), duplicateDelivery: false, crashAfterCommit: false, crashBeforeCommit: false, crashAfterDeliver: false, pauseOutbox: false };

const resolver = async ({ type, id }) => {
  const row = type === 'files/folder' ? q.folder.get(id) : q.file.get(id);
  if (!row) return { notFound: true };
  return { tid: row.tid };
};

// ---- outbox delivery (ordered, idempotent via idempotency_key) --------------------------------------
let delivering = false;
async function deliverOutbox() {
  if (delivering || fault.pauseOutbox) return;
  delivering = true;
  try {
    for (const row of q.outboxPending.all()) {
      if (fault.outboxDelayMs) await new Promise((r) => setTimeout(r, fault.outboxDelayMs));
      const payload = JSON.parse(row.payload);
      const sendOnce = () => request(`${topo.urls.pdp}/v1/tenants/${row.tid}/relationships/write`, {
        method: 'POST', tls, timeoutMs: 3000,
        body: { ...payload, idempotency_key: `fs-${row.seq}-${topo.runId}` },
      });
      let r;
      try { r = await sendOnce(); } catch (e) { q.outboxFail.run(row.seq); break; }
      if (fault.duplicateDelivery) { try { await sendOnce(); } catch { /* duplicate attempt */ } }
      if (r.status === 200) {
        if (fault.crashAfterDeliver) { log.warn('crashAfterDeliver fault: exiting before marking the outbox row'); process.exit(19); }
        q.outboxDone.run(new Date().toISOString(), row.seq);
        if (row.file_id) q.setCtoken.run(r.json().consistency_token, row.file_id);
      } else {
        q.outboxFail.run(row.seq);
        log.warn('outbox delivery rejected', { seq: row.seq, status: r.status, body: r.text.slice(0, 200) });
        if (r.status >= 500) break;
        q.outboxDone.run(`rejected:${r.status}`, row.seq); // do not retry a permanent rejection forever
      }
    }
  } finally { delivering = false; }
}
const outboxTimer = setInterval(() => deliverOutbox().catch(() => {}), 100);

function txWithOutbox(fn, tid, payload, fileId) {
  db.exec('BEGIN IMMEDIATE');
  try {
    fn();
    if (payload) q.outboxAdd.run(tid, JSON.stringify(payload), fileId || null);
    if (fault.crashBeforeCommit) { log.warn('crashBeforeCommit fault: exiting inside the transaction'); process.exit(18); }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  if (fault.crashAfterCommit) { log.warn('crashAfterCommit fault: exiting'); process.exit(17); }
}

const T = (type, id, relation, st, sid, srel, condition) => ({ resource: { type, id }, relation, subject: srel ? { type: st, id: sid, relation: srel } : { type: st, id: sid }, ...(condition ? { condition } : {}) });
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const fileView = (f) => pick(f, ['id', 'folder', 'content', 'version']); // excessive data exposure guard (TC-003 d)

function signUrl(fileId, tid, ttlSec) {
  const body = Buffer.from(JSON.stringify({ f: fileId, t: tid, op: 'read', iat: Date.now(), exp: Date.now() + ttlSec * 1000, j: opaqueId() })).toString('base64url');
  return `${body}.${crypto.createHmac('sha256', kUrl).update(body).digest('base64url')}`;
}
function readSignedUrl(tok) {
  const i = tok.lastIndexOf('.');
  if (i < 0) return null;
  const body = tok.slice(0, i);
  const mac = crypto.createHmac('sha256', kUrl).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(tok.slice(i + 1).padEnd(mac.length).slice(0, mac.length)))) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
}

async function handler(req, res) {
  const url = new URL(req.url, 'https://local');
  if (url.pathname === '/healthz') return send(res, 200, { ok: true });
  if (url.pathname.startsWith('/admin/')) {
    const who = spiffeIdFromPeer(peerCert(req));
    if (who !== topo.workloads.harness.spiffeId && who !== topo.workloads.admin.spiffeId) return send(res, 403, { error: 'forbidden' });
  }
  if (url.pathname === '/admin/fault' && req.method === 'POST') {
    Object.assign(fault, (await readJson(req)) || {});
    return send(res, 200, fault);
  }
  if (url.pathname === '/admin/counters') return send(res, 200, { counters: pep.counterSnapshot(), audit: pep.audit.counters, outboxPending: q.outboxPending.all().length });
  // public signed-URL download (TC-024): bound to object, tenant and operation; lifetime L_url
  const dl = /^\/dl\/([^/]+)$/.exec(url.pathname);
  if (dl && req.method === 'GET') {
    const s = readSignedUrl(dl[1]);
    const f = s && q.file.get(s.f);
    const ok = s && s.op === 'read' && s.exp > Date.now() && f && f.tid === s.t;
    pep.local({ ep: 'file.download', result: ok ? 'permitted' : 'denied', internal_reason: 'public_static', file: s?.f });
    if (!ok) return send(res, 404, { error: 'not_found' });
    return send(res, 200, fileView(f));
  }
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? (await readJson(req)) || {} : {};
  // consistency token stored with the content (CT-2): pass the file's token on reads
  const pre = /^\/t\/[^/]+\/files\/([^/]+)$/.exec(url.pathname);
  const ctoken = pre && req.method === 'GET' ? q.file.get(pre[1])?.ctoken || undefined : undefined;
  const g = await pep.guard(req, res, { resolver, consistencyToken: ctoken });
  if (!g.ok) return;
  const { ep, params, principal, tid } = g.ctx;
  switch (ep.id) {
    case 'file.read': {
      const f = q.file.get(params.id);
      const out = { ...fileView(f), decision_id: g.ctx.decision.decision_id };
      if (url.searchParams.get('labels') === '1') {
        // hop B -> C: re-exchange for the label-service audience, Txn-Token / traceparent unchanged
        const down = await pep.callDownstream(g.ctx, { baseUrl: topo.urls.label, audience: topo.audiences.label, scope: 'files.read', path: `/t/${tid}/labels/${encodeURIComponent(f.id)}` });
        if (down.error || down.status !== 200) return send(res, down.status === 404 ? 404 : 503, { error: down.status === 404 ? 'not_found' : 'unavailable' });
        out.labels = down.body.labels;
        out.label_decision_id = down.body.decision_id;
      }
      return send(res, 200, out);
    }
    case 'file.write': {
      const extra = Object.keys(body).filter((k) => k !== 'content');
      if (extra.length) return send(res, 400, { error: 'invalid_request' }); // mass assignment guard (TC-003 c)
      q.updContent.run(String(body.content ?? ''), g.ctx.decision.consistency?.token ?? null, params.id); // K-3: token of the fresh write check, same statement
      return send(res, 200, fileView(q.file.get(params.id)));
    }
    case 'file.delete': {
      const f = q.file.get(params.id);
      txWithOutbox(() => q.delFile.run(params.id), tid, { deletes: [T('files/file', f.id, 'parent', 'files/folder', f.folder), T('files/file', f.id, 'owner', 'core/user', f.owner)] });
      deliverOutbox().catch(() => {});
      return send(res, 204);
    }
    case 'file.create': {
      const id = syntheticId();
      const content = String(body.content ?? '');
      txWithOutbox(() => q.insFile.run(id, tid, params.id, principal.sub, content), tid,
        { writes: [T('files/file', id, 'parent', 'files/folder', params.id), T('files/file', id, 'owner', 'core/user', principal.sub)] }, id);
      await deliverOutbox();
      return send(res, 201, fileView(q.file.get(id)));
    }
    case 'file.share': {
      const grantee = body.grantee_sub;
      if (typeof grantee !== 'string') return send(res, 400, { error: 'invalid_request' });
      const writes = [];
      if (body.external) {
        const gid = syntheticId();
        const expires_at = body.expires_at || new Date(Date.now() + 7 * 86400_000).toISOString();
        writes.push(T('core/external_grant', gid, 'grantee', 'core/user', grantee, null, { name: 'c.not_expired', context: { expires_at } }));
        writes.push(T('files/file', params.id, 'viewer', 'core/external_grant', gid, 'grantee'));
        writes.push(T('core/tenant', tid, 'external_member', 'core/user', grantee));
      } else writes.push(T('files/file', params.id, 'viewer', 'core/user', grantee));
      txWithOutbox(() => {}, tid, { writes, on_duplicate: 'ignore' }, params.id);
      await deliverOutbox();
      return send(res, 200, { shared: true });
    }
    case 'file.move': {
      const to = body.to_folder;
      const tf = to && q.folder.get(to);
      if (!tf || tf.tid !== tid) return send(res, 404, { error: 'not_found' });
      const chk = await pep.authorizeMany(principal, tid, [{ action: 'write', type: 'files/folder', id: to }], g.ctx, { semantic: 'deny_on_first_deny' });
      if (chk.unavailable || !chk.results[0]?.allow) return send(res, chk.unavailable ? 503 : 404, { error: chk.unavailable ? 'unavailable' : 'not_found' });
      const f = q.file.get(params.id);
      // §11: remove the old parent synchronously first (deny-side intermediate state), then commit + outbox the new parent
      const del = await request(`${topo.urls.pdp}/v1/tenants/${tid}/relationships/delete`, { method: 'POST', tls, body: { deletes: [T('files/file', f.id, 'parent', 'files/folder', f.folder)] } });
      if (del.status !== 200) return send(res, 503, { error: 'unavailable' });
      txWithOutbox(() => q.moveFile.run(to, f.id), tid, { writes: [T('files/file', f.id, 'parent', 'files/folder', to)] }, f.id);
      await deliverOutbox();
      return send(res, 200, fileView(q.file.get(f.id)));
    }
    case 'file.signed_url': {
      const ttl = Number(topo.settings.signedUrlTtlSec || 60);
      return send(res, 200, { url: `/dl/${signUrl(params.id, tid, ttl)}`, expires_in: ttl });
    }
    case 'folder.list': {
      let ids = q.filesIn.all(params.id, tid).map((r) => r.id);
      // CH-ESPA-04: optional paging (ADR-025 D25-15/D25-17: page ≤ 100, cursor bound to subject, tenant, folder,
      // limit and lifetime, MAC-protected). Without ?limit the response is unpaged as before.
      if (url.searchParams.has('limit')) {
        const lim = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
        const kC = Buffer.from(secrets.kCursor, 'hex');
        const mac = (b) => crypto.createHmac('sha256', kC).update(`fl:${b}`).digest('base64url').slice(0, 22);
        let off = 0;
        const cur = url.searchParams.get('cursor');
        if (cur) {
          const i = cur.lastIndexOf('.');
          const b = i > 0 ? cur.slice(0, i) : '';
          let c = null;
          try { c = i > 0 && mac(b) === cur.slice(i + 1) ? JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) : null; } catch { c = null; }
          if (!c || c.s !== principal.sub || c.t !== tid || c.f !== params.id || c.l !== lim || c.exp < Date.now()) return send(res, 400, { error: 'invalid_cursor' });
          off = c.o;
        }
        const page = ids.slice(off, off + lim);
        const next = off + lim < ids.length ? (() => { const b = Buffer.from(JSON.stringify({ s: principal.sub, t: tid, f: params.id, l: lim, o: off + lim, exp: Date.now() + 60_000 })).toString('base64url'); return `${b}.${mac(b)}`; })() : null;
        const pcp = await pep.postCheck(g.ctx, 'files/file', 'read', page);
        if (pcp.unavailable) return send(res, 503, { error: 'unavailable' });
        return send(res, 200, { items: pcp.items.map((x) => fileView(q.file.get(x.id))), next_cursor: next, completeness: { status: 'complete' } });
      }
      const pc = await pep.postCheck(g.ctx, 'files/file', 'read', ids);
      if (pc.unavailable) return send(res, 503, { error: 'unavailable' }); // never an empty list when post-check fails (ADR-025 D25-19)
      return send(res, 200, { items: pc.items.map((x) => fileView(q.file.get(x.id))), completeness: { status: 'complete' } });
    }
    case 'file.search': {
      const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);
      const r = await pep.searchViaFacade(g.ctx, 'files/file', 'read', { limit, token: url.searchParams.get('cursor') || undefined });
      if (r.unavailable) return send(res, 503, { error: 'unavailable' });
      return send(res, 200, { items: r.items.map((x) => ({ id: x.id })), next_cursor: r.next || null, completeness: r.completeness });
    }
    default:
      return send(res, 404, { error: 'not_found' });
  }
}

const server = createServer({ tls: tlsFor(topo, 'file-service', { mtls: 'required' }), handler, onError: (e) => log.error('handler', { e: e.stack }) });
await listen(server, topo.ports.file);
ready('file-service', topo.urls.file);
onShutdown(async () => { clearInterval(outboxTimer); pep.stop(); await new Promise((r) => server.close(r)); db.close(); });
