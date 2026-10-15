// Minimal expense service (経費精算). Entry points and patterns: see 13_integration-trial/report.md §3.
// PEP order: authenticate -> bind_tenant -> authorize -> enforce (IC-02). Deny / not found / other tenant are
// one identical response (IC-09). PDP "no decision" -> 503 + Retry-After, never fail-open (INT-02 §3.3).
import http from 'node:http';
import crypto from 'node:crypto';
import { TokenError } from './token.js';

const NS = 'expense';
const T = { book: `${NS}/book`, report: `${NS}/report`, line: `${NS}/approval_line` };
// Subject type for humans. CON-03 examples use "core/user", CON-06 says ptype maps to AuthZEN subject.type
// "without a conversion table" (ptype values are human/service_account/...). Ambiguous -> we follow CON-03.
const SUBJECT_TYPE = { human: 'core/user' };

export class Store {
  constructor() {
    this.reports = new Map(); // id -> report (the 正本; holds immutable owning tenant)
    this.lines = new Map(); // `${tid}|${unit}` -> {head, parentUnit}
    this.suspendedTenants = new Set(); this.suspendedMembers = new Set(); this.suspendedPrincipals = new Set();
    this.deletionMarks = new Set();
    this.outbox = []; this.deadLetter = [];
    this.consistency = new Map(); // report id -> consistency token from tuple write (I-4)
  }
  newId() { return crypto.randomUUID(); } // UUIDv4 lower-case: one of the 2 candidate forms (CON-06 opaqueId)
  suspendTenant(tid) { this.suspendedTenants.add(tid); }
  resumeTenant(tid) { this.suspendedTenants.delete(tid); }
  suspendMember(tid, sub) { this.suspendedMembers.add(`${tid}|${sub}`); }
  suspendPrincipal(sub) { this.suspendedPrincipals.add(sub); }
  markForDeletion(kind, id) { this.deletionMarks.add(`${kind}|${id}`); }
  unmarkForDeletion(kind, id) { this.deletionMarks.delete(`${kind}|${id}`); }
  deleteData(kind, id) {
    let n = 0;
    for (const [rid, r] of this.reports) if ((kind === 'tenant' && r.tid === id) || (kind === 'principal' && r.requester === id)) { this.reports.delete(rid); n++; }
    this.deletionMarks.delete(`${kind}|${id}`);
    return n;
  }
}

