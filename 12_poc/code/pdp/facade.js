// PDP façade (ADR-011 D5-3): AuthZEN 1.0 evaluation / evaluations / resource search + 自社 profile
// (decision_id, model_revision, consistency, reason), G 段 guardrails before the engine (ADR-010 D-28,
// ADR-011 D1-2), engine adapters (OpenFGA | Cedar, switched by PDP_ENGINE), relationship writes with X-8
// write declarations, model registry (revision pin / rollback), decision events (E1) to the audit journal.
// Contract: 11_contracts/authorization-api.openapi.yaml, relationship-model-registry.openapi.yaml.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { boot, ready, onShutdown } from '../lib/runtime.js';
import { createServer, listen, router, readJson, send, peerCert } from '../lib/http.js';
import { spiffeIdFromPeer } from '../lib/pki.js';
import { tlsFor, clientTls } from '../lib/topology.js';
import { opaqueId, parseTraceparent } from '../lib/ids.js';
import { AuditProducer } from '../lib/audit.js';
import { RevocationClient } from '../lib/revocation.js';
import { loadCam, compileCam, permissionTier } from '../model/cam.js';
import { OpenFgaAdapter } from './adapters/openfga.js';
import { CedarAdapter } from './adapters/cedar.js';
import { evaluateGuardrails, ACR_ORDER } from './guardrails.js';
import { diffModels } from '../model/diff.js';

const { topo, secrets, log } = boot('pdp');
const ENGINE = process.env.PDP_ENGINE || topo.engine || 'openfga';
const FAULT_ADMIN = process.env.POC_FAULT_ADMIN === '1';
const PROFILE_MAJOR = 1;
const kCtoken = Buffer.from(secrets.kCtoken, 'hex');
const kCursor = Buffer.from(secrets.kCursor, 'hex');
const dataDir = path.join(topo.dataDir, 'pdp');
fs.mkdirSync(dataDir, { recursive: true });
const decisionsFile = path.join(dataDir, 'decisions.jsonl');
const regFile = path.join(dataDir, 'object-tenant.jsonl');

// ---- engine -----------------------------------------------------------------------------------
const engineUrl = process.env.PDP_ENGINE_URL || topo.urls.openfga;
const adapter = ENGINE === 'cedar'
  ? new CedarAdapter({ storeFile: path.join(dataDir, 'cedar-tuples.jsonl'), log })
  : new OpenFgaAdapter({ url: engineUrl, log, timeoutMs: Number(process.env.PDP_ENGINE_TIMEOUT_MS || 2000), stateFile: path.join(dataDir, 'openfga-store.json') });
await adapter.init();

// ---- model registry ---------------------------------------------------------------------------
const registry = { revisions: new Map(), current: null, pins: new Map() };
async function registerCam(raw, { activate = false } = {}) {
  const cam = raw.types instanceof Map ? raw : compileCam(raw);
  if (!registry.revisions.has(cam.revision)) {
    await adapter.registerModel(cam);
    registry.revisions.set(cam.revision, { cam, registeredAt: new Date().toISOString() });
    registry.latest = cam.revision; // base_revision of the next conditional registration (PDP_MODEL_GATE)
    log.info('model registered', { revision: cam.revision });
  }
  if (activate || !registry.current) registry.current = cam.revision;
  return cam.revision;
}
await registerCam(loadCam(topo.files.cam));
const revisionFor = (tid, pin) => {
  if (pin) return registry.revisions.has(pin) ? pin : null;
  return registry.pins.get(tid) || registry.current;
};

// ---- object -> tenant registry (resource-derived tenant as known to the façade; X-9 keeps tid out of IDs) ----
const objTenant = new Map();
if (fs.existsSync(regFile)) for (const l of fs.readFileSync(regFile, 'utf8').split('\n')) if (l) { const e = JSON.parse(l); objTenant.set(e.k, e.tid); }
function setOwner(k, tid) { if (!objTenant.has(k)) { objTenant.set(k, tid); fs.appendFileSync(regFile, JSON.stringify({ k, tid }) + '\n'); } }

// ---- state (G 段規則 2・3・6) --------------------------------------------------------------------
const rev = new RevocationClient({ url: topo.urls.state, tls: clientTls(topo, 'pdp'), pollMs: topo.settings.revocationPollMs });
await rev.start();

// ---- audit --------------------------------------------------------------------------------------
const audit = new AuditProducer({ topo, secrets, workload: 'pdp', tls: clientTls(topo, 'pdp') });

// ---- consistency tokens: "<engine>:<seq>.<mac>" (opaque to PEPs; MAC-bound to engine and seq) ---
let writeSeq = 0;
const seqFile = path.join(dataDir, 'write-seq');
if (fs.existsSync(seqFile)) writeSeq = Number(fs.readFileSync(seqFile, 'utf8')) || 0;
function makeCtoken(seq) {
  const body = `${ENGINE}:${seq}`;
  return `${body}.${crypto.createHmac('sha256', kCtoken).update(body).digest('base64url').slice(0, 22)}`;
}
function parseCtoken(tok) {
  if (typeof tok !== 'string') return null;
  const i = tok.lastIndexOf('.');
  if (i < 0) return null;
  const body = tok.slice(0, i);
  const mac = crypto.createHmac('sha256', kCtoken).update(body).digest('base64url').slice(0, 22);
  if (mac !== tok.slice(i + 1)) return null;
  const [eng, seq] = body.split(':');
  if (eng !== ENGINE) return null;
  return { seq: Number(seq) };
}

