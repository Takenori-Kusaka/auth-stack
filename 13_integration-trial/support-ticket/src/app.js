// Support ticket service (AI simulated integration trial, v1.2). PEP is a self implementation (PP-2, no SDK).
// Order per request: authenticate -> bind_tenant -> authorize -> enforce -> tenant_scope/business (CON-16 §2.1).
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomId, sha256b64u } from './jose.js';
import { KeySet, Verifier, TokenError } from './token.js';
import { PdpClient, NoDecision, SUBJECT_TYPE, ACTOR_TYPE } from './pdp.js';
import { Audit } from './audit.js';
import { Platform, Unavailable } from './clients.js';

const LEDGER = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../entrypoints.json', import.meta.url)), 'utf8'));
const EP = Object.fromEntries(LEDGER.entry_points.map((e) => [e.id, e]));
const SLA_JOB = 'sup.sla-check.v1';
const SLA_SECONDS = 4 * 3600;

// ---- response profiles (kit/README §3, CON-16 §2.7) ----
function problem(res, status, code, extraHeaders = {}) {
  const body = JSON.stringify({ type: 'about:blank', title: code, status, code });
  res.writeHead(status, { 'content-type': 'application/problem+json', ...extraHeaders });
  res.end(body);
}
const R = {
  authFailure: (res) => problem(res, 401, 'invalid_token', { 'www-authenticate': 'Bearer error="invalid_token"' }),
  missing: (res) => problem(res, 401, 'unauthenticated', { 'www-authenticate': 'Bearer' }),
  notFound: (res) => problem(res, 404, 'not_found'),
  forbidden: (res, code = 'forbidden', h = {}) => problem(res, 403, code, h),
  noDecision: (res, retry = 5) => problem(res, 503, 'service_unavailable', { 'retry-after': String(retry) }),
  json: (res, status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); },
};

class Deny extends Error {
  constructor(kind, info = {}) { super(kind); this.kind = kind; Object.assign(this, info); }
}

// ---- in-memory system of record (the service's own DB) ----
export class Store {
  constructor() {
    this.desks = new Map(); this.tickets = new Map(); this.drafts = new Map();
    this.jobs = new Map(); this.notifications = []; this.deadLetters = []; this.outbox = [];
    this.businessExecutions = 0; this.toolExecutions = 0;
  }
  ownerTenant(type, id) {
    const m = type === 'sup/desk' ? this.desks : this.tickets;
    const r = m.get(id);
    return r ? r.tid : null;
  }
}