export function createApp({ cfg, verifier, pdp, sts, audit, registry, store, log = () => {} }) {
  const deny = (res, extra = {}) => send(res, cfg.denyStatus, { error: 'not_found' }, extra); // single shape for deny/absent/other tenant
  const unavailable = (res) => send(res, 503, { error: 'temporarily_unavailable' }, { 'retry-after': String(cfg.retryAfterSec) });

  function send(res, status, body, headers = {}) {
    const b = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(b), ...headers });
    res.end(b);
  }

  async function authenticate(req) {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new TokenError('no_token');
    return verifier.verify(h.slice(7));
  }

  function subjectOf(claims) {
    const type = SUBJECT_TYPE[claims.ptype];
    if (!type) throw new TokenError('unsupported_ptype');
    return { type, id: claims.sub, properties: { tid: claims.tid } };
  }

  /** authorize+enforce for a single resource. Returns true if allowed; otherwise responds. */
  async function guard(res, ctx, { action, resource, tier, entryPointId }) {
    const r = await pdp.evaluate({ subject: subjectOf(ctx.claims), action: { name: action }, resource, tier, consistencyToken: store.consistency.get(resource.id), txnToken: ctx.txnToken, traceparent: ctx.traceparent });
    const result = r.kind === 'allow' ? 'allowed' : r.kind === 'deny' ? 'denied' : 'unavailable';
    audit.enforce({ tid: ctx.claims.tid, tier, sub: ctx.claims.sub, resourceType: resource.type, resourceId: resource.id, action, decisionId: r.decisionId, requestId: ctx.requestId, traceId: ctx.traceId, txn: ctx.txn, reason: r.reason || (r.kind === 'unavailable' ? 'deny_unavailable' : undefined), entryPointId, result });
    if (r.kind === 'allow') return true;
    if (r.kind === 'deny') deny(res); else unavailable(res);
    log({ level: 'info', msg: 'authz', action, kind: r.kind, why: r.why });
    return false;
  }

  async function writeTuples(tid, writes, deletes = []) {
    const r = await fetch(new URL(`/v1/tenants/${encodeURIComponent(tid)}/relationships/write`, cfg.registryBaseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ writes, ...(deletes.length ? { deletes } : {}), idempotency_key: crypto.randomUUID() }),
      signal: AbortSignal.timeout(cfg.pdpDeadlineMs * 10),
    }).catch(() => null);
    registry.calls.push({ tid, writes, deletes });
    if (!r || r.status !== 200) return null;
    const j = await r.json().catch(() => null);
    return j && j.consistency_token;
  }

  const tuple = (rid, relation, subject) => ({ resource: { type: T.report, id: rid }, relation, subject });

  async function handle(req, res) {
    const url = new URL(req.url, 'http://local');
    const m = url.pathname.match(/^\/t\/([^/]+)\/expenses(?:\/([^/]+))?(?:\/(submit|approve))?$/);
    if (!m) return send(res, 404, { error: 'not_found' });
    const [, routeTid, rid, verb] = m;
    const ctx = { requestId: crypto.randomUUID(), traceId: crypto.randomBytes(16).toString('hex'), traceparent: req.headers.traceparent, txnToken: req.headers['txn-token'] };
    // INT-02 §3.2: write 以上で業務の監査に txn を書く. Reading the txn claim requires decoding the Txn-Token, which
    // P-03 checklist ③ says to propagate "without reading"; TTS JWKS is not in the contracts -> unverified read.
    try { ctx.txn = ctx.txnToken ? JSON.parse(Buffer.from(ctx.txnToken.split('.')[1], 'base64url')).txn : undefined; } catch { ctx.txn = undefined; }
    // 1 authenticate
    try { ctx.claims = await authenticate(req); } catch (e) {
      log({ level: 'info', msg: 'authn_failed', code: e.code });
      return send(res, 401, { error: 'invalid_token' }, { 'www-authenticate': 'Bearer error="invalid_token"' });
    }
    // 2 bind_tenant: token tid == route tid == resource-derived tid (IC-03)
    if (ctx.claims.tid !== routeTid) return deny(res);
    if (store.suspendedTenants.has(routeTid)) return unavailable(res); // tenant.suspended (CON-12 §2)
    let report;
    if (rid) {
      report = store.reports.get(rid);
      if (!report || report.tid !== routeTid) return deny(res);
    }
    const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : null;
    const bookRes = { type: T.book, id: bookId(routeTid), properties: { tid: routeTid } };
    const resOf = (r) => ({ type: T.report, id: r.id, properties: { tid: r.tid } });

    // 3/4 authorize + enforce, then business logic
    if (req.method === 'POST' && !rid) { // create draft
      if (!body || typeof body.amount !== 'number' || body.amount <= 0 || typeof body.unit_id !== 'string') return send(res, 400, { error: 'invalid_request' });
      if (!(await guard(res, ctx, { action: 'file_report', resource: bookRes, tier: 'write', entryPointId: 'expense:post:/t/tid/expenses' }))) return;
      const id = store.newId();
      const r = { id, tid: routeTid, requester: ctx.claims.sub, unit: body.unit_id, amount: body.amount, description: String(body.description || '').slice(0, 200), state: 'draft', approvals: [] };
      store.reports.set(id, r);
      const ct = await writeTuples(routeTid, [tuple(id, 'requester', { type: 'core/user', id: r.requester }), tuple(id, 'book', { type: T.book, id: bookId(routeTid) }), tuple(id, 'unit', { type: 'core/unit', id: r.unit })]);
      if (!ct) { store.reports.delete(id); return unavailable(res); }
      store.consistency.set(id, ct);
      return send(res, 201, view(r));
    }
    if (req.method === 'GET' && rid) {
      if (!(await guard(res, ctx, { action: 'view', resource: resOf(report), tier: 'read_sensitive', entryPointId: 'expense:get:/t/tid/expenses/id' }))) return;
      return send(res, 200, view(report));
    }
    if (req.method === 'POST' && verb === 'submit') {
      if (!(await guard(res, ctx, { action: 'submit', resource: resOf(report), tier: 'write', entryPointId: 'expense:post:/t/tid/expenses/id/submit' }))) return;
      if (report.state !== 'draft') return send(res, 409, { error: 'invalid_state' });
      const approver = resolveApprover(routeTid, report.unit, report.requester, 0);
      if (!approver) return send(res, 409, { error: 'no_approver' });
      const ct = await writeTuples(routeTid, [tuple(report.id, 'approver', { type: 'core/user', id: approver })]);
      if (!ct) return unavailable(res);
      store.consistency.set(report.id, ct);
      report.state = 'submitted'; report.currentApprover = approver; report.stage = 0;
      enqueue(report, approver, ctx);
      return send(res, 200, view(report));
    }
    if (req.method === 'POST' && verb === 'approve') {
      if (!(await guard(res, ctx, { action: 'approve', resource: resOf(report), tier: 'write', entryPointId: 'expense:post:/t/tid/expenses/id/approve' }))) return;
      // workflow checks that ReBAC cannot express (INT-03 §0 item 5): SoD and state / content binding
      if (report.state !== 'submitted') return send(res, 409, { error: 'invalid_state' });
      if (ctx.claims.sub === report.requester) return deny(res); // self-approval is forbidden even if R-stage allows
      if (report.approvals.includes(ctx.claims.sub)) return deny(res); // same person twice
      if (body && body.content_hash && body.content_hash !== contentHash(report)) return send(res, 409, { error: 'content_changed' });
      report.approvals.push(ctx.claims.sub);
      // revoke this stage's approver tuple first (revocation synchronous before grant, ARC-05 I-5 via INT-03 D-9)
      const del = [tuple(report.id, 'approver', { type: 'core/user', id: ctx.claims.sub })];
      const needsSecond = report.amount > Number(process.env.EXPENSE_SECOND_STAGE_THRESHOLD || '100000') && report.stage === 0;
      if (needsSecond) {
        const next = resolveApprover(routeTid, report.unit, report.requester, 1, report.approvals);
        if (!next) return send(res, 409, { error: 'no_approver' });
        const ct0 = await writeTuples(routeTid, [], del); if (!ct0) return unavailable(res);
        const ct = await writeTuples(routeTid, [tuple(report.id, 'approver', { type: 'core/user', id: next })]); if (!ct) return unavailable(res);
        store.consistency.set(report.id, ct);
        report.stage = 1; report.currentApprover = next; enqueue(report, next, ctx);
        return send(res, 200, view(report));
      }
      const ct = await writeTuples(routeTid, [tuple(report.id, 'approved_in', { type: T.book, id: bookId(routeTid) })], del);
      if (!ct) return unavailable(res);
      store.consistency.set(report.id, ct);
      report.state = 'approved';
      // P-03: hand over to the payment service with a per-destination token (never forward the received token)
      const ex = await sts.exchange({ subjectToken: req.headers.authorization.slice(7), resource: cfg.paymentServiceResource, scope: process.env.PAYMENT_SCOPE || 'expense.pay' });
      report.payment = ex.kind === 'ok' ? 'handed_over' : `pending(${ex.why})`; // payment API itself has no contract -> not called
      return send(res, 200, view(report));
    }
    if (req.method === 'GET' && !rid) return list(res, ctx, url, routeTid);
    return send(res, 405, { error: 'method_not_allowed' });
  }

  // P-09: candidates from the domain index (tenant-partitioned), post-check of the returned page only.
  async function list(res, ctx, url, tid) {
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
    const after = url.searchParams.get('cursor') || '';
    const candidates = [...store.reports.values()].filter((r) => r.tid === tid && r.id > after).sort((a, b) => (a.id < b.id ? -1 : 1));
    const page = candidates.slice(0, limit);
    if (!page.length) return send(res, 200, { items: [], completeness: { status: 'complete' } });
    const b = await pdp.evaluateBatch({ subject: subjectOf(ctx.claims), action: { name: 'view' }, resources: page.map((r) => ({ type: T.report, id: r.id, properties: { tid } })), txnToken: ctx.txnToken });
    if (b.kind !== 'ok') return unavailable(res); // "利用不可", never an empty list (D25-19)
    const items = page.filter((_, i) => b.items[i].kind === 'allow').map(view);
    const indeterminate = b.items.some((x) => x.kind === 'unavailable');
    audit.enforce({ tid, tier: 'read_sensitive', sub: ctx.claims.sub, resourceType: T.report, resourceId: `page:${after}`, action: 'view', decisionId: b.items.find((x) => x.decisionId)?.decisionId, requestId: ctx.requestId, traceId: ctx.traceId, reason: 'allow', entryPointId: 'expense:get:/t/tid/expenses', result: 'allowed' });
    const out = { items, completeness: indeterminate ? { status: 'incomplete', reason: 'deadline_exceeded' } : { status: 'complete' } };
    if (candidates.length > limit) out.next_cursor = page[page.length - 1].id; // no total count (NP09-2)
    return send(res, 200, out);
  }

  function resolveApprover(tid, unit, requester, stage, exclude = []) {
    // Approver = head of the applicant's unit; stage 1 = head of the parent unit. Hierarchy is read from the
    // domain's approval-line table (fixture). A real implementation would read core/unit ancestors (CON-04
    // readAncestors, preview, K05-6/K05-8 pending).
    // stage 0: first head up the chain who is not the requester; stage 1: next one not already approving.
    void stage;
    let u = unit;
    while (u) {
      const line = store.lines.get(`${tid}|${u}`);
      if (!line) return null;
      if (line.head !== requester && !exclude.includes(line.head)) return line.head;
      u = line.parentUnit;
    }
    return null;
  }

  function enqueue(report, recipient, ctx) {
    // P-24: references only, no token/role (NP24-1). txn is a reference to the originating transaction.
    store.outbox.push({ type: 'expense.approval_requested', id: crypto.randomUUID(), tid: report.tid, report_id: report.id, recipient_sub: recipient, origin_sub: ctx.claims.sub, job_run_id: `jr_${crypto.randomBytes(12).toString('base64url')}`, origin_txn: undefined });
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => { log({ level: 'error', msg: e.message }); if (!res.headersSent) unavailable(res); });
  });
  return { server, handle };
}

const BOOKS = new Map(); // tenant -> random book id (no tenant id embedded in object ids, INT-03 N-17)
export function bookId(tid) { if (!BOOKS.has(tid)) BOOKS.set(tid, crypto.randomUUID()); return BOOKS.get(tid); }
export function contentHash(r) { return crypto.createHash('sha256').update(`${r.id}|${r.amount}|${r.description}`).digest('base64url'); }
function view(r) { return { id: r.id, amount: r.amount, description: r.description, state: r.state, content_hash: contentHash(r) }; }
async function readJson(req) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 65536) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'); } catch { return null; }
}
