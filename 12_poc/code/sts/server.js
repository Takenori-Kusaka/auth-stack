// Cell STS (RFC 8693 token exchange -> internal RFC 9068 at+jwt) and TTS (Transaction Token, txn-v1).
// Contract: 11_contracts/token-exchange.openapi.yaml (CON-05). Client authentication = X.509-SVID mTLS only.
// Decision order (ARC-04 §5.2): mTLS -> actor_token -> subject_token -> resource -> registry -> scope -> act
// depth/cycle -> revocation state. Reason codes R01–R10 / T01–T08 are written to the issuance ledger only,
// never to error_description (W55-18).
// txn-v1 issues txn, sub, scope, req_wl, tctx; it does not issue rctx / purp (ADR-009 D09-30, D09-31) and ignores
// request_context / request_details.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { createServer, listen, router, readForm, readJson, send, peerCert, request } from '../lib/http.js';
import { spiffeIdFromPeer, x5tS256 } from '../lib/pki.js';
import { tlsFor, clientTls } from '../lib/topology.js';
import { KeyStore } from '../lib/keys.js';
import { signJwt, verifyInternalToken, JwksCache, VerifyError } from '../lib/jwt.js';
import { opaqueId, jtiRef } from '../lib/ids.js';
import { AuditProducer } from '../lib/audit.js';
import { RevocationClient } from '../lib/revocation.js';
import { discover, introspect } from '../lib/oauth-client.js';