// ---- callers ------------------------------------------------------------------------------------
const byspiffe = new Map(Object.values(topo.workloads).map((w) => [w.spiffeId, w.name]));
const PEP_CALLERS = new Set(['edge', 'bff', 'tool-service', 'file-service', 'label-service', 'harness', 'admin', 'inject-proxy']);
function callerOf(req) {
  const id = spiffeIdFromPeer(peerCert(req));
  return id ? { spiffeId: id, name: byspiffe.get(id) } : null;
}

// ---- fault emulation (FM-13 誤応答; only with POC_FAULT_ADMIN=1) -----------------------------------
let fault = { mode: 'none' };

// ---- core evaluation ----------------------------------------------------------------------------
const TIER_DEFAULT_MODE = { 'read-sensitive': 'minimize_latency', write: 'fully_consistent', privileged: 'fully_consistent', 'break-glass': 'fully_consistent', public: 'minimize_latency' };
const MODE_RANK = { minimize_latency: 0, at_least_as_fresh: 1, fully_consistent: 2 };

// ---- tenant revocation fence (ADR-010 D-18, opt-in: PDP_REVOCATION_FENCE=1; TC-008 layer condition) ------
// A narrowing relationship write (delete, restricted_external) advances the tenant's fence to the write's
// consistency token. read-sensitive evaluations in that tenant are then made at >= max(content token, fence);
// OpenFGA has no at-least-as-fresh primitive, so they are upgraded to HIGHER_CONSISTENCY (ADR-011 D6-3) for
// PDP_FENCE_WINDOW_MS after the advance (0 = no expiry). The fence only moves forward (MAC-checked tokens).
const FENCE_ON = process.env.PDP_REVOCATION_FENCE === '1';
const FENCE_WINDOW_MS = Number(process.env.PDP_FENCE_WINDOW_MS || 0);
const fenceFile = path.join(dataDir, 'revocation-fence.json');
const fences = new Map(FENCE_ON && fs.existsSync(fenceFile) ? Object.entries(JSON.parse(fs.readFileSync(fenceFile, 'utf8'))) : []); // tid -> { seq, at }
function advanceFence(tid, seq, source) {
  const cur = fences.get(tid);
  if (cur && cur.seq >= seq) return false;
  fences.set(tid, { seq, at: Date.now() });
  fs.writeFileSync(fenceFile, JSON.stringify(Object.fromEntries(fences)));
  fs.appendFileSync(path.join(dataDir, 'fence.jsonl'), JSON.stringify({ t: new Date().toISOString(), tid, seq, prev: cur?.seq ?? null, source }) + '\n');
  return true;
}
function fenceFor(tid) {
  if (!FENCE_ON || !tid) return null;
  const f = fences.get(tid);
  if (!f) return null;
  if (FENCE_WINDOW_MS > 0 && Date.now() - f.at > FENCE_WINDOW_MS) return null;
  return f;
}

function effectiveMode(tier, requested, token, tid) {
  let mode = requested && MODE_RANK[requested] !== undefined ? requested : null;
  const tierDefault = TIER_DEFAULT_MODE[tier] || 'fully_consistent';
  if (!mode) mode = tierDefault;
  if (MODE_RANK[mode] < MODE_RANK[tierDefault]) mode = tierDefault; // 格下げ不可 (ADR-011 D6-3)
  if (tier === 'read-sensitive' && fenceFor(tid) && MODE_RANK[mode] < 1) mode = 'at_least_as_fresh'; // lower bound = fence (D-18)
  if (token !== undefined) {
    const t = parseCtoken(token);
    if (!t) mode = 'fully_consistent'; // 解釈できない token は格上げ (ADR-011 D6-1)
    else if (MODE_RANK[mode] < 1) mode = 'at_least_as_fresh';
  }
  // OpenFGA has no "at least as fresh as token" primitive -> always upgrade (ADR-011 D6-3 / U-03 暫定)
  if (mode === 'at_least_as_fresh') mode = 'fully_consistent';
  // Cedar adapter evaluates the in-process PIP snapshot synchronously
  if (ENGINE === 'cedar') mode = 'fully_consistent';
  return mode;
}

function profileOf(ctx) { return (ctx && ctx['x-authz-profile']) || {}; }