export async function createApp(cfg) {
  const issuerKeys = new KeySet('issuer', async () => (await discover()).jwks_uri, { minRefetchIntervalMs: cfg.verifier.jwks.min_refetch_interval_seconds * 1000 });
  const ttsKeys = new KeySet('tts', async () => cfg.tts.jwksUrl, { minRefetchIntervalMs: cfg.verifier.jwks.min_refetch_interval_seconds * 1000 });
  let discovery = null;
  async function discover() {
    if (discovery) return discovery;
    const r = await fetch(cfg.discoveryUrl, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) throw new TokenError('discovery_unavailable', { unavailable: true });
    const d = await r.json();
    // EN-2 / CV-003c: discovery issuer must equal the configured value, otherwise refuse to start
    if (d.issuer !== cfg.issuer) throw new Error(`discovery issuer mismatch (configured ${cfg.issuer})`);
    discovery = d; return d;
  }
  await discover();
  const verifier = new Verifier(cfg, issuerKeys, ttsKeys);
  const pdp = new PdpClient(cfg);
  await pdp.checkMetadata();
  const audit = new Audit(cfg);
  const platform = new Platform(cfg);
  const store = new Store();

  // ---- PEP functions (CON-16 §2.3: 1-5, 9, 10) ----
  async function authenticate(req, ep) {
    const at = await verifier.verifyAccessToken(req.headers['authorization']);
    let txn = null;
    if (ep.tier !== 'read-sensitive') {
      // write+: Txn-Token required (CON-16 §1.6, §1.9 v1.2 L-6)
      const raw = req.headers['txn-token'];
      if (!raw) throw Object.assign(new TokenError('txn_not_presented'), { principal: at, txnAbsence: 'not_presented' });
      try { txn = await verifier.verifyTxnToken(raw, at); txn.raw = raw; } catch (e) { e.principal = at; e.txnAbsence = 'unverified'; throw e; }
    } else if (req.headers['txn-token']) {
      // propagate-if-present: verify, never trust unverified
      try { const t = await verifier.verifyTxnToken(req.headers['txn-token'], at); t.raw = req.headers['txn-token']; txn = t; } catch (e) { e.principal = at; e.txnAbsence = 'unverified'; throw e; }
    }
    return { ...at, txn };
  }

  // CON-18 AD-02..AD-05, AD-07 + SM-3 (no PDP call on reject)
  function agentGate(p, ep) {
    if (SUBJECT_TYPE[p.ptype] == null) throw new Deny('subject_unmapped', { status: 403 }); // AD-02 / SM-3
    if (!p.actor) return null;
    if (!(p.actor.ptype in ACTOR_TYPE)) throw new Deny('subject_unmapped', { status: 403 }); // human actor: undefined
    if (p.actor.ptype !== 'ai_agent') return null;
    const decl = ep.agent_delegation;
    if (!decl) throw new Deny('subject_unmapped', { status: 403, ad: 'AD-03' });
    if (!p.scope || !p.scope.includes(decl.tool_scope)) throw new Deny('insufficient_scope', { status: 403, ad: 'AD-05', toolScope: decl.tool_scope, toolId: decl.tool_id });
    return decl;
  }

  function approvalGate(decl) {
    // AD-07: +FIN/+XT/privileged or approval=required -> until ADR-017 L17-5 always rejected (AD-07, D17-25)
    if (!decl) return;
    const needs = decl.approval === 'required' || (decl.modifiers || []).some((m) => m === '+FIN' || m === '+XT') || String(decl.tier).startsWith('privileged');
    if (needs) throw new Deny('approval_required', { status: 403, ad: 'AD-07', toolId: decl.tool_id });
  }

  function bindTenant(p, ep, resourceRef) {
    const tTok = p.tid;
    if (!tTok) throw new Deny('l0_missing');
    if (p.txn && p.txn.tctx.tid !== tTok) throw new Deny('l0_mismatch');
    let tRes;
    switch (ep.resource_kind) {
      case 'EXISTING': case 'CREATE_CHILD':
        tRes = store.ownerTenant(ep.resource_kind === 'CREATE_CHILD' ? 'sup/desk' : ep.resource_type, resourceRef);
        if (tRes == null) throw new Deny('l0_not_found');
        break;
      case 'COLLECTION': tRes = tTok; break;
      default: throw new Deny('l0_indeterminate');
    }
    if (tRes !== tTok) throw new Deny('l0_mismatch');
    return { tid: tTok, resourceRef };
  }

  async function authorize(p, ep, binding) {
    return pdp.evaluate({
      principal: p, tid: binding.tid, action: ep.action,
      resourceType: ep.resource_kind === 'CREATE_CHILD' ? 'sup/desk' : ep.resource_type,
      resourceId: binding.resourceRef, tier: ep.tier, txn: p.txn?.txn,
    });
  }

  // ---- request pipeline ----
  async function guarded(req, res, epId, resourceRef, business) {
    const ep = EP[epId];
    const base = { ep: epId, tier: ep.tier, resourceType: ep.resource_type, resourceId: resourceRef, action: ep.action };
    let p = null;
    try {
      p = await authenticate(req, ep);
    } catch (e) {
      const unavailable = e instanceof TokenError && e.unavailable;
      console.error(JSON.stringify({ level: 'info', ep: epId, deny: 'deny_token', check: e.check || String(e) })); // no token body
      audit.emit({ ...base, tid: resourceRef ? store.ownerTenant(ep.resource_kind === 'CREATE_CHILD' ? 'sup/desk' : ep.resource_type, resourceRef) : null,
        result: 'denied', decisionSource: 'none', noDecisionCause: 'token_invalid', reasonCode: 'deny_token',
        txnAbsence: ep.tier !== 'read-sensitive' ? (e.txnAbsence || 'not_presented') : undefined });
      if (unavailable) return R.noDecision(res);
      if (e.check === 'missing') return R.missing(res);
      return R.authFailure(res);
    }
    const txnCorr = p.txn ? { txn: p.txn.txn } : (ep.tier !== 'read-sensitive' ? { txnAbsence: 'not_presented' } : {});
    let decl = null;
    try {
      decl = agentGate(p, ep);
      const binding = bindTenant(p, ep, resourceRef);
      approvalGate(decl);
      if (ep.resource_kind === 'COLLECTION') {
        const out = await business({ p, binding, decl });
        audit.emit({ ...base, tid: binding.tid, principal: p, result: 'permitted', decisionSource: 'pdp', reasonCode: 'allow',
          decisionId: out.decisionIds?.[0], requestId: out.requestId, toolId: decl?.tool_id, ...txnCorr });
        return R.json(res, 200, out.body);
      }
      const d = await authorize(p, ep, binding);
      if (!d.allow) {
        audit.emit({ ...base, tid: binding.tid, principal: p, result: 'denied', decisionSource: 'pdp', reasonCode: d.reason, decisionId: d.decisionId, requestId: d.requestId, toolId: decl?.tool_id, ...txnCorr });
        return R.notFound(res); // resource-level deny == not found (OB-10)
      }
      const out = await business({ p, binding, decision: d, decl });
      audit.emit({ ...base, tid: binding.tid, principal: p, result: 'permitted', decisionSource: 'pdp', reasonCode: 'allow', decisionId: d.decisionId,
        requestId: d.requestId, toolId: decl?.tool_id, externalGrantId: out.externalGrantId ?? d.externalGrantId, ...txnCorr });
      return R.json(res, out.status || 200, out.body);
    } catch (e) {
      if (e instanceof Deny) {
        if (e.kind.startsWith('l0_')) {
          audit.emit({ ...base, tid: p.tid, principal: p, result: 'denied', decisionSource: 'none', noDecisionCause: 'l0_reject', reasonCode: `deny_l0:${e.kind.slice(3)}`, toolId: decl?.tool_id, ...txnCorr });
          return R.notFound(res);
        }
        audit.emit({ ...base, tid: p.tid, principal: p, result: 'denied', decisionSource: 'none', noDecisionCause: 'subject_unmapped', reasonCode: 'deny_subject_unmapped', toolId: e.toolId || decl?.tool_id, ...txnCorr });
        console.error(JSON.stringify({ level: 'info', ep: epId, deny: e.kind, ad: e.ad }));
        if (e.kind === 'insufficient_scope') return R.forbidden(res, 'insufficient_scope', { 'www-authenticate': `Bearer error="insufficient_scope", scope="${e.toolScope}"` });
        if (e.kind === 'approval_required') return R.forbidden(res, 'approval_required');
        if (e.kind === 'business_conflict') return problem(res, 409, e.code || 'conflict');
        return R.forbidden(res);
      }
      if (e instanceof NoDecision) {
        const cause = e.cause_ === 'pdp_no_decision' ? null : e.cause_;
        audit.emit({ ...base, tid: p.tid, principal: p, result: 'denied', decisionSource: cause ? 'none' : 'pdp', noDecisionCause: cause || undefined,
          reasonCode: e.reason && !cause ? e.reason : 'deny_failmode', failMode: cause ? 'deny' : undefined, decisionId: cause ? undefined : (e.decisionId || e.decisionIds?.[0]), toolId: decl?.tool_id, ...txnCorr });
        return R.noDecision(res, cfg.failmode.pdp[ep.tier === 'read-sensitive' ? 'read-sensitive' : 'write'].on_no_decision.retry_after_seconds);
      }
      if (e instanceof Unavailable) {
        console.error(JSON.stringify({ level: 'warn', ep: epId, msg: e.message }));
        audit.emit({ ...base, tid: p.tid, principal: p, result: 'denied', decisionSource: 'none', noDecisionCause: 'pdp_unreachable', reasonCode: 'deny_failmode', failMode: 'deny', ...txnCorr });
        return R.noDecision(res);
      }
      console.error(e);
      return problem(res, 500, 'internal_error');
    }
  }

  // ---- A1 acceptance (CON-16 §2.10 v1.2; acceptance_atomic=true: no business if ledger fails) ----
  async function acceptSla(p, ticketId, d) {
    const params = JSON.stringify({ ticket: ticketId, kind: 'first_response' });
    const rec = await platform.registerAcceptance(p.txn.raw, {
      jobDefinitionId: SLA_JOB, paramsHash: 'sha-256:' + sha256b64u(params),
      consistencyToken: d?.consistency?.token, dedupKey: `sla-${ticketId}-${Date.now()}`.slice(0, 64),
    });
    return {
      job_run_id: rec.job_run_id,
      // L-5 (CON-16 §2.10 v1.2): subject.type for the re-check is fixed at acceptance from the verified K3 ptype
      record: { job_run_id: rec.job_run_id, tid: p.tid, ticket: ticketId, origin_sub: p.sub, subject_type: SUBJECT_TYPE[p.ptype], ptype: p.ptype, due_at: Date.now() + SLA_SECONDS * 1000 },
    };
  }

  // ---- routes ----
  const routes = [
    ['POST', /^\/desks\/([^/]+)\/tickets$/, 'EP-SUP-01', async (req, m, body) => ({ ref: m[1], fn: async ({ p, binding, decision }) => {
      const id = randomId();
      const acc = await acceptSla(p, id, decision); // before business: 503 leaves nothing behind (acceptance_atomic)
      // containment tuples (parent, requester) via CON-04 before the ticket becomes visible
      const wr = await platform.writeRelationships(binding.tid, p.txn.raw, [
        { resource: { type: 'sup/ticket', id }, relation: 'parent', subject: { type: 'sup/desk', id: m[1] } },
        { resource: { type: 'sup/ticket', id }, relation: 'requester', subject: { type: 'core/user', id: p.sub } },
      ]);
      if (wr.status !== 200) throw new Unavailable('registry', wr.status); // job record without ticket: consumer dead-letters it (resource_mismatch)
      store.businessExecutions++;
      store.tickets.set(id, { id, tid: binding.tid, desk: m[1], title: String(body.title || '').slice(0, 200), requester: p.sub, status: 'open', assignees: [], guests: [], comments: [], created_at: Date.now() });
      store.jobs.set(acc.job_run_id, acc.record); queue.push({ tid: binding.tid, job_run_id: acc.job_run_id, resource: id });
      return { status: 201, body: { id, status: 'open' } };
    } }) ],
    ['GET', /^\/tickets\/([^/]+)$/, 'EP-SUP-02', async (req, m) => ({ ref: m[1], fn: async ({ binding }) => {
      store.businessExecutions++;
      const t = store.tickets.get(m[1]);
      if (t.tid !== binding.tid) throw new Deny('l0_mismatch'); // tenant_scope
      return { body: { id: t.id, title: t.title, status: t.status, comments: t.comments.map((c) => ({ by: c.by, body: c.body })), guests: t.guests.map((g) => ({ grant_id: g.grant_id, state: g.state })) } };
    } }) ],
    ['GET', /^\/tickets$/, 'EP-SUP-03', async (req) => ({ ref: null, fn: async ({ p, binding }) => {
      // L2: candidates from own DB filtered by tenant first, then post-check each page item (INT-02 §3.8)
      const q = new URL(req.url, 'http://x').searchParams.get('q');
      const cands = [...store.tickets.values()].filter((t) => t.tid === binding.tid && (!q || t.title.includes(q))).slice(0, 50);
      const r = await pdp.evaluateMany({ principal: p, tid: binding.tid, action: 'read', resourceType: 'sup/ticket', ids: cands.map((t) => t.id), tier: 'read-sensitive' });
      store.businessExecutions++;
      const items = cands.filter((_, i) => r.items[i].allow).map((t) => ({ id: t.id, title: t.title, status: t.status }));
      return { body: { items, next_cursor: null, completeness: 'complete' }, decisionIds: r.decisionIds, requestId: r.requestId };
    } }) ],
    ['POST', /^\/tickets\/([^/]+)\/assign$/, 'EP-SUP-04', async (req, m, body) => ({ ref: m[1], fn: async ({ p, binding }) => {
      const t = store.tickets.get(m[1]);
      const sub = String(body.assignee_sub || '');
      const w = await platform.writeRelationships(binding.tid, p.txn.raw, [{ resource: { type: 'sup/ticket', id: t.id }, relation: 'assignee', subject: { type: 'core/user', id: sub } }]);
      if (w.status === 403) throw new Deny('business_conflict', { code: w.body?.code || 'assignment_not_allowed' }); // e.g. partner staff: tenant_boundary_violation
      if (w.status !== 200) throw new Unavailable('registry', w.status);
      store.businessExecutions++;
      t.assignees.push({ sub, consistency_token: w.body?.consistency_token });
      return { body: { id: t.id, assignees: t.assignees.map((a) => a.sub) } };
    } }) ],
    ['POST', /^\/tickets\/([^/]+)\/guests$/, 'EP-SUP-05', async (req, m, body) => ({ ref: m[1], fn: async ({ p, binding }) => {
      const t = store.tickets.get(m[1]);
      const exp = new Date(Date.now() + 14 * 86400e3).toISOString();
      const r = await platform.createExternalGrant(binding.tid, p.txn.raw, {
        anchor: { resource: { type: 'sup/ticket', id: t.id }, relation: 'guest' },
        authorizing_permission: 'invite_guest',
        invitee: { channel: 'email', address: String(body.email || '') }, // XGC-4: only here, never stored/logged
        expires_at: exp, invitation_expires_at: exp,
        landing_uri: `https://support.example.invalid/tickets/${t.id}`,
      }, `inv-${t.id}-${randomId()}`);
      if (r.status !== 201) { if (r.status >= 500 || !r.status) throw new Unavailable('external-grant', r.status); throw new Deny('business_conflict', { code: r.body?.code || 'invite_rejected' }); }
      store.businessExecutions++;
      const g = r.body.grant; t.guests.push({ grant_id: g.grant_id, state: g.state, consistency_token: r.body.consistency_token }); // XGC-6
      return { status: 201, body: { grant_id: g.grant_id, state: g.state }, externalGrantId: g.grant_id };
    } }) ],
    ['POST', /^\/tickets\/([^/]+)\/drafts$/, 'EP-SUP-06', async (req, m, body) => ({ ref: m[1], fn: async ({ p }) => {
      store.businessExecutions++; if (p.actor) store.toolExecutions++;
      const id = randomId();
      store.drafts.set(id, { id, ticket: m[1], body: String(body.body || '').slice(0, 10000), author: p.sub, agent: p.actor?.sub ?? null, status: 'draft' });
      return { status: 201, body: { draft_id: id, status: 'draft', drafted_by_agent: !!p.actor } };
    } }) ],
    ['POST', /^\/tickets\/([^/]+)\/drafts\/([^/]+)\/send$/, 'EP-SUP-07', async (req, m) => ({ ref: m[1], fn: async ({ p }) => {
      const dft = store.drafts.get(m[2]);
      if (!dft || dft.ticket !== m[1]) throw new Deny('l0_not_found');
      if (dft.status !== 'draft') throw new Deny('business_conflict', { code: 'already_sent' });
      store.businessExecutions++;
      dft.status = 'sent'; dft.approved_by = p.sub; dft.approved_at = Date.now();
      const t = store.tickets.get(m[1]);
      t.comments.push({ by: p.sub, body: dft.body, draft: dft.id, agent: dft.agent });
      t.first_responded = true;
      // business notification to the requester: outbox, in-app only (INT-02 §3.9 BN-1, BN-7)
      store.outbox.push({ tid: t.tid, kind: 'sup.reply.sent', resource: t.id, recipient: t.requester, origin_txn: p.txn.txn });
      return { body: { draft_id: dft.id, status: 'sent' } };
    } }) ],
    ['POST', /^\/tickets\/([^/]+)\/comments$/, 'EP-SUP-08', async (req, m, body) => ({ ref: m[1], fn: async ({ p, decision }) => {
      const t = store.tickets.get(m[1]);
      let jobRunId = null;
      if (p.sub === t.requester) { const acc = await acceptSla(p, t.id, decision); store.jobs.set(acc.job_run_id, acc.record); jobRunId = acc.job_run_id; }
      store.businessExecutions++;
      t.comments.push({ by: p.sub, body: String(body.body || '').slice(0, 10000) });
      if (jobRunId) queue.push({ tid: t.tid, job_run_id: jobRunId, resource: t.id });
      return { status: 201, body: { id: t.id, comments: t.comments.length } };
    } }) ],
    ['POST', /^\/tickets\/([^/]+)\/close$/, 'EP-SUP-09', async (req, m) => ({ ref: m[1], fn: async ({ p, binding }) => {
      const t = store.tickets.get(m[1]);
      // XGC-7: revoke external grants on the anchor first; on failure keep retrying from outbox (not shown as done)
      let revoked = false;
      try { await platform.revokeByAnchor(binding.tid, p.txn.raw, { type: 'sup/ticket', id: t.id }, `close-${t.id}`); revoked = true; } catch (e) {
        store.outbox.push({ tid: t.tid, kind: 'revoke_by_anchor_retry', resource: t.id }); console.error(JSON.stringify({ level: 'alarm', msg: 'revokeExternalGrantsByAnchor failed; queued' }));
      }
      store.businessExecutions++;
      t.status = 'closed';
      return { body: { id: t.id, status: 'closed', guest_access_revoked: revoked } };
    } }) ],
  ];

  // ---- async consumer EP-SUP-10 (OB-14, CON-16 §2.10, INT-02 §3.9 BN-3) ----
  const queue = [];
  async function consume(message) {
    const ep = EP['EP-SUP-10'];
    const base = { ep: 'EP-SUP-10', tier: ep.tier, resourceType: 'sup/ticket', resourceId: message.resource, action: ep.action };
    const dead = (why, extra = {}) => { store.deadLetters.push({ job_run_id: message.job_run_id, why }); audit.emit({ ...base, ...extra }); return { ok: false, why }; };
    const rec = store.jobs.get(message.job_run_id);
    // subject/actor of consumer E2: the origin subject saved at acceptance (never the message)
    const recP = rec ? { sub: rec.origin_sub, ptype: rec.ptype, tid: rec.tid, actor: null, issuer: cfg.tts.issuer, jti: rec.job_run_id } : null;
    if (!rec) return dead('unknown_job_run', { tid: null, result: 'denied', decisionSource: 'none', noDecisionCause: 'l0_reject', reasonCode: 'deny_l0:indeterminate' });
    let txn;
    try {
      const raw = await platform.internalStartTxn(message.job_run_id, ep.operation);
      txn = await verifier.verifyTxnToken(raw, null);
    } catch (e) {
      return dead('txn_unavailable', { tid: rec.tid, principal: recP, result: 'denied', decisionSource: 'none', noDecisionCause: 'token_invalid', reasonCode: 'deny_token' });
    }
    const p = { sub: txn.sub, ptype: rec.ptype, tid: txn.tctx.tid, actor: null, issuer: cfg.tts.issuer, jti: txn.txn };
    // DB context comes from tctx.tid, never from the message (CON-16 §2.10)
    if (message.tid !== txn.tctx.tid || rec.tid !== txn.tctx.tid || rec.origin_sub !== txn.sub) {
      return dead('tenant_or_subject_mismatch', { tid: txn.tctx.tid, principal: recP, result: 'denied', decisionSource: 'none', noDecisionCause: 'l0_reject', reasonCode: 'deny_l0:mismatch', txn: txn.txn });
    }
    const owner = store.ownerTenant('sup/ticket', message.resource);
    if (owner !== txn.tctx.tid || rec.ticket !== message.resource) {
      return dead('resource_mismatch', { tid: txn.tctx.tid, principal: recP, result: 'denied', decisionSource: 'none', noDecisionCause: 'l0_reject', reasonCode: owner == null ? 'deny_l0:not_found' : 'deny_l0:mismatch', txn: txn.txn });
    }
    let d;
    try {
      // re-check with the subject type saved at acceptance (L-5), not the message's
      d = await pdp.evaluate({ principal: { ...p, ptype: Object.keys(SUBJECT_TYPE).find((k) => SUBJECT_TYPE[k] === rec.subject_type) }, tid: txn.tctx.tid, action: ep.action, resourceType: 'sup/ticket', resourceId: message.resource, tier: ep.tier, txn: txn.txn });
    } catch (e) {
      return dead('no_decision', { tid: txn.tctx.tid, principal: p, result: 'denied', decisionSource: 'none', noDecisionCause: e.cause_ === 'pdp_no_decision' ? 'pdp_response_invalid' : e.cause_, reasonCode: 'deny_failmode', failMode: 'deny', txn: txn.txn });
    }
    if (!d.allow) return dead('recheck_denied', { tid: txn.tctx.tid, principal: p, result: 'denied', decisionSource: 'pdp', reasonCode: d.reason, decisionId: d.decisionId, requestId: d.requestId, txn: txn.txn });
    audit.emit({ ...base, tid: txn.tctx.tid, principal: p, result: 'permitted', decisionSource: 'pdp', reasonCode: 'allow', decisionId: d.decisionId, requestId: d.requestId, txn: txn.txn });
    const t = store.tickets.get(message.resource);
    store.businessExecutions++;
    // BN-4: only if still breaching (open, no first response); due time is checked by the scheduler (simulated by the caller)
    if (t.status !== 'open' || t.first_responded) return { ok: true, notified: 0 };
    const recipients = t.assignees.length ? t.assignees.map((a) => a.sub) : ['desk-admins'];
    for (const r of recipients) store.notifications.push({ tid: t.tid, kind: 'sup.sla.breached', resource: t.id, recipient: r, channel: 'in_app', origin_txn: txn.txn });
    return { ok: true, notified: recipients.length };
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.search.match(/(^|[?&])(access_token|token)=/)) return R.authFailure(res); // V11
      let raw = ''; for await (const c of req) { raw += c; if (raw.length > 65536) return problem(res, 413, 'too_large'); }
      let body = {}; if (raw) { try { body = JSON.parse(raw); } catch { return problem(res, 400, 'invalid_request'); } }
      for (const [method, re, epId, h] of routes) {
        const m = url.pathname.match(re);
        if (m && req.method === method) { const { ref, fn } = await h(req, m, body); return guarded(req, res, epId, ref, fn); }
      }
      return problem(res, 404, 'not_found');
    } catch (e) { console.error(e); if (!res.headersSent) problem(res, 500, 'internal_error'); }
  });

  return { server, store, audit, pdp, queue, consume, platform, cfg };
}
