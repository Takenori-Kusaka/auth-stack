// Self-made stubs (CON-16 §4: ST-1, ST-2, ST-3, ST-5, ST-8 helpers, ST-10) for the trial. Test code only.
import http from 'node:http';
import crypto from 'node:crypto';
import { signES256, randomId, parseCompact, b64u } from '../src/jose.js';

function listen(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(async (req, res) => {
      let raw = ''; for await (const c of req) raw += c;
      try { await handler(req, res, raw); } catch (e) { console.error('stub error', e); if (!res.headersSent) { res.writeHead(500); res.end(); } }
    });
    s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}
const json = (res, status, obj, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };
const genKey = (kid) => { const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }); return { kid, privateKey, publicKey, jwk: { ...publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' } }; };

// ---------- ST-1 issuer (A: production role, B: sandbox role) ----------
export async function startIssuer(name) {
  const st = { name, fetches: { discovery: 0, jwks: 0 }, keys: {}, published: new Set(), discoveryOverride: null };
  st.keys.current = genKey(`${name.toLowerCase()}-cur-1`);
  st.keys.next_unpublished = genKey(`${name.toLowerCase()}-next-2`);
  st.keys.unknown_never_published = genKey(`${name.toLowerCase()}-never-9`);
  st.published.add('current');
  const { server, url } = await listen((req, res) => {
    if (req.url === '/.well-known/openid-configuration') { st.fetches.discovery++; return json(res, 200, { issuer: st.discoveryOverride ?? url, jwks_uri: `${url}/jwks` }); }
    if (req.url === '/jwks') { st.fetches.jwks++; return json(res, 200, { keys: [...st.published].map((k) => st.keys[k].jwk) }); }
    res.writeHead(404); res.end();
  });
  Object.assign(st, { server, url, issuer: url });
  st.publish = (k) => st.published.add(k);
  st.reset = () => { st.fetches = { discovery: 0, jwks: 0 }; };
  return st;
}

// ---------- ST-2 TTS + job ledger (CON-05 /txn-token, /txn-token-jwks, /acceptance-records) ----------
export async function startTts({ issuer = 'https://tts.stub.test.invalid', audience = 'txn-td-stub' } = {}) {
  const st = { issuer, audience, key: genKey('tts-cur-1'), records: new Map(), jwksUnavailable: false, ledgerInject: null, calls: { acceptance: 0, txn: 0 } };
  st.mint = (claims, { key = st.key, header = {} } = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iss: issuer, aud: audience, iat: now, exp: now + 60, txn: randomId(), scope: 'op.sup.test', req_wl: 'spiffe://stub.test.invalid/edge', ...claims };
    payload.tctx = { root_jti: randomId(), tier: 'write', ver: '1.0', ...(claims.tctx || {}) };
    return signES256({ typ: 'txntoken+jwt', alg: 'ES256', kid: key.kid, ...header }, payload, key.privateKey);
  };
  const { server, url } = await listen((req, res, raw) => {
    if (req.url === '/txn-token-jwks') { if (st.jwksUnavailable) return json(res, 503, { code: 'service_unavailable' }); return json(res, 200, { keys: [st.key.jwk] }); }
    if (req.url === '/acceptance-records' && req.method === 'POST') {
      st.calls.acceptance++;
      if (st.ledgerInject === 'overload_503') return json(res, 503, { type: 'about:blank', title: 'unavailable', status: 503, code: 'service_unavailable' }, { 'retry-after': '5' });
      const j = parseCompact(req.headers['txn-token']); if (!j) return json(res, 401, { code: 'unauthenticated' });
      const body = JSON.parse(raw);
      const id = randomId();
      st.records.set(id, { sub: j.payload.sub, tid: j.payload.tctx.tid, root_jti: j.payload.tctx.root_jti, gref: j.payload.tctx.gref, txn: j.payload.txn, job_definition_id: body.job_definition_id });
      return json(res, 201, { job_run_id: id, job_definition_id: body.job_definition_id, origin_txn: j.payload.txn, tier: 'read-sensitive', accepted_at: new Date().toISOString(), subject_token_type: 'urn:uuid:569d2793-a1dc-493e-a1ef-ca2904f77173' });
    }
    if (req.url === '/txn-token' && req.method === 'POST') {
      st.calls.txn++;
      const f = new URLSearchParams(raw); const rec = st.records.get(f.get('subject_token'));
      if (!rec) return json(res, 400, { error: 'invalid_request' });
      const tok = st.mint({ sub: rec.sub, scope: f.get('scope'), tctx: { tid: rec.tid, root_jti: rec.root_jti, tier: 'read-sensitive', ptxn: rec.txn } });
      return json(res, 200, { access_token: tok, issued_token_type: 'urn:ietf:params:oauth:token-type:txn_token', token_type: 'N_A', expires_in: 60 });
    }
    res.writeHead(404); res.end();
  });
  Object.assign(st, { server, url });
  // fixture helper: register an acceptance record directly (job_run.t1)
  st.fixtureRecord = (sub, tid) => { const id = randomId(); st.records.set(id, { sub, tid, root_jti: randomId(), txn: randomId() }); return id; };
  return st;
}

// ---------- ST-3 PDP façade with a tiny evaluator of the sup model + injections (CON-11 §4.4 kinds) ----------
export async function startPdp() {
  const st = { tuples: new Set(), grants: [], calls: [], inject: null, revokedSubjects: new Set(), injectParams: {} };
  const has = (obj, rel, subj) => st.tuples.has(`${obj}#${rel}@${subj}`);
  const objs = (obj, rel) => [...st.tuples].filter((t) => t.startsWith(`${obj}#${rel}@`)).map((t) => t.split('@')[1]);
  const grantee = (obj, rel, user) => st.grants.some((g) => g.state === 'active' && g.anchor === obj && g.relation === rel && g.grantee === user && Date.parse(g.expires_at) > Date.now());
  const user = (u) => `core/user:${u}`;
  const P = {
    'core/tenant': { manage: (o, u) => has(o, 'admin', user(u)), member: (o, u) => has(o, 'member', user(u)) },
    'sup/desk': {
      parentTenant: (o) => objs(o, 'parent')[0],
      manage: (o, u) => has(o, 'admin', user(u)) || P['core/tenant'].manage(P['sup/desk'].parentTenant(o), u),
      handle: (o, u) => has(o, 'agent', user(u)) || grantee(o, 'partner', u) || P['sup/desk'].manage(o, u),
      create_ticket: (o, u) => P['core/tenant'].member(P['sup/desk'].parentTenant(o), u) || P['sup/desk'].handle(o, u),
      invite_partner: (o, u) => P['sup/desk'].manage(o, u),
    },
    'sup/ticket': {
      desk: (o) => objs(o, 'parent')[0],
      read: (o, u) => has(o, 'requester', user(u)) || has(o, 'assignee', user(u)) || P['sup/desk'].handle(P['sup/ticket'].desk(o), u) || grantee(o, 'guest', u),
      comment: (o, u) => has(o, 'requester', user(u)) || has(o, 'assignee', user(u)) || P['sup/desk'].handle(P['sup/ticket'].desk(o), u),
      draft_reply: (o, u) => has(o, 'assignee', user(u)) || P['sup/desk'].handle(P['sup/ticket'].desk(o), u),
      send_reply: (o, u) => has(o, 'assignee', user(u)) || P['sup/desk'].handle(P['sup/ticket'].desk(o), u),
      assign: (o, u) => P['sup/desk'].manage(P['sup/ticket'].desk(o), u),
      invite_guest: (o, u) => has(o, 'requester', user(u)) || P['sup/desk'].manage(P['sup/ticket'].desk(o), u),
      close: (o, u) => has(o, 'requester', user(u)) || has(o, 'assignee', user(u)) || P['sup/desk'].manage(P['sup/ticket'].desk(o), u),
    },
  };
  st.check = (subject, action, resource) => {
    if (subject.properties?.tid !== resource.properties?.tid) return 'deny_guardrail:g1'; // G stage, always on
    if (subject.type !== 'core/user') return 'deny_no_relation';
    if (st.revokedSubjects.has(subject.id)) return 'deny_no_relation';
    const fn = P[resource.type]?.[action.name];
    if (!fn) return 'deny_no_relation';
    try { return fn(`${resource.type}:${resource.id}`, subject.id) ? 'allow' : 'deny_no_relation'; } catch { return 'deny_no_relation'; }
  };
  const decision = (reason, mode, extra = {}) => ({ decision: reason === 'allow', context: { 'x-authz-profile': { decision_id: randomId(), reason, model_revision: { model_revision: 'stub-rev-1', guardrail_catalog_version: 'g-1' }, consistency: { mode }, ...extra } } });
  const reqMode = (body, tier) => body.context?.['x-authz-profile']?.consistency?.mode || 'minimize_latency';
  const { server, url } = await listen(async (req, res, raw) => {
    if (req.url === '/.well-known/authzen-configuration') return json(res, 200, { policy_decision_point: url, access_evaluation_endpoint: `${url}/access/v1/evaluation`, access_evaluations_endpoint: `${url}/access/v1/evaluations` });
    const rid = req.headers['x-request-id'];
    const body = raw ? JSON.parse(raw) : {};
    const isMany = req.url === '/access/v1/evaluations';
    if (req.url !== '/access/v1/evaluation' && !isMany) { res.writeHead(404); return res.end(); }
    st.calls.push({ path: req.url, body, headers: req.headers });
    const mode = reqMode(body);
    const k = st.inject;
    const hdr = { 'x-request-id': rid };
    const finalReason = (b) => (st.revokedOnce && st.revokedOnce.n++ >= 1 ? 'deny_no_relation' : null) || st.check(b.subject, b.action, b.resource);
    const items = isMany ? body.evaluations.map((e) => ({ subject: e.subject || body.subject, action: e.action || body.action, resource: e.resource || body.resource })) : [body];
    const build = () => {
      if (isMany) return { evaluations: items.map((it, i) => {
        if (k === 'evaluations_item_reason') return i === st.injectParams.index ? decision(st.injectParams.reason, mode) : decision('allow', mode);
        return decision(st.check(it.subject, it.action, it.resource), mode);
      }) };
      return decision(finalReason(body), mode);
    };
    switch (k) {
      case 'timeout': return; // never respond (SUT must abort at D(t))
      case 'late_allow': await new Promise((r) => setTimeout(r, 450)); return json(res, 200, decision('allow', mode), hdr);
      case 'body_delay': res.writeHead(200, { 'content-type': 'application/json', ...hdr }); res.write('{"decision":true,'); await new Promise((r) => setTimeout(r, 450)); return res.end(JSON.stringify(decision('allow', mode)).slice(1));
      case 'overload_503': return json(res, 503, { code: 'service_unavailable' }, { ...hdr, 'retry-after': '3' });
      case 'quota_429': return json(res, 429, { code: 'too_many_requests' }, { ...hdr, 'retry-after': '3' });
      case 'engine_unreachable': return json(res, 200, decision('deny_unavailable', mode), hdr);
      case 'indeterminate': return json(res, 200, decision('deny_indeterminate', mode), hdr);
      case 'unsupported_profile': return json(res, 200, decision('unsupported_profile', mode), hdr);
      case 'deny': return json(res, 200, isMany ? { evaluations: items.map(() => decision('deny_no_relation', mode)) } : decision('deny_no_relation', mode), hdr);
      case 'decision_id_missing': { const d = decision('allow', mode); delete d.context['x-authz-profile'].decision_id; return json(res, 200, d, hdr); }
      case 'request_id_mismatch': return json(res, 200, decision('allow', mode), { 'x-request-id': randomId() });
      case 'consistency_weaker': return json(res, 200, decision('allow', 'minimize_latency'), hdr);
      default: return json(res, 200, build(), hdr);
    }
  });
  Object.assign(st, { server, url });
  st.write = (obj, rel, subj) => st.tuples.add(`${obj}#${rel}@${subj}`);
  st.reset = () => { st.inject = null; st.injectParams = {}; st.calls = []; st.revokedOnce = null; };
  return st;
}

// ---------- CON-04 Registry stub (writeRelationships into the PDP stub) ----------
export async function startRegistry(pdp, directory) {
  const st = { calls: [] };
  const { server, url } = await listen((req, res, raw) => {
    const m = req.url.match(/^\/v1\/tenants\/([^/]+)\/relationships\/write$/);
    if (!m || req.method !== 'POST') { res.writeHead(404); return res.end(); }
    const tid = decodeURIComponent(m[1]);
    const j = parseCompact(req.headers['txn-token'] || '');
    if (!j || j.payload.tctx?.tid !== tid) return json(res, 403, { code: 'tenant_binding_violation' }, { 'x-request-id': req.headers['x-request-id'] });
    const body = JSON.parse(raw); st.calls.push(body);
    for (const w of body.writes) {
      if (w.subject.type === 'core/user' && directory.home(w.subject.id) && directory.home(w.subject.id) !== tid) return json(res, 403, { code: 'tenant_boundary_violation' }, { 'x-request-id': req.headers['x-request-id'] });
      if (String(w.subject.type).startsWith('core/external_grant')) return json(res, 403, { code: 'relation_not_writable' }, { 'x-request-id': req.headers['x-request-id'] });
    }
    for (const w of body.writes) pdp.write(`${w.resource.type}:${w.resource.id}`, w.relation, `${w.subject.type}:${w.subject.id}`);
    return json(res, 200, { consistency_token: 'ct_stub_' + randomId(), written_at: new Date().toISOString() }, { 'x-request-id': req.headers['x-request-id'] });
  });
  Object.assign(st, { server, url });
  return st;
}

// ---------- ST-10 external grant API (CON-17) with the state machine ----------
export async function startExternalGrant(pdp) {
  const st = { calls: [], inject: null };
  const view = (g) => ({ grant_id: g.grant_id, tenant_id: g.tid, state: g.state, anchor: { resource: { type: g.anchor.split(':')[0], id: g.anchor.split(':')[1] }, relation: g.relation }, granter: { sub: g.granter }, created_at: g.created_at, expires_at: g.expires_at, invitation_expires_at: g.expires_at, jurisdictions: { resource: 'jp' }, policy_versions: { resource_inbound: 'pv_stub' } });
  const { server, url } = await listen((req, res, raw) => {
    const rid = { 'x-request-id': req.headers['x-request-id'] || randomId() };
    st.calls.push({ method: req.method, url: req.url, headers: req.headers, raw });
    let m = req.url.match(/^\/v1\/tenants\/([^/]+)\/external-grants(\/revoke-by-anchor)?$/);
    if (!m || req.method !== 'POST') { res.writeHead(404); return res.end(); }
    if (st.inject === 'overload_503') return json(res, 503, { code: 'unavailable' }, { ...rid, 'retry-after': '3' });
    const tid = decodeURIComponent(m[1]);
    const j = parseCompact(req.headers['txn-token'] || '');
    if (!j) return json(res, 401, { code: 'txn_token_required' }, rid);
    if (j.payload.tctx?.tid !== tid) return json(res, 403, { code: 'tenant_binding_violation' }, rid);
    const body = JSON.parse(raw);
    if (m[2]) {
      const anchor = `${body.anchor_resource.type}:${body.anchor_resource.id}`;
      const hit = pdp.grants.filter((g) => g.anchor === anchor && ['invited', 'active', 'held', 'pending_approval'].includes(g.state));
      hit.forEach((g) => { g.state = 'revoked'; });
      return json(res, 200, { revoked_count: hit.length, revoked_grant_ids: hit.map((g) => g.grant_id), remaining: 0, consistency_token: 'ct_stub_' + randomId() }, rid);
    }
    const anchor = `${body.anchor.resource.type}:${body.anchor.resource.id}`;
    // XGS-3 re-evaluation of the granter's authorizing_permission (simplified)
    const reason = pdp.check({ type: 'core/user', id: j.payload.sub, properties: { tid } }, { name: body.authorizing_permission }, { type: body.anchor.resource.type, id: body.anchor.resource.id, properties: { tid } });
    if (reason !== 'allow') return json(res, 403, { code: 'granter_not_allowed' }, rid);
    const g = { grant_id: randomId(), tid, anchor, relation: body.anchor.relation, grantee: null, state: 'invited', granter: j.payload.sub, expires_at: body.expires_at, created_at: new Date().toISOString() };
    pdp.grants.push(g);
    return json(res, 201, { grant: view(g), consistency_token: 'ct_stub_' + randomId() }, rid);
  });
  Object.assign(st, { server, url });
  // test helper: acceptance by the resource-side AS (dependent service never calls this)
  st.accept = (grantId, guestSub) => { const g = pdp.grants.find((x) => x.grant_id === grantId); g.grantee = guestSub; g.state = 'active'; return g; };
  st.fixtureGrant = ({ anchor, relation, grantee, expires_at, tid }) => { const g = { grant_id: randomId(), tid, anchor, relation, grantee, state: 'active', expires_at, created_at: new Date().toISOString() }; pdp.grants.push(g); return g; };
  return st;
}

// ---------- ST-5 audit sink (collects; schema validation is done by scripts/validate-audit.py) ----------
export async function startAuditSink() {
  const st = { events: [] };
  const { server, url } = await listen((req, res, raw) => { if (req.method === 'POST') st.events.push(JSON.parse(raw)); res.writeHead(202); res.end(); });
  Object.assign(st, { server, url });
  return st;
}

export { genKey };