/** Evaluate one AuthZEN request item. Returns { decision, reason, decision_id, ... } */
async function evaluateOne(item, meta) {
  const t0 = process.hrtime.bigint();
  const decision_id = opaqueId();
  const prof = profileOf(item.context);
  const subject = item.subject || {}, resource = item.resource || {}, action = item.action || {};
  const sp = subject.properties || {}, rp = resource.properties || {};
  const camRev0 = registry.current;
  const out = { decision: false, reason: 'deny_indeterminate', decision_id, model_revision: camRev0, requested_mode: prof.consistency?.mode, effective_mode: 'fully_consistent', tier: null };
  const finish = (reason, extra = {}) => {
    Object.assign(out, extra, { reason, decision: reason === 'allow' });
    out.latency_us = Number(process.hrtime.bigint() - t0) / 1000;
    return out;
  };
  // profile version (ADR-011 D6-2)
  const pv = prof.profile_version || '1.0';
  if (Number(String(pv).split('.')[0]) !== PROFILE_MAJOR) return finish('unsupported_profile');
  out.profile_version = pv;
  const sTid = sp.tid, rTid = rp.tid;
  if (!sTid || !rTid) return finish('deny_indeterminate', { detail: 'tid missing' });
  // model revision (pin or tenant pin, never "latest")
  const camRev = revisionFor(rTid, prof.model?.pin);
  if (!camRev) return finish('deny_indeterminate', { detail: 'unknown model pin' });
  out.model_revision = camRev;
  const cam = registry.revisions.get(camRev).cam;
  const tier = permissionTier(cam, resource.type, action.name);
  if (!tier) return finish('deny_indeterminate', { detail: 'unknown resource type or permission' });
  out.tier = tier;
  out.effective_mode = effectiveMode(tier, prof.consistency?.mode, prof.consistency?.token, rTid);
  if (tier === 'read-sensitive' && fenceFor(rTid)) out.fence_seq = fenceFor(rTid).seq;
  // G 段 (ADR-011 D1-2): deterministic deny before the engine
  const g = await evaluateGuardrails({
    subject, resource, action, tier, sTid, rTid, cell: topo.cellId, rev, objTenant,
    membership: async () => adapter.check({ subject: { type: subject.type, id: subject.id }, relation: 'belongs', resource: { type: 'core/tenant', id: rTid }, modelRevision: camRev, mode: out.effective_mode, now: Date.now() }),
  });
  if (g) return finish(g.reason, { detail: g.detail, guard: g.rule });
  // R 段
  const r = await adapter.check({ subject: { type: subject.type, id: subject.id }, relation: action.name, resource: { type: resource.type, id: resource.id }, modelRevision: camRev, mode: out.effective_mode, now: Date.now() });
  if (r.error === 'unavailable') return finish('deny_unavailable', { detail: r.detail });
  if (r.error) return finish('deny_indeterminate', { detail: r.detail });
  return finish(r.allowed ? 'allow' : 'deny_no_relation', { slice: r.slice });
}

function applyFault(o) {
  switch (fault.mode) {
    case 'allow_all': o.decision = true; o.reason = 'allow'; break;
    case 'deny_all': o.decision = false; o.reason = 'deny_no_relation'; break;
    case 'stale_revision': o.model_revision = fault.revision || 'm-0000000000000000'; break;
    case 'drop_decision_id': o.decision_id = undefined; break;
    default: break;
  }
  return o;
}

function profileDecision(o) {
  const p = {
    decision_id: o.decision_id,
    reason: o.reason,
    model_revision: { model_revision: o.model_revision, guardrail_catalog_version: registry.revisions.get(o.model_revision)?.cam.guardrailVersion || 'g-1' },
    consistency: { mode: o.effective_mode },
  };
  if (o.effective_mode === 'fully_consistent') p.consistency.token = makeCtoken(writeSeq);
  if (p.decision_id === undefined) delete p.decision_id;
  return p;
}

