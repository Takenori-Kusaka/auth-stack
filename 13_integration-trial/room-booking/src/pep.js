// Self-implemented PEP (PP-2, SDK-less) with the CON-16 §2.3 shape: init, authenticate, bind_tenant,
// authorize, enforce, propagate (+ consume for async). No bypass arguments or settings (OB-15).
import { verifyAccessToken, verifyTxnToken, JwksSource } from './token.js';
import { PdpClient, SUBJECT_TYPE_MAP } from './pdp.js';
import { Audit } from './audit.js';

export const DENY_BODY = JSON.stringify({ type: 'about:blank', title: 'Not Found', status: 404, code: 'not_found' });

export class Pep {
  static async init(cfg, { ledger, refValues }) {
    const pep = new Pep();
    pep.cfg = cfg; pep.ledger = ledger;
    // Discovery of the CONFIGURED issuer; the response's issuer must equal the configured value or we do not start (V4, EN-2, CV-003c)
    const r = await fetch(cfg.issuer.discoveryUrl, { signal: AbortSignal.timeout(3000) });
    if (r.status !== 200) throw new Error(`discovery ${r.status}`);
    const disc = await r.json();
    if (disc.issuer !== cfg.issuer.expected) throw new Error(`discovery issuer ${disc.issuer} != configured ${cfg.issuer.expected}`);
    if (typeof disc.jwks_uri !== 'string') throw new Error('discovery: jwks_uri');
    const minRefetchMs = cfg.verifier.jwks.min_refetch_interval_seconds * 1000;
    pep.issuerKeys = new JwksSource({ name: 'issuer', getJwksUri: async () => disc.jwks_uri, minRefetchMs });
    await pep.issuerKeys.refresh();
    pep.ttsKeys = new JwksSource({ name: 'tts', getJwksUri: async () => cfg.tts.jwksUrl, minRefetchMs });
    try { await pep.ttsKeys.refresh(); } catch { /* lazily retried; Txn-Token checks fail closed meanwhile */ }
    pep.pdp = new PdpClient(cfg);
    await pep.pdp.init();
    pep.audit = new Audit(cfg, refValues);
    return pep;
  }

  ep(id) { const e = this.ledger.entry_points.find((x) => x.id === id); if (!e) throw new Error(`unregistered entry point ${id}`); return e; } // OB-03

  // ---------- authenticate (OB-01, OB-02) ----------
  async authenticate(req, ep) {
    if (req.url.includes('access_token=')) return { fail: 'query_token' };            // V11
    const at = await verifyAccessToken(req.headers['authorization'], this.cfg, this.issuerKeys);
    if (!at.ok) return { fail: at.reason, unavailable: at.unavailable, missing: at.reason === 'missing' };
    const principal = at.principal;
    const isWrite = ep.tier !== 'read-sensitive' && ep.tier !== 'public';
    const txnHeader = req.headers['txn-token'];
    let txn = null;
    if (txnHeader !== undefined) {
      const t = await verifyTxnToken(txnHeader, this.cfg, this.ttsKeys, principal);
      if (!t.ok) return { fail: t.reason, unavailable: t.unavailable, principal, txn: { invalid: true } };
      txn = t.txn;
    } else if (isWrite || principal.actor?.ptype === 'ai_agent') {
      // write+ requires Txn-Token (CON-16 §1.6); +AGT requests get one at every tier (INT-02 P-08, D17-19)
      return { fail: 'txn_missing', principal, txn: null };
    }
    principal.txn = txn;
    return { principal };
  }

  // ---------- bind_tenant (CON-16 §2.4) ----------
  bindTenant(principal, ep, ref, store) {
    const tTok = principal.tid;
    if (!tTok) return { deny: 'l0_missing' };
    if (principal.txn && principal.txn.tctx.tid !== tTok) return { deny: 'l0_mismatch' };
    // (ii) signed route context: not available to this service (no edge contract for it) -> null
    let tRes;
    switch (ep.resource_kind) {
      case 'EXISTING':
      case 'COLLECTION':           // list is scoped by its container (room), which is an existing resource
      case 'CREATE_CHILD': {
        tRes = store.ownerTenant(ref.type, ref.id);
        if (tRes === 'NOT_FOUND') return { deny: 'l0_not_found' };
        if (tRes === 'UNRESOLVABLE') return { deny: 'l0_indeterminate' };
        break;
      }
      default: return { deny: 'l0_indeterminate' };
    }
    if (tRes !== tTok) return { deny: 'l0_mismatch' };
    return { tid: tTok };
  }