const { topo, secrets, log } = boot('sts');
const ledgerCfg = readJsonFile(topo.files.ledger);
const kCorr = Buffer.from(secrets.kCorr, 'hex');
const dir = path.join(topo.dataDir, 'sts');
fs.mkdirSync(dir, { recursive: true });
const ledgerFile = path.join(dir, 'issuance-ledger.jsonl');
const ledger = (e) => fs.appendFileSync(ledgerFile, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');

const URN_AT = 'urn:ietf:params:oauth:token-type:access_token';
const URN_TXN = 'urn:ietf:params:oauth:token-type:txn_token';
const GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const INTERNAL_START = /^https:\/\/[a-z0-9.-]+\/token-types\/internal-start-ref$/;

const atKeys = await new KeyStore({ file: path.join(topo.secretsDir, 'sts-at-keys.json'), kind: 'at', kidPrefix: 'sts-c1' }).init();
const txnKeys = await new KeyStore({ file: path.join(topo.secretsDir, 'tts-txn-keys.json'), kind: 'txn', kidPrefix: 'tts-c1' }).init();
const settings = topo.settings;
const audit = new AuditProducer({ topo, secrets, workload: 'sts', tls: clientTls(topo, 'sts') });
const rev = new RevocationClient({ url: topo.urls.state, tls: clientTls(topo, 'sts'), pollMs: settings.revocationPollMs });
await rev.start();
const jwks = new JwksCache({ tls: clientTls(topo, 'sts'), ttlMs: 1000 });
// RK-07: the verifier alg allowlist comes from the versioned crypto profile (CP) distributed by the state store
// when one has been published (ADR-005 V1, ADR-015 D15-71); otherwise from the settings (previous behaviour).
const stsAlgs = () => (Array.isArray(rev.status?.alg_policy?.at) ? rev.status.alg_policy.at : (settings.stsAlgs || ['ES256']));
// RK-06: key-age hard limit (ADR-007 D7-32), only when settings.keyMaxAgeMs is set
const signer = (ks) => { if (settings.keyMaxAgeMs) ks.rollIfAged(Number(settings.keyMaxAgeMs)); return ks; };

// workload registry: SPIFFE ID -> name; service audience -> workload
const bySpiffe = new Map(Object.values(topo.workloads).map((w) => [w.spiffeId, w]));
const audOfWorkload = new Map(Object.entries(ledgerCfg.services).map(([wl, s]) => [wl, topo.audiences[s.audience_key]]));
const workloadOfAud = new Map([...audOfWorkload.entries()].map(([w, a]) => [a, w]));
const registry = new Map(ledgerCfg.exchange_registry.map((e) => [`${e.caller}|${topo.audiences[e.callee]}`, e]));
const opsById = new Map(ledgerCfg.entry_points.map((e) => [e.op, e]));
const acceptance = new Map(); // internal-start references (ADR-026 受付記録, X74-01 proposal)

// external AS (issuer A) for the edge's first exchange (opaque subject_token)
let asMeta = null;
async function asMetadata() { if (!asMeta) asMeta = await discover(topo.urls.asA, clientTls(topo, 'sts')); return asMeta; }
const stsClient = { type: 'private_key_jwt', clientId: topo.clients.sts.clientId, privateJwkFile: topo.clients.sts.privateJwkFile };

class Reject extends Error {
  constructor(code, error, status = 400) { super(code); this.code = code; this.error = error; this.status = status; }
}
const scopeSet = (s) => new Set(String(s || '').split(' ').filter(Boolean));

function verifyCfg(audience) {
  return {
    kind: 'at', audience,
    issuers: { [topo.issuers.sts]: { jwksUrl: `${topo.urls.sts}/jwks`, jwksPeer: topo.workloads.sts.spiffeId, algs: stsAlgs(), cell: topo.cellId } },
    jwks, skewSec: settings.skewSec, acceptedMajors: [1],
    isKidRevoked: (kid) => rev.kidRevoked(kid), tenantCell: (tid) => rev.tenantCell(tid),
  };
}

function actChain(act) { const out = []; let a = act; while (a) { out.push(a.sub); a = a.act; } return out; }
function nestAct(callerSub, prevAct) {
  const a = { sub: callerSub, ptype: 'workload' };
  if (prevAct) {
    const strip = (x, depth) => (x ? { sub: x.sub, ptype: x.ptype, ...(x.iss ? { iss: x.iss } : {}), ...(x.act && depth < 2 ? { act: strip(x.act, depth + 1) } : {}) } : undefined);
    a.act = strip(prevAct, 1);
  }
  return a;
}

async function subjectFromOpaque(token) {
  const meta = await asMetadata();
  const intro = await introspect(meta, token, { auth: stsClient, tls: clientTls(topo, 'sts') });
  if (!intro || intro.active !== true) throw new Reject('R03', 'invalid_request');
  if (intro.iss !== topo.issuers.asA) throw new Reject('R03', 'invalid_request');
  const aud = [].concat(intro.aud || []);
  if (!aud.includes(topo.audiences.api)) throw new Reject('R03', 'invalid_request');
  return {
    kind: 'external', iss: intro.iss, jti: crypto.createHash('sha256').update(token).digest('hex').slice(0, 32),
    sub: intro.sub, tid: intro.tid, client_id: intro.client_id, scope: intro.scope, exp: intro.exp, iat: intro.iat,
    ptype: intro.ptype || 'human', acr: intro.acr, amr: intro.amr, auth_time: intro.auth_time, sid: intro.psid, gref: intro.gref, act: undefined,
  };
}

// ------------------------------------------------------------------------------------------------
// POST /token  (exchangeToken)
// ------------------------------------------------------------------------------------------------
async function exchange(req, res) {
  const caller = bySpiffe.get(spiffeIdFromPeer(peerCert(req)) || '');
  const t0 = Date.now();
  let f;
  const rec = { op: 'exchange', caller: caller?.name };
  try {
    if (!caller) throw new Reject('R01', 'invalid_client', 401);
    f = await readForm(req);
    if (f.actor_token !== undefined || f.actor_token_type !== undefined) throw new Reject('R02', 'invalid_request');
    if (f.grant_type !== GRANT) throw new Reject('R00', 'unsupported_grant_type');
    if (f.requested_token_type !== undefined && f.requested_token_type !== URN_AT) throw new Reject('R00', 'invalid_request');
    if (f.authorization_details !== undefined) throw new Reject('R00', 'invalid_request');
    if (f.subject_token_type !== URN_AT || typeof f.subject_token !== 'string' || !f.subject_token) throw new Reject('R03', 'invalid_request');
    if (Array.isArray(f.subject_token)) throw new Reject('R03', 'invalid_request');
    // resource (ADR-009 D09-11): exactly one absolute https URI without fragment; audience not accepted
    if (f.resource === undefined) throw new Reject('R04', 'invalid_request');
    if (Array.isArray(f.resource) || f.audience !== undefined) throw new Reject('R05', 'invalid_target');
    let ru;
    try { ru = new URL(f.resource); } catch { throw new Reject('R04', 'invalid_request'); }
    if (ru.protocol !== 'https:' || ru.hash || f.resource.includes('#')) throw new Reject('R04', 'invalid_request');
    // subject_token
    const callerX5t = x5tS256(fs.readFileSync(caller.cert, 'utf8'));
    let subj;
    const isJwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(f.subject_token);
    const firstHop = caller.name === 'edge' || caller.name === 'harness';
    if (!isJwt) {
      if (!firstHop) throw new Reject('R03', 'invalid_request'); // opaque external tokens only at the edge (D1-4)
      subj = await subjectFromOpaque(f.subject_token);
    } else {
      const callerAud = audOfWorkload.get(caller.name);
      if (!callerAud) throw new Reject('R03', 'invalid_request');
      try {
        const v = await verifyInternalToken(f.subject_token, verifyCfg(callerAud), { skipCnf: true }); // aud = requester is the binding check here (W55-15)
        subj = { kind: 'internal', ...v.payload };
      } catch (e) {
        rec.verify = e.code;
        throw new Reject('R03', 'invalid_request');
      }
    }
    rec.input_iss = subj.iss;
    // registry
    const reg = registry.get(`${caller.name}|${f.resource}`);
    if (!reg) throw new Reject('R06', 'invalid_target');
    // scope ⊆ subject.scope ∩ cap
    const have = scopeSet(subj.scope);
    if (!have.size) throw new Reject('R07', 'invalid_scope');
    const cap = scopeSet(reg.max_scope);
    const allowed = [...have].filter((s) => cap.has(s));
    const want = f.scope ? [...scopeSet(f.scope)] : allowed;
    if (!want.length || want.some((s) => !allowed.includes(s))) throw new Reject('R07', 'invalid_scope');
    // act (first hop: edge is a PEP on the path, not an actor -> no act)
    let act;
    if (!firstHop) {
      const chain = actChain(subj.act);
      if (chain.includes(caller.sub)) throw new Reject('R09', 'invalid_request');
      if (chain.length + 1 > settings.nAct) throw new Reject('R08', 'invalid_request');
      act = nestAct(caller.sub, subj.act);
    }
    // revocation / status (R10)
    if (rev.stale(settings.mRevMs)) throw new Reject('R10', 'invalid_request');
    if (rev.revoked({ sub: subj.sub, sid: subj.sid, gref: subj.gref, client_id: subj.client_id, tid: subj.tid }, subj.iat)
      || rev.subjectSuspended(subj.sub) || rev.tenantSuspended(subj.tid)) throw new Reject('R10', 'invalid_request');
    // issue
    const now = Math.floor(Date.now() / 1000);
    const svidExp = Math.floor(new Date(new crypto.X509Certificate(fs.readFileSync(caller.cert)).validTo).getTime() / 1000);
    const exp = Math.min(subj.exp, now + settings.internalTokenTtlSec, svidExp);
    if (exp <= now) throw new Reject('R03', 'invalid_request');
    const jti = opaqueId();
    const claims = {
      iss: topo.issuers.sts, sub: subj.sub, aud: f.resource, exp, iat: now, jti, client_id: subj.client_id,
      scope: want.join(' '), tid: subj.tid, ptype: subj.ptype || 'human',
      cnf: { 'x5t#S256': callerX5t }, ver: '1.0',
    };
    if (claims.ptype === 'human') Object.assign(claims, { acr: subj.acr, amr: subj.amr, auth_time: subj.auth_time, sid: subj.sid, gref: subj.gref });
    else if (subj.gref) claims.gref = subj.gref;
    if (act) claims.act = act;
    const token = await signJwt(signer(atKeys), 'at+jwt', claims);
    const kid = atKeys.active().kid;
    const outRef = jtiRef(kCorr, topo.issuers.sts, jti);
    const inRef = jtiRef(kCorr, subj.iss, subj.jti);
    request(`${topo.urls.state}/ledger`, { body: { jti_ref: outRef, iss: topo.issuers.sts, kind: 'at', exp }, tls: clientTls(topo, 'sts') }).catch(() => {});
    ledger({ ...rec, result: 'issued', kid, jti_ref: outRef, input_jti_ref: inRef, aud: f.resource, tid: subj.tid, scope: claims.scope, act_depth: actChain(act).length, ms: Date.now() - t0 });
    audit.emit({
      family: 'issuance', event_type: 'token.exchange', tid: subj.tid, tier: 'read-sensitive', outcome: 'success', reason_code: 'issued',
      subject: claims.ptype === 'human' ? { type: 'human', subj_ref: audit.subjRef(subj.sub), client_id: subj.client_id } : { type: claims.ptype, nhi_id: subj.sub },
      corr: { iss: topo.issuers.sts, jti_ref: outRef, sid: claims.sid, grant_ref: claims.gref },
      detail: {
        ledger: 'sts', token_type: 'access_token_internal', kid, aud: [f.resource], exp: new Date(exp * 1000).toISOString(),
        input_token: { iss: subj.iss, jti_ref: inRef }, caller: caller.spiffeId, callee: f.resource,
        scope: want, act_depth: actChain(act).length,
      },
    }).catch(() => {});
    return send(res, 200, { access_token: token, issued_token_type: URN_AT, token_type: 'Bearer', expires_in: exp - now, scope: claims.scope }, { 'cache-control': 'no-store', pragma: 'no-cache' });
  } catch (e) {
    if (!(e instanceof Reject)) { log.error('exchange', { e: e.stack }); e = new Reject('R00', 'invalid_request', 503); }
    ledger({ ...rec, result: 'rejected', reason: e.code, ms: Date.now() - t0 });
    return send(res, e.status, { error: e.error }, { 'cache-control': 'no-store' });
  }
}

// ------------------------------------------------------------------------------------------------
// POST /txn-token  (requestTxnToken)
// ------------------------------------------------------------------------------------------------
async function txnToken(req, res) {
  const caller = bySpiffe.get(spiffeIdFromPeer(peerCert(req)) || '');
  const rec = { op: 'txn', caller: caller?.name };
  try {
    if (!caller) throw new Reject('T01', 'invalid_client', 401);
    const f = await readForm(req);
    if (f.actor_token !== undefined || f.actor_token_type !== undefined) throw new Reject('T02', 'invalid_request');
    if (f.grant_type !== GRANT) throw new Reject('T00', 'unsupported_grant_type');
    if (f.requested_token_type !== URN_TXN) throw new Reject('T00', 'invalid_request');
    if (f.audience !== topo.txnAudience) throw new Reject('T05', 'invalid_target');
    const op = opsById.get(f.scope);
    let base;
    if (f.subject_token_type === URN_AT) {
      if (!ledgerCfg.txn_issuance.sync_requesters.includes(caller.name)) throw new Reject('T04', 'invalid_request');
      let v;
      try {
        // the subject token is addressed to the first callee, not to the requester (W55-17): accept any service audience
        const cfgs = [...audOfWorkload.values()].map((a) => verifyCfg(a));
        let last;
        for (const c of cfgs) { try { v = await verifyInternalToken(f.subject_token, c, { peerX5t: x5tS256(fs.readFileSync(caller.cert, 'utf8')) }); break; } catch (e) { last = e; } }
        if (!v) throw last;
      } catch (e) {
        rec.verify = e.code;
        if (e instanceof VerifyError && e.code === 'cnf') throw new Reject('T04', 'invalid_request');
        throw new Reject('T03', 'invalid_request');
      }
      const p = v.payload;
      base = { sub: p.sub, tid: p.tid, root_jti: p.jti, gref: p.gref, sid: p.sid, scope: p.scope, iat: p.iat, exp: p.exp, client_id: p.client_id };
    } else if (INTERNAL_START.test(f.subject_token_type || '')) {
      if (!ledgerCfg.txn_issuance.internal_start_requesters.includes(caller.name)) throw new Reject('T07', 'invalid_request');
      const a = acceptance.get(f.subject_token);
      if (!a || a.workload !== caller.name || a.used) throw new Reject('T07', 'invalid_request');
      base = { ...a, iat: Math.floor(a.acceptedAt / 1000), exp: Math.floor(Date.now() / 1000) + settings.txnTokenTtlSec };
    } else {
      throw new Reject('T03', 'invalid_request'); // unsigned_json, self_signed, txn_token replacement, unknown
    }
    // scope: an operation id from the entry-point ledger whose OAuth scope the subject holds
    if (!op || (op.scope && !scopeSet(base.scope).has(op.scope))) throw new Reject('T06', 'invalid_scope');
    if (rev.stale(settings.mRevMs)) throw new Reject('T08', 'invalid_request');
    if (rev.revoked({ sub: base.sub, sid: base.sid, gref: base.gref, client_id: base.client_id, tid: base.tid }, base.iat)
      || rev.subjectSuspended(base.sub) || rev.tenantSuspended(base.tid)) throw new Reject('T08', 'invalid_request');
    const now = Math.floor(Date.now() / 1000);
    const exp = Math.min(base.exp, now + settings.txnTokenTtlSec);
    // TC-016 (6) / H09-08: settings.txnIdFormat = 'inhouse' switches the txn adapter to an in-house transaction-ID
    // format (ADR-009 D09-26 / ADR-022 D-8-5 fallback, same `txn` field). Default: opaque base32 (unchanged).
    const txn = settings.txnIdFormat === 'inhouse' ? crypto.randomUUID() : opaqueId(); // in-house = UUIDv4 (the 2nd issued-ID form of access-token-claims.schema.json opaqueId)
    const tctx = { tid: base.tid, root_jti: base.root_jti, tier: op.tier === 'privileged' ? `privileged/${op.tier_sub || 'T'}` : op.tier, ver: '1.0' };
    if (base.gref) tctx.gref = base.gref;
    if (base.sid) tctx.sid = base.sid;
    if (base.ptxn) tctx.ptxn = base.ptxn;
    if (tctx.tier === 'public') throw new Reject('T06', 'invalid_scope');
    const claims = { iss: topo.issuers.tts, aud: topo.txnAudience, iat: now, exp, txn, sub: base.sub, scope: op.op, req_wl: caller.spiffeId, tctx };
    const token = await signJwt(signer(txnKeys), 'txntoken+jwt', claims);
    const kid = txnKeys.active().kid;
    const rootRef = jtiRef(kCorr, topo.issuers.sts, base.root_jti);
    ledger({ ...rec, result: 'issued', kid, txn, root_jti_ref: rootRef, tid: base.tid, scope: op.op, tier: tctx.tier });
    audit.emit({
      family: 'issuance', event_type: 'token.txn_issue', tid: base.tid, tier: op.tier === 'privileged' ? 'privileged' : op.tier, ...(op.tier === 'privileged' ? { tier_sub: op.tier_sub || 'T' } : {}),
      outcome: 'success', reason_code: 'issued',
      subject: { type: 'human', subj_ref: audit.subjRef(base.sub) },
      corr: { iss: topo.issuers.tts, txn, jti_ref: rootRef, sid: base.sid, grant_ref: base.gref },
      detail: {
        ledger: 'tts', token_type: 'txn_token', kid, aud: [topo.txnAudience], exp: new Date(exp * 1000).toISOString(),
        txn_token_hash: 'sha-256:' + crypto.createHash('sha256').update(token).digest('base64url'),
        req_wl: caller.spiffeId, root_jti_ref: rootRef, origin_tier: op.tier,
      },
    }).catch(() => {});
    return send(res, 200, { access_token: token, issued_token_type: URN_TXN, token_type: 'N_A', expires_in: exp - now }, { 'cache-control': 'no-store', pragma: 'no-cache' });
  } catch (e) {
    if (!(e instanceof Reject)) { log.error('txn', { e: e.stack }); e = new Reject('T00', 'invalid_request', 503); }
    ledger({ ...rec, result: 'rejected', reason: e.code });
    return send(res, e.status, { error: e.error }, { 'cache-control': 'no-store' });
  }
}

// ------------------------------------------------------------------------------------------------
const r = router();
r.add('POST', '/token', exchange);
r.add('POST', '/txn-token', txnToken);
r.add('GET', '/jwks', (q, s) => send(s, 200, atKeys.jwks(), { 'cache-control': 'max-age=60' }));
r.add('GET', '/tts/jwks', (q, s) => send(s, 200, txnKeys.jwks(), { 'cache-control': 'max-age=60' }));
r.add('GET', '/healthz', (q, s) => send(s, 200, { ok: true }));
// internal-start acceptance records (ADR-026 D26-03; proposal X74-01). Registered by the job producer's PEP.
r.add('POST', '/acceptance', async (req, res) => {
  const caller = bySpiffe.get(spiffeIdFromPeer(peerCert(req)) || '');
  if (!caller || !['tool-service', 'harness'].includes(caller.name)) return send(res, 403, 'forbidden');
  const b = (await readJson(req)) || {};
  const ref = `acc_${opaqueId()}`;
  acceptance.set(ref, { workload: b.workload || caller.name, sub: b.sub, tid: b.tid, gref: b.gref, sid: b.sid, scope: b.scope, root_jti: b.root_jti, ptxn: b.ptxn, client_id: b.client_id, acceptedAt: Date.now() });
  return send(res, 201, { ref });
});
// key administration (TC-014 / TC-015): admin & harness only
const ADMINS = new Set(['admin', 'harness']);
const keyStore = (k) => (k === 'txn' ? txnKeys : atKeys);
r.add('POST', '/admin/keys/:store/:op', async (req, res, p) => {
  const caller = bySpiffe.get(spiffeIdFromPeer(peerCert(req)) || '');
  if (!caller || !ADMINS.has(caller.name)) return send(res, 403, 'forbidden');
  const b = (await readJson(req)) || {};
  const ks = keyStore(p.store);
  try {
    let k;
    if (p.op === 'prepublish') k = await ks.prepublish(b.alg, { retain: !!b.retain });
    else if (p.op === 'activate') k = ks.activate(b.kid);
    else if (p.op === 'remove') k = ks.remove(b.kid, { checkInUse: !!(settings.keyRemovalInUseCheck || b.check_in_use) }); // RK-04
    else if (p.op === 'emergency-revoke') {
      k = await ks.emergencyRevoke(b.kid);
      await request(`${topo.urls.state}/revocations`, { body: { scope: 'kid', value: b.kid, reason: 'key_compromise' }, tls: clientTls(topo, 'sts') });
    } else if (p.op === 'retain') { k = ks.find(b.kid); if (k) { k.retain = !!b.retain; ks.persist(); } }
    else return send(res, 404, 'unknown op');
    return send(res, 200, { kid: k.kid, alg: k.alg, state: k.state, retain: k.retain, jwks: ks.jwks().keys.map((x) => x.kid) });
  } catch (e) {
    return send(res, e.status || 400, { error: e.code || 'failed', detail: e.message });
  }
});
r.add('GET', '/admin/keys/:store', (req, res, p) => send(res, 200, { keys: keyStore(p.store).keys.map(({ privateKey, privateJwk, ...k }) => k), events: keyStore(p.store).events }));
r.add('POST', '/admin/settings', async (req, res) => {
  const caller = bySpiffe.get(spiffeIdFromPeer(peerCert(req)) || '');
  if (!caller || !ADMINS.has(caller.name)) return send(res, 403, 'forbidden');
  Object.assign(settings, (await readJson(req)) || {});
  return send(res, 200, settings);
});

const server = createServer({ tls: tlsFor(topo, 'sts', { mtls: 'required' }), handler: (q, s) => r.handle(q, s), onError: (e) => log.error('handler', { e: e.stack }) });
await listen(server, topo.ports.sts);
ready('sts', topo.urls.sts);
onShutdown(async () => { audit.close(); rev.stop(); await new Promise((res) => server.close(res)); });