// decision event (E1) + raw decision record
function record(o, item, meta) {
  const s = item.subject || {}, r = item.resource || {}, a = item.action || {};
  const corr = (item.context && item.context['x-authz-corr']) || {};
  const prof = profileOf(item.context);
  fs.appendFileSync(decisionsFile, JSON.stringify({
    t: new Date().toISOString(), decision_id: o.decision_id, batch_decision_id: meta.batchId, request_id: meta.requestId,
    caller: meta.caller?.name, engine: ENGINE, subject: { type: s.type, id: s.id, tid: s.properties?.tid }, action: a.name,
    resource: { type: r.type, id: r.id, tid: r.properties?.tid }, decision: o.decision, reason: o.reason, guard: o.guard, detail: o.detail,
    tier: o.tier, model_revision: o.model_revision, requested_mode: o.requested_mode, effective_mode: o.effective_mode, fence_seq: o.fence_seq,
    txn: prof.txn, trace_id: meta.traceId, latency_us: o.latency_us, fault: fault.mode !== 'none' ? fault.mode : undefined,
  }) + '\n');
  if (!o.tier || o.tier === 'public') return; // decision family excludes public; unknown type -> raw record only
  const human = (s.properties?.principal_type || 'human') === 'human';
  const subjectP = human ? { type: 'human', subj_ref: audit.subjRef(s.id) } : { type: s.properties?.principal_type, nhi_id: s.id };
  const chain = [{ type: 'workload', nhi_id: meta.caller?.spiffeId || topo.workloads.pdp.spiffeId }];
  if (s.properties?.actor?.id) chain.unshift({ type: s.properties.actor.type === 'ai_agent' ? 'ai_agent' : 'workload', nhi_id: s.properties.actor.id });
  const tierAudit = o.tier.startsWith('privileged') ? 'privileged' : o.tier;
  const ev = {
    family: 'decision',
    event_type: meta.batchId ? 'authz.evaluations_item' : 'authz.evaluation',
    tid: s.properties?.tid && /^[a-z0-9][a-z0-9-]{15,63}$/.test(s.properties.tid) ? s.properties.tid : '~platform',
    tier: tierAudit,
    outcome: ['allow', 'deny_no_relation'].includes(o.reason) || o.reason.startsWith('deny_guardrail') ? 'success' : 'unknown',
    reason_code: o.reason,
    subject: subjectP,
    actor: { mode: 'delegated', chain, on_behalf_of: subjectP },
    resource: { type: r.type, res_ref: audit.resRef(r.type, r.id) },
    action: { name: a.name },
    corr: {
      iss: corr.iss, jti_ref: corr.jti_ref, sid: corr.sid, grant_ref: corr.grant_ref, txn: prof.txn,
      decision_id: o.decision_id, request_id: meta.requestId, trace_id: meta.traceId,
    },
    detail: {
      decision: o.decision, reason: o.reason, profile_version: o.profile_version || '1.0',
      model_revision: o.model_revision, guardrail_catalog_version: registry.revisions.get(o.model_revision)?.cam.guardrailVersion || 'g-1',
      consistency: { effective_mode: o.effective_mode, ...(o.requested_mode ? { requested_mode: o.requested_mode } : {}) },
      freshness: 'fresh',
      engine: { pdp_node: topo.workloads.pdp.spiffeId, engine_id: ENGINE, engine_version: adapter.engine_version },
      request_id_echo: 'facade',
    },
  };
  if (s.properties?.acr) ev.detail.acr = s.properties.acr;
  if (s.properties?.auth_time) ev.detail.auth_time = new Date(Number(s.properties.auth_time) * 1000).toISOString();
  if (tierAudit === 'privileged') ev.tier_sub = 'T';
  if (!ev.corr.decision_id || !ev.corr.request_id || !ev.corr.iss || !ev.corr.jti_ref) return; // cannot form a schema-valid E1 (raw record kept)
  if ((tierAudit === 'write' || tierAudit === 'privileged') && !ev.corr.txn) return; // schema requires txn for write+; raw record kept
  audit.emit(ev).catch((e) => log.warn('audit emit failed', { e: e.message }));
}

function reqMeta(req, caller) {
  const rid = req.headers['x-request-id'];
  const tp = parseTraceparent(req.headers.traceparent);
  return { requestId: typeof rid === 'string' ? rid : undefined, traceId: tp?.traceId, caller };
}

function echoHeaders(meta) {
  if (fault.mode === 'drop_request_id') return {}; // TC-013 (4): X-Request-ID echo missing (engine-swap-perf-audit)
  return meta.requestId ? { 'x-request-id': fault.mode === 'wrong_request_id' ? opaqueId() : meta.requestId } : {};
}

function validItem(it) {
  return it && it.subject && typeof it.subject.type === 'string' && typeof it.subject.id === 'string'
    && it.resource && typeof it.resource.type === 'string' && typeof it.resource.id === 'string'
    && it.action && typeof it.action.name === 'string';
}

// ---- HTTP ---------------------------------------------------------------------------------------
const r = router();
const guardCaller = (req, res) => {
  const c = callerOf(req);
  if (!c || !PEP_CALLERS.has(c.name)) { send(res, 401, 'unauthenticated'); return null; }
  return c;
};
async function faultDelay(res) {
  if (fault.mode === 'delay') await new Promise((ok) => setTimeout(ok, fault.ms || 1000));
  if (fault.mode === 'unavailable') { send(res, 503, 'unavailable', { 'retry-after': '1' }); return true; }
  return false;
}

r.add('GET', '/.well-known/authzen-configuration', (req, res) => {
  const meta = reqMeta(req, null);
  const base = `https://127.0.0.1:${topo.ports.pdp}`;
  return send(res, 200, {
    policy_decision_point: fault.mode === 'metadata_mixup' ? 'https://pdp.attacker.poc.test' : topo.issuers.pdp,
    access_evaluation_endpoint: `${base}/access/v1/evaluation`,
    access_evaluations_endpoint: `${base}/access/v1/evaluations`,
    search_resource_endpoint: `${base}/access/v1/search/resource`,
    capabilities: ['x-authz-profile/1.0'],
  }, echoHeaders(meta));
});

r.add('POST', '/access/v1/evaluation', async (req, res) => {
  const caller = guardCaller(req, res);
  if (!caller) return;
  const meta = reqMeta(req, caller);
  if (await faultDelay(res)) return;
  const body = await readJson(req);
  if (!validItem(body)) return send(res, 400, 'subject, action and resource are required', echoHeaders(meta));
  const o = applyFault(await evaluateOne(body, meta));
  record(o, body, meta);
  return send(res, 200, { decision: o.decision, context: { 'x-authz-profile': profileDecision(o) } }, echoHeaders(meta));
});