  // AuthZEN subject from the verified principal (CON-02 x-subject-type-map, INT-02 SM-1..SM-4)
  subject(principal, tid) {
    const type = SUBJECT_TYPE_MAP[principal.ptype];
    if (!type) return { reject: 'subject_type_undecided' };
    const s = { type, id: principal.sub, properties: { tid, principal_type: principal.ptype } };
    if (principal.actor) {
      const at = SUBJECT_TYPE_MAP[principal.actor.ptype];
      // CON-03 Subject.properties.actor requires {type, id}; for ai_agent the type is undecided (CON-02).
      // SM-3: do not guess -> reject without calling the PDP (report.md C-2).
      if (!at) return { reject: 'actor_type_undecided' };
      s.properties.actor = { type: at, id: principal.actor.sub };
    }
    return { subject: s };
  }

  // ---------- one-shot pipeline for a synchronous entry point ----------
  // ctx: {req, res, store, epId, ref:{type,id}, action?, business(tid, decision) -> {status, body}}
  async handle({ req, res, store, epId, ref, business }) {
    const ep = this.ep(epId);
    const tier = ep.tier;
    const a = await this.authenticate(req, ep);
    if (a.fail) {
      await this.audit.emit({ ep: ep.id, tier, tid: a.principal?.tid, principal: a.principal, action: ep.action, result: 'denied', noDecisionCause: 'token_invalid', reasonCode: 'deny_token', txn: a.txn });
      if (a.unavailable) return this.noDecision(res, tier);
      return this.authFailure(res, a.missing);
    }
    const p = a.principal;
    if (p.ptype === 'ai_agent') return this.functionalDeny(res, ep, p, 'subject_type_undecided');   // CON-02: sub itself ai_agent
    const bound = this.bindTenant(p, ep, ref, store);
    if (bound.deny) {
      await this.audit.emit({ ep: ep.id, tier, tid: p.tid, principal: p, resource: ref, action: ep.action, result: 'denied', noDecisionCause: 'l0_reject', reasonCode: `deny_l0:${bound.deny.slice(3)}`, txn: p.txn });
      return this.resourceDenied(res);
    }
    const subj = this.subject(p, bound.tid);
    if (subj.reject) return this.functionalDeny(res, ep, p, subj.reject);
    const action = ep.container ? ep.container.action : ep.action;
    const resource = { type: ref.type, id: ref.id, properties: { tid: bound.tid } };
    const d = await this.pdp.evaluate({ subject: subj.subject, action, resource, tier, txn: p.txn, txnToken: p.txn?.raw, consistencyToken: ref.consistencyToken });
    if (d.noDecision) {
      await this.audit.emit({ ep: ep.id, tier, tid: bound.tid, principal: p, resource: ref, action, result: 'denied', noDecisionCause: d.decisionId ? undefined : d.noDecision, decision: d.decisionId ? { decisionId: d.decisionId } : null, reasonCode: 'deny_failmode', txn: p.txn, requestId: d.requestId });
      return this.noDecision(res, tier);
    }
    await this.audit.emit({ ep: ep.id, tier, tid: bound.tid, principal: p, resource: ref, action, result: d.allow ? 'permitted' : 'denied', decision: d, reasonCode: d.reason, txn: p.txn, requestId: d.requestId });
    if (!d.allow) return this.resourceDenied(res);   // OB-07, OB-10
    // tenant_scope: business code receives only the bound tenant (OB-13)
    const out = await business({ tid: bound.tid, principal: p, subject: subj.subject, decision: d });
    res.writeHead(out.status, { 'content-type': 'application/json', ...(out.headers ?? {}) });
    res.end(JSON.stringify(out.body));
  }

  authFailure(res, missing) {
    res.writeHead(401, { 'content-type': 'application/problem+json', 'www-authenticate': missing ? 'Bearer' : 'Bearer error="invalid_token"' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Unauthorized', status: 401, code: 'invalid_token' }));
  }
  resourceDenied(res) {
    res.writeHead(404, { 'content-type': 'application/problem+json' });
    res.end(DENY_BODY);
  }
  noDecision(res, tier) {
    const p = this.cfg.failmode.pdp[tier.split('/')[0]];
    res.writeHead(503, { 'content-type': 'application/problem+json', 'retry-after': String(p.on_no_decision.retry_after_seconds) });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Service Unavailable', status: 503, code: 'temporarily_unavailable' }));
  }
  async functionalDeny(res, ep, p, why) {
    await this.audit.emit({ ep: ep.id, tier: ep.tier, tid: p.tid, principal: p, action: ep.action, result: 'denied', noDecisionCause: 'pdp_response_invalid', reasonCode: `deny_pep:${why}`, txn: p.txn });
    res.writeHead(403, { 'content-type': 'application/problem+json' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Forbidden', status: 403, code: 'forbidden' }));
  }
}
