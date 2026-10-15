// Room booking service (rsv). Routes call the PEP first; business code only runs after an allow.
import http from 'node:http';
import { Pep } from './pep.js';
import { Store } from './store.js';
import { sha256b64u, opaqueId } from './jwt.js';
import { ReminderConsumer } from './reminder.js';

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export async function createApp(cfg, { ledger, refValues, store = new Store() }) {
  const pep = await Pep.init(cfg, { ledger, refValues });
  const reminder = new ReminderConsumer(cfg, pep, store);

  // CON-05 registerAcceptanceRecord (A1): the ledger takes sub/tid/txn from the ORIGINAL Txn-Token, unchanged.
  async function registerAcceptance(principal, params) {
    const params_hash = 'sha-256:' + sha256b64u(JSON.stringify(params));
    const body = { job_definition_id: 'rsv.reminder.v1', params_hash, dedup_key: params.booking_id };
    try {
      const r = await fetch(`${cfg.jobLedgerUrl}/acceptance-records`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'txn-token': principal.txn.raw },
        body: JSON.stringify(body), signal: AbortSignal.timeout(1000),
      });
      if (r.status !== 201 && r.status !== 200) return null;
      const j = await r.json();
      if (typeof j.job_run_id !== 'string') return null;
      return { job_run_id: j.job_run_id, params_hash, origin_txn: j.origin_txn };
    } catch { return null; }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local');
      let m;
      // EP-RSV-01 create booking (CREATE_CHILD under a room)
      if (req.method === 'POST' && (m = url.pathname.match(/^\/v1\/rooms\/([A-Za-z0-9_-]{1,128})\/bookings$/))) {
        const input = await readJson(req);
        return pep.handle({ req, res, store, epId: 'EP-RSV-01', ref: { type: 'rsv/room', id: m[1] }, business: async ({ tid, principal, decision }) => {
          if (!input || typeof input.start !== 'string' || typeof input.end !== 'string') return { status: 400, body: { code: 'invalid_request' } };
          const attendees = Array.isArray(input.attendees) ? input.attendees.filter((s) => typeof s === 'string').slice(0, 200) : [];
          const id = opaqueId();
          // Reminder acceptance record must be written while the original Txn-Token is still valid (A1).
          const acc = await registerAcceptance(principal, { booking_id: id, tid, start: input.start });
          if (!acc) return { status: 503, headers: { 'retry-after': '5' }, body: { code: 'temporarily_unavailable' } };
          // single synchronous "transaction": business row + outbox (BN-1: references only)
          store.businessExecutions++;
          store.bookings.set(id, { id, tid, roomId: m[1], organizer: { id: principal.sub, type: 'core/user' }, attendees, start: input.start, end: input.end, status: 'active', consistencyToken: decision.token, createdVia: principal.actor ? 'agent' : 'user' });
          store.outbox.push({ id: opaqueId(), type: 'rsv.booking.reminder', tid, resource_type: 'rsv/booking', resource_id: id, recipients: [principal.sub, ...attendees], origin_txn: principal.txn.txn, job_run_id: acc.job_run_id, params_hash: acc.params_hash, due_at: input.start });
          return { status: 201, body: { id, status: 'active' } };
        } });
      }
      // EP-RSV-02 view booking
      if (req.method === 'GET' && (m = url.pathname.match(/^\/v1\/bookings\/([A-Za-z0-9_-]{1,128})$/))) {
        const row = store.bookings.get(m[1]);
        return pep.handle({ req, res, store, epId: 'EP-RSV-02', ref: { type: 'rsv/booking', id: m[1], consistencyToken: row?.consistencyToken ?? null }, business: async ({ tid }) => {
          store.businessExecutions++;
          const b = store.bookings.get(m[1]);
          if (!b || b.tid !== tid) return { status: 404, body: JSON.parse('{"type":"about:blank","title":"Not Found","status":404,"code":"not_found"}') };
          return { status: 200, body: { id: b.id, room_id: b.roomId, start: b.start, end: b.end, status: b.status } };
        } });
      }
      // EP-RSV-03 cancel booking
      if (req.method === 'DELETE' && (m = url.pathname.match(/^\/v1\/bookings\/([A-Za-z0-9_-]{1,128})$/))) {
        return pep.handle({ req, res, store, epId: 'EP-RSV-03', ref: { type: 'rsv/booking', id: m[1] }, business: async ({ tid }) => {
          store.businessExecutions++;
          const b = store.bookings.get(m[1]);
          b.status = 'cancelled';
          return { status: 200, body: { id: b.id, status: b.status } };
        } });
      }
      // EP-RSV-04 list bookings of a room (PP-2 list: L2 candidates in our DB filtered by tenant first, post-check every item)
      if (req.method === 'GET' && (m = url.pathname.match(/^\/v1\/rooms\/([A-Za-z0-9_-]{1,128})\/bookings$/))) {
        return pep.handle({ req, res, store, epId: 'EP-RSV-04', ref: { type: 'rsv/room', id: m[1] }, business: async ({ tid, principal, subject }) => {
          const limit = Math.min(Number(url.searchParams.get('limit') ?? 20) || 20, 50);
          const cursor = url.searchParams.get('cursor');
          const cands = [...store.bookings.values()].filter((b) => b.tid === tid && b.roomId === m[1] && b.status === 'active').sort((a, b) => (a.id < b.id ? -1 : 1));
          const startIdx = cursor ? cands.findIndex((b) => b.id > cursor) : 0;
          const page = startIdx < 0 ? [] : cands.slice(startIdx, startIdx + limit);
          if (page.length === 0) return { status: 200, body: { items: [], next_cursor: null, completeness: 'complete' } };
          const r = await pep.pdp.evaluateBatch({ subject, action: 'view', resources: page.map((b) => ({ type: 'rsv/booking', id: b.id, properties: { tid } })), tier: 'read-sensitive', txn: principal.txn, txnToken: principal.txn?.raw });
          if (r.noDecision || r.items.some((i) => i.noDecision)) return { status: 503, headers: { 'retry-after': '5' }, body: { code: 'list_unavailable' } }; // D25-19: not an empty list
          store.businessExecutions++;
          const items = page.filter((_, i) => r.items[i].allow).map((b) => ({ id: b.id, start: b.start, end: b.end }));
          const more = startIdx + limit < cands.length;
          return { status: 200, body: { items, next_cursor: more ? page[page.length - 1].id : null, completeness: 'complete' } };
        } });
      }
      // EP-RSV-05 invite an external guest (P-16). There is no contract operation that creates core/external_grant.
      if (req.method === 'POST' && (m = url.pathname.match(/^\/v1\/bookings\/([A-Za-z0-9_-]{1,128})\/guests$/))) {
        await readJson(req);
        return pep.handle({ req, res, store, epId: 'EP-RSV-05', ref: { type: 'rsv/booking', id: m[1] }, business: async () => ({ status: 501, body: { code: 'external_grant_unavailable' } }) });
      }
      res.writeHead(404, { 'content-type': 'application/problem+json' });
      res.end(JSON.stringify({ type: 'about:blank', title: 'Not Found', status: 404, code: 'not_found' }));
    } catch (e) {
      res.writeHead(500, { 'content-type': 'application/problem+json' });
      res.end(JSON.stringify({ type: 'about:blank', title: 'Internal Server Error', status: 500 }));
    }
  });
  return { server, pep, store, reminder };
}