r.add('POST', '/access/v1/evaluations', async (req, res) => {
  const caller = guardCaller(req, res);
  if (!caller) return;
  const meta = reqMeta(req, caller);
  if (await faultDelay(res)) return;
  const body = (await readJson(req)) || {};
  const sem = body.options?.evaluations_semantic || 'execute_all';
  if (!['execute_all', 'deny_on_first_deny', 'permit_on_first_permit'].includes(sem)) return send(res, 400, 'bad evaluations_semantic', echoHeaders(meta));
  let items = Array.isArray(body.evaluations) && body.evaluations.length ? body.evaluations : null;
  if (!items) {
    if (validItem(body)) items = [{}];
    else return send(res, 400, 'evaluations is empty and no top-level defaults', echoHeaders(meta));
  }
  const merged = items.map((it) => ({
    subject: it.subject || body.subject, action: it.action || body.action, resource: it.resource || body.resource,
    context: it.context || body.context,
  }));
  // permit_on_first_permit is forbidden for privileged-and-above operations (ADR-011 D3-7)
  if (sem === 'permit_on_first_permit') {
    const cam = registry.revisions.get(registry.current).cam;
    for (const m of merged) {
      const t = m.resource && m.action ? permissionTier(cam, m.resource.type, m.action.name) : null;
      if (t && (t.startsWith('privileged') || t.startsWith('break-glass'))) return send(res, 400, 'permit_on_first_permit not allowed for privileged operations', echoHeaders(meta));
    }
  }
  const batchId = opaqueId();
  const results = [];
  for (const m of merged) {
    if (!validItem(m)) { results.push({ decision: false, context: { error: { status: 400, message: 'invalid item' }, 'x-authz-profile': { decision_id: opaqueId(), reason: 'deny_indeterminate', model_revision: { model_revision: registry.current, guardrail_catalog_version: 'g-1' }, consistency: { mode: 'fully_consistent' } } } }); continue; }
    const o = applyFault(await evaluateOne(m, { ...meta, batchId }));
    record(o, m, { ...meta, batchId });
    results.push({ decision: o.decision, context: { 'x-authz-profile': profileDecision(o) } });
    if (sem === 'deny_on_first_deny' && !o.decision) break;
    if (sem === 'permit_on_first_permit' && o.decision) break;
  }
  return send(res, 200, { evaluations: results, context: { 'x-authz-profile': { batch_decision_id: batchId } } }, echoHeaders(meta));
});

// Resource search (preview; SDK list helper only; results are candidates, never authority)
function pageToken(bind, offset) {
  const body = Buffer.from(JSON.stringify({ ...bind, off: offset, exp: Date.now() + 60_000 })).toString('base64url');
  return `${body}.${crypto.createHmac('sha256', kCursor).update(body).digest('base64url').slice(0, 22)}`;
}
function readPageToken(tok) {
  const i = (tok || '').lastIndexOf('.');
  if (i < 0) return null;
  const body = tok.slice(0, i);
  if (crypto.createHmac('sha256', kCursor).update(body).digest('base64url').slice(0, 22) !== tok.slice(i + 1)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
}
const SEARCH_CALLERS = new Set(['tool-service', 'file-service', 'harness', 'edge']);
r.add('POST', '/access/v1/search/resource', async (req, res) => {
  const caller = guardCaller(req, res);
  if (!caller) return;
  const meta = reqMeta(req, caller);
  if (!SEARCH_CALLERS.has(caller.name)) return send(res, 403, 'search not permitted for caller', echoHeaders(meta));
  if (await faultDelay(res)) return;
  const b = (await readJson(req)) || {};
  if (!b.subject?.id || !b.resource?.type || !b.action?.name) return send(res, 400, 'subject, action, resource.type required', echoHeaders(meta));
  const limit = b.page?.limit ?? 50;
  if (limit > 100) return send(res, 400, 'page.limit exceeds 100', echoHeaders(meta));
  const sTid = b.subject.properties?.tid;
  const bind = { s: b.subject.id, t: sTid, ty: b.resource.type, a: b.action.name, rev: revisionFor(sTid, b.context?.['x-authz-profile']?.model?.pin), lim: limit };
  let offset = 0;
  if (b.page?.token) {
    const p = readPageToken(b.page.token);
    if (!p) return send(res, 400, 'invalid page token', echoHeaders(meta));
    if (p.s !== bind.s || p.t !== bind.t) return send(res, 403, 'page token bound to another subject/tenant', echoHeaders(meta));
    if (p.ty !== bind.ty || p.a !== bind.a || p.rev !== bind.rev || p.lim !== bind.lim || p.exp < Date.now()) return send(res, 400, 'page token parameters changed or expired', echoHeaders(meta));
    offset = p.off;
  }
  const decision_id = opaqueId();
  const candidates = [...objTenant.entries()].filter(([k, t]) => t === sTid && k.startsWith(b.resource.type + ':')).map(([k]) => k.slice(b.resource.type.length + 1));
  const lr = await adapter.listObjects({ type: b.resource.type, relation: b.action.name, subject: { type: b.subject.type, id: b.subject.id }, modelRevision: bind.rev, mode: 'fully_consistent', now: Date.now(), candidates });
  if (lr.error) return send(res, 503, 'search unavailable', { ...echoHeaders(meta), 'retry-after': '1' });
  // tenant first (ADR-025 D25-06): drop objects not registered to the subject's tenant
  const inTenant = lr.objects.filter((id) => objTenant.get(`${b.resource.type}:${id}`) === sTid).sort();
  const page = inTenant.slice(offset, offset + limit);
  const next = offset + limit < inTenant.length ? pageToken(bind, offset + limit) : '';
  const completeness = lr.truncated ? { status: 'incomplete', reason: 'enumeration_truncated' } : { status: 'complete' };
  fs.appendFileSync(decisionsFile, JSON.stringify({ t: new Date().toISOString(), decision_id, kind: 'search', request_id: meta.requestId, caller: caller.name, subject: b.subject.id, tid: sTid, type: b.resource.type, action: b.action.name, returned: page.length, truncated: !!lr.truncated, engine: ENGINE }) + '\n');
  return send(res, 200, {
    results: page.map((id) => ({ type: b.resource.type, id, properties: { tid: sTid } })),
    page: { next_token: next, count: page.length },
    context: { 'x-authz-profile': { decision_id, model_revision: { model_revision: bind.rev, guardrail_catalog_version: 'g-1' }, completeness } },
  }, echoHeaders(meta));
});

// ---- relationship writes (relationship-model-registry.openapi.yaml) -------------------------------
const writeDecl = new Map();
function loadWriteDecl() {
  writeDecl.clear();
  for (const d of registry.revisions.get(registry.current).cam.raw.write_declarations || []) writeDecl.set(d.writer, new Set(d.types));
}
loadWriteDecl();
const RESERVED_WRITERS = { ancestor: new Set(['admin', 'harness']), external_member: new Set(['admin', 'harness', 'file-service']), restricted_external: new Set(['admin', 'harness', 'file-service']) };
const idemp = new Map();

function validateTuple(cam, t, writer) {
  const ct = cam.types.get(t.resource?.type);
  if (!ct) return `unknown type ${t.resource?.type}`;
  const rel = ct.rels.get(t.relation);
  if (!rel) return `unknown relation ${t.resource.type}#${t.relation}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(t.resource.id || '')) return 'bad object id';
  const st = t.subject?.relation ? `${t.subject.type}#${t.subject.relation}` : t.subject?.type;
  if (!rel.directly_related.includes(st)) return `subject type ${st} not allowed for ${t.resource.type}#${t.relation}`;
  if (rel.conditions?.length && (!t.condition || !rel.conditions.includes(t.condition.name))) return `condition required (${rel.conditions.join(',')})`;
  if (!rel.conditions?.length && t.condition) return 'condition not allowed';
  const decl = writeDecl.get(writer);
  if (!decl || !(decl.has('*') || decl.has(t.resource.type) || decl.has(`${t.resource.type}#${t.relation}`))) return `writer ${writer} not declared for ${t.resource.type} (X-8)`;
  const reserved = RESERVED_WRITERS[t.relation];
  if (reserved && !reserved.has(writer)) return `relation ${t.relation} is reserved (X-13)`;
  return null;
}

async function relWrite(req, res, p, kind) {
  const caller = guardCaller(req, res);
  if (!caller) return;
  const b = (await readJson(req)) || {};
  const tid = p.tid;
  if (b.idempotency_key && idemp.has(`${tid}:${b.idempotency_key}`)) return send(res, 200, idemp.get(`${tid}:${b.idempotency_key}`));
  const cam = registry.revisions.get(registry.current).cam;
  const writes = kind === 'write' ? b.writes || [] : [];
  const deletes = kind === 'write' ? b.deletes || [] : b.deletes || b.tuples || [];
  if (writes.length > 100 || deletes.length > 100) return send(res, 400, { problem: 'too_many_tuples' });
  for (const t of [...writes, ...deletes]) {
    const err = validateTuple(cam, t, caller.name);
    if (err) return send(res, 403, { problem: 'write_rejected', detail: err });
    const ok = `${t.resource.type}:${t.resource.id}`;
    if (objTenant.has(ok) && objTenant.get(ok) !== tid) return send(res, 403, { problem: 'cross_tenant_object', detail: ok });
    if (!t.subject.relation && t.subject.type !== 'core/user') {
      const sk = `${t.subject.type}:${t.subject.id}`;
      if (t.subject.type === 'core/tenant' ? t.subject.id !== tid : (objTenant.has(sk) && objTenant.get(sk) !== tid)) return send(res, 403, { problem: 'cross_tenant_subject', detail: sk });
    }
    if (t.subject.relation && t.subject.type !== 'core/tenant') {
      const sk = `${t.subject.type}:${t.subject.id}`;
      if (objTenant.has(sk) && objTenant.get(sk) !== tid) return send(res, 403, { problem: 'cross_tenant_subject', detail: sk });
    }
    if (t.subject.type === 'core/tenant' && t.subject.id !== tid) return send(res, 403, { problem: 'cross_tenant_subject', detail: t.subject.id });
  }
  const r2 = await adapter.write({ writes, deletes, modelRevision: registry.current, onDuplicate: b.on_duplicate, onMissing: b.on_missing });
  if (r2.error === 'unavailable') return send(res, 503, { problem: 'engine_unavailable' }, { 'retry-after': '1' });
  if (r2.error) return send(res, 409, { problem: 'write_failed', detail: r2.detail });
  for (const t of writes) setOwner(`${t.resource.type}:${t.resource.id}`, tid);
  if (writes.some((t) => t.resource.type === 'core/tenant')) setOwner(`core/tenant:${tid}`, tid);
  writeSeq += 1;
  fs.writeFileSync(seqFile, String(writeSeq));
  if (FENCE_ON && (deletes.length || writes.some((t) => t.relation === 'restricted_external'))) advanceFence(tid, writeSeq, `relationships/${kind}`);
  const out = { consistency_token: makeCtoken(writeSeq), written_count: writes.length, deleted_count: deletes.length };
  if (b.idempotency_key) idemp.set(`${tid}:${b.idempotency_key}`, out);
  fs.appendFileSync(path.join(dataDir, 'writes.jsonl'), JSON.stringify({ t: new Date().toISOString(), caller: caller.name, tid, seq: writeSeq, writes: writes.length, deletes: deletes.length, idempotency_key: b.idempotency_key }) + '\n');
  return send(res, 200, out);
}
r.add('POST', '/v1/tenants/:tid/relationships/write', (q, s, p) => relWrite(q, s, p, 'write'));
r.add('POST', '/v1/tenants/:tid/relationships/delete', (q, s, p) => relWrite(q, s, p, 'delete'));
r.add('POST', '/v1/tenants/:tid/relationships/read', async (req, res, p) => {
  const caller = guardCaller(req, res);
  if (!caller) return;
  const b = (await readJson(req)) || {};
  const out = await adapter.read(b.filter || {});
  if (out.error) return send(res, 503, { problem: out.error });
  const tuples = out.tuples.filter((t) => objTenant.get(t.object) === p.tid);
  return send(res, 200, { tuples });
});
// fence exchange inside the cell (D-18): only a MAC-valid token that moves the fence forward is accepted
r.add('POST', '/v1/tenants/:tid/revocation-fence', async (req, res, p) => {
  const caller = guardCaller(req, res);
  if (!caller) return;
  if (!FENCE_ON) return send(res, 404, { problem: 'fence_disabled' });
  const b = (await readJson(req)) || {};
  const t = parseCtoken(b.fence);
  const logRej = (rec) => fs.appendFileSync(path.join(dataDir, 'fence.jsonl'), JSON.stringify({ t: new Date().toISOString(), tid: p.tid, caller: caller.name, ...rec }) + '\n');
  if (!t) { logRej({ rejected: 'invalid_token' }); return send(res, 400, { problem: 'invalid_fence_token' }); }
  if (!advanceFence(p.tid, t.seq, `api:${caller.name}`)) { logRej({ rejected: 'not_advanced', offered: t.seq, current: fences.get(p.tid)?.seq }); return send(res, 409, { problem: 'fence_not_advanced', current: makeCtoken(fences.get(p.tid).seq) }); }
  return send(res, 200, { fence: makeCtoken(t.seq) });
});
r.add('GET', '/v1/tenants/:tid/revocation-fence', (req, res, p) => send(res, FENCE_ON ? 200 : 404, FENCE_ON ? { fence: fences.get(p.tid) ? makeCtoken(fences.get(p.tid).seq) : null } : { problem: 'fence_disabled' }));
r.add('POST', '/v1/register-objects', async (req, res) => {
  // bulk registration of resource-derived tenants for objects that have no tuples yet (harness/admin only)
  const caller = guardCaller(req, res);
  if (!caller || !['harness', 'admin'].includes(caller.name)) return send(res, 403, 'forbidden');
  const b = (await readJson(req)) || {};
  for (const o of b.objects || []) setOwner(`${o.type}:${o.id}`, o.tid);
  return send(res, 200, { registered: (b.objects || []).length });
});

// ---- model registry ---------------------------------------------------------------------------------
// Registration gate (opt-in PDP_MODEL_GATE=1; relationship-model-registry.openapi.yaml registerModel, ADR-016 D16-31 段 2):
// conditional on base_revision (409 base_revision_conflict), invalid CAM -> 422, a change that can widen access needs
// two approvals bound to the candidate revision (403 approval_required). Report kept in pdp/model-gate.jsonl.
const MODEL_GATE = process.env.PDP_MODEL_GATE === '1';
async function gatedRegister(req, res, b, url) {
  const raw = b && (b.cam || b);
  const log = (rec) => fs.appendFileSync(path.join(dataDir, 'model-gate.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...rec }) + '\n');
  let cand;
  try { cand = compileCam(raw); } catch (e) { log({ outcome: 422, detail: e.message }); return send(res, 422, { problem: 'model_validation_failed', detail: e.message }); }
  if (registry.revisions.has(cand.revision)) { log({ outcome: 200, revision: cand.revision, note: 'already registered' }); return send(res, 200, { model_revision: cand.revision, current: registry.current, already_registered: true }); }
  if (b.base_revision !== registry.latest) { log({ outcome: 409, revision: cand.revision, base_revision: b.base_revision, latest: registry.latest }); return send(res, 409, { problem: 'base_revision_conflict', latest: registry.latest }); }
  const report = diffModels(registry.revisions.get(registry.latest).cam.raw, raw, { seed: cand.revision, universes: Number(process.env.PDP_MODEL_GATE_UNIVERSES || 300) });
  const ap = Array.isArray(b.approvals) ? b.approvals : [];
  const approved = ap.length >= 2 && new Set(ap.map((x) => x.approver_role)).size >= 2 && ap.every((x) => x && x.model_revision === cand.revision && typeof x.approval_id === 'string');
  const summary = { widening: report.widening.map((w) => `${w.type}#${w.permission}`), narrowing: report.narrowing.map((w) => `${w.type}#${w.permission}`), unproven: report.unproven, approval_reasons: report.approval_reasons, universes: report.universes };
  if (report.requires_approval && !approved) { log({ outcome: 403, revision: cand.revision, ...summary, approvals: ap.length }); return send(res, 403, { problem: 'approval_required', report: summary }); }
  try {
    const revision = await registerCam(raw, { activate: url.searchParams.get('activate') === 'true' });
    loadWriteDecl();
    log({ outcome: 201, revision, ...summary, approvals: ap.map((x) => x.approval_id) });
    return send(res, 201, { model_revision: revision, current: registry.current, review_status: 'approved', report: summary });
  } catch (e) { log({ outcome: 400, detail: e.message }); return send(res, 400, { problem: 'model_invalid', detail: e.message }); }
}
r.add('POST', '/v1/models', async (req, res, p, url) => {
  const caller = guardCaller(req, res);
  if (!caller || !['admin', 'harness'].includes(caller.name)) return send(res, 403, 'forbidden');
  const b = await readJson(req);
  if (MODEL_GATE) return gatedRegister(req, res, b, url);
  try {
    const revision = await registerCam(b.cam || b, { activate: url.searchParams.get('activate') === 'true' });
    loadWriteDecl();
    return send(res, 201, { model_revision: revision, current: registry.current });
  } catch (e) { return send(res, 400, { problem: 'model_invalid', detail: e.message }); }
});
r.add('GET', '/v1/models', (req, res) => send(res, 200, { current: registry.current, revisions: [...registry.revisions.entries()].map(([k, v]) => ({ model_revision: k, registered_at: v.registeredAt })), pins: Object.fromEntries(registry.pins) }));
r.add('PUT', '/v1/tenants/:tid/model-pin', async (req, res, p) => {
  const caller = guardCaller(req, res);
  if (!caller || !['admin', 'harness'].includes(caller.name)) return send(res, 403, 'forbidden');
  const b = (await readJson(req)) || {};
  if (!registry.revisions.has(b.model_revision)) return send(res, 404, { problem: 'unknown_revision' });
  registry.pins.set(p.tid, b.model_revision);
  return send(res, 200, { tenant_id: p.tid, model_revision: b.model_revision });
});
r.add('POST', '/v1/models/current', async (req, res) => {
  const caller = guardCaller(req, res);
  if (!caller || !['admin', 'harness'].includes(caller.name)) return send(res, 403, 'forbidden');
  const b = (await readJson(req)) || {};
  if (!registry.revisions.has(b.model_revision)) return send(res, 404, { problem: 'unknown_revision' });
  registry.current = b.model_revision;
  return send(res, 200, { current: registry.current });
});

// ---- admin --------------------------------------------------------------------------------------------
r.add('POST', '/admin/fault', async (req, res) => {
  const caller = guardCaller(req, res);
  if (!FAULT_ADMIN || !caller || !['admin', 'harness'].includes(caller.name)) return send(res, 403, 'fault admin disabled');
  const b = (await readJson(req)) || {};
  fault = { mode: b.mode || 'none', ...b };
  if (adapter instanceof CedarAdapter) adapter.fault = b.cedar || null;
  log.warn('fault mode set', fault);
  return send(res, 200, fault);
});
r.add('GET', '/admin/stats', (req, res) => send(res, 200, { engine: ENGINE, engine_version: adapter.engine_version, current: registry.current, writeSeq, objects: objTenant.size, audit: audit.counters, revocationEpoch: rev.epoch }));
r.add('GET', '/healthz', (req, res) => send(res, 200, { ok: true, engine: ENGINE }));

const server = createServer({ tls: tlsFor(topo, 'pdp', { mtls: 'required' }), handler: (q, s) => r.handle(q, s), onError: (e) => log.error('handler', { e: e.stack }) });
await listen(server, topo.ports.pdp);
ready('pdp', topo.urls.pdp);
onShutdown(async () => { audit.close(); rev.stop(); await new Promise((res) => server.close(res)); });
export { ACR_ORDER };
