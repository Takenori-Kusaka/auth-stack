// OAuth 2.x / OIDC AS (node-oidc-provider 9.12.2) — NA-POC-2: control implementation used to exercise the
// protocol-level negative vectors (aud, iss, PKCE, DPoP, PAR …) at the PEP/SDK side; not an AS product evaluation.
// Two instances are started per run: `--name as-a` (issuer A, prod 役) and `--name as-b` (issuer B, sandbox /
// attacker 役, separate keys) for issuer mix-up tests (TC-005) and trust separation (TC-025).
// Profile (ADR-005 / token-profile.md):
//  - external access tokens are opaque; resource indicators (RFC 8707) with a single API resource;
//    introspection (RFC 7662) for the edge and the STS only, with the profile claims (tid, ptype, acr, amr,
//    auth_time, gref, ver, psid) added through extraTokenClaims.
//  - PKCE S256 required for every client; PAR required for the BFF; authorization code TTL 60 s.
//  - client authentication: private_key_jwt or none (public + DPoP). No shared secrets (ADR-009 D09-18).
//  - sender constraint: BFF = mTLS certificate-bound (RFC 8705), public CLI = DPoP with mandatory nonce (D5).
//  - refresh tokens: confidential = no rotation; public = rotation (ADR-005 D4).
//  - RFC 9207 `iss` in authorization responses (provider default).
// Login is a synthetic form (POST /interaction/:uid/login {sub, tid, amr}) driven by the harness acting as the user agent.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import Provider from 'oidc-provider';
import { generateKeyPair, exportJWK } from 'jose';
import { boot, ready, onShutdown, readJsonFile } from '../lib/runtime.js';
import { readForm, send, request } from '../lib/http.js';
import { mapOpaque } from '../lib/ids.js';
import { clientTls } from '../lib/topology.js';

const { topo, secrets, name, log } = boot('as-a');
const isA = name === 'as-a';
const issuer = isA ? topo.issuers.asA : topo.issuers.asB;
const port = isA ? topo.ports.asA : topo.ports.asB;
const kMap = Buffer.from(secrets.kMap, 'hex');
const dataset = readJsonFile(topo.files.dataset, { users: [], tenants: [] });
const users = new Map(dataset.users.map((u) => [u.id, { ...u }]));
const grantTid = new Map(); // grantId -> tid (作用中テナント chosen at login)
const accountGrants = new Map(); // sub -> Set(grantId) (CH-ESPA-05: INV-6 bulk revocation on leave / suspension)
const auditDir = path.join(topo.dataDir, name);
fs.mkdirSync(auditDir, { recursive: true });
const eventsFile = path.join(auditDir, 'as-events.jsonl');
const ev = (e) => fs.appendFileSync(eventsFile, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');

// signing keys for ID tokens (ES256), generated per run
const jwksFile = path.join(topo.secretsDir, `${name}-jwks.json`);
let jwks = readJsonFile(jwksFile, null);
if (!jwks) {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  jwks = { keys: [{ ...(await exportJWK(privateKey)), kid: `${name}-${crypto.randomBytes(4).toString('hex')}`, alg: 'ES256', use: 'sig' }] };
  fs.writeFileSync(jwksFile, JSON.stringify(jwks), { mode: 0o600 });
}

const API = topo.audiences.api;
const API_SCOPES = 'files.read files.write files.share tools.use tools.config';
const c = topo.clients;
const clients = [
  {
    client_id: c.bff.clientId, token_endpoint_auth_method: 'private_key_jwt', token_endpoint_auth_signing_alg: 'ES256',
    jwks: { keys: [c.bff.publicJwk] }, redirect_uris: [c.bff.redirectUri], grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'], require_pushed_authorization_requests: true, tls_client_certificate_bound_access_tokens: true,
    scope: `openid offline_access ${API_SCOPES}`,
  },
  {
    client_id: c.cli.clientId, token_endpoint_auth_method: 'none', redirect_uris: [c.cli.redirectUri],
    grant_types: ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code'], response_types: ['code'],
    dpop_bound_access_tokens: true, scope: `openid offline_access ${API_SCOPES}`,
  },
  { client_id: c.edge.clientId, token_endpoint_auth_method: 'private_key_jwt', token_endpoint_auth_signing_alg: 'ES256', jwks: { keys: [c.edge.publicJwk] }, grant_types: [], response_types: [], redirect_uris: [] },
  { client_id: c.sts.clientId, token_endpoint_auth_method: 'private_key_jwt', token_endpoint_auth_signing_alg: 'ES256', jwks: { keys: [c.sts.publicJwk] }, grant_types: [], response_types: [], redirect_uris: [] },
  {
    client_id: c.attacker.clientId, token_endpoint_auth_method: 'private_key_jwt', token_endpoint_auth_signing_alg: 'ES256',
    jwks: { keys: [c.attacker.publicJwk] }, redirect_uris: [c.attacker.redirectUri], grant_types: ['authorization_code'],
    response_types: ['code'], scope: `openid ${API_SCOPES}`,
  },
];
for (const cl of clients) cl.id_token_signed_response_alg = 'ES256';
const introspectors = new Set([c.edge.clientId, c.sts.clientId]);

const ACR_BY_AMR = (amr) => {
  const s = new Set(amr);
  if (s.has('hwk') && s.has('pin')) return 'L3';
  if (s.has('fido') || s.has('hwk')) return 'L2-PR';
  if (s.size >= 2 || s.has('mfa')) return 'L2';
  return 'L1';
};

// Unbounded in-memory adapter (expiry by TTL only). The library's development adapter is an LRU of 1,000
// entries: every introspection with private_key_jwt adds a replay-detection entry, so after ~1,000 edge requests
// the access tokens of idle sessions were evicted and introspected as inactive (CHANGES-revocation-consistency RC-CH-01).
const mapStores = new Map();
class MapAdapter {
  constructor(name) { this.name = name; if (!mapStores.has(name)) mapStores.set(name, new Map()); this.m = mapStores.get(name); }
  static gc() { const now = Date.now(); for (const m of mapStores.values()) for (const [k, v] of m) if (v.exp && v.exp < now) m.delete(k); }
  async upsert(id, payload, expiresIn) {
    this.m.set(id, { payload, exp: expiresIn ? Date.now() + expiresIn * 1000 : 0 });
    if (payload.grantId) { const g = mapStores.get('__grant') || new Map(); mapStores.set('__grant', g); (g.get(payload.grantId)?.v || g.set(payload.grantId, { v: [] }).get(payload.grantId).v).push([this.name, id]); }
    if (payload.uid) this.m.set(`uid:${payload.uid}`, { payload: id, exp: expiresIn ? Date.now() + expiresIn * 1000 : 0 });
    if (payload.userCode) this.m.set(`userCode:${payload.userCode}`, { payload: id, exp: expiresIn ? Date.now() + expiresIn * 1000 : 0 });
  }
  get(k) { const e = this.m.get(k); if (!e) return undefined; if (e.exp && e.exp < Date.now()) { this.m.delete(k); return undefined; } return e.payload; }
  async find(id) { return this.get(id); }
  async findByUid(uid) { const id = this.get(`uid:${uid}`); return id ? this.get(id) : undefined; }
  async findByUserCode(c) { const id = this.get(`userCode:${c}`); return id ? this.get(id) : undefined; }
  async consume(id) { const p = this.get(id); if (p) p.consumed = Math.floor(Date.now() / 1000); }
  async destroy(id) { this.m.delete(id); }
  async revokeByGrantId(grantId) { const g = mapStores.get('__grant'); for (const [name, id] of g?.get(grantId)?.v || []) mapStores.get(name)?.delete(id); g?.delete(grantId); }
}
setInterval(() => MapAdapter.gc(), 30_000).unref();

const provider = new Provider(issuer, {
  adapter: MapAdapter,
  clients,
  scopes: ['openid', 'offline_access', ...API_SCOPES.split(' ')],
  jwks,
  findAccount: async (ctx, sub) => {
    const u = users.get(sub);
    if (!u) return undefined;
    return { accountId: sub, claims: async () => ({ sub }) };
  },
  interactions: { url: (ctx, interaction) => `/interaction/${interaction.uid}` },
  features: {
    devInteractions: { enabled: false },
    introspection: { enabled: true, allowedPolicy: async (ctx, client, token) => introspectors.has(client.clientId) || client.clientId === token.clientId },
    revocation: { enabled: true },
    pushedAuthorizationRequests: { enabled: true, requirePushedAuthorizationRequests: false },
    dPoP: { enabled: true, nonceSecret: crypto.randomBytes(32), requireNonce: () => true },
    mTLS: {
      enabled: true,
      certificateBoundAccessTokens: true,
      getCertificate: (ctx) => {
        const pc = ctx.socket.getPeerCertificate && ctx.socket.getPeerCertificate();
        if (!pc || !pc.raw) return undefined;
        return `-----BEGIN CERTIFICATE-----\n${pc.raw.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
      },
      certificateAuthorized: (ctx) => !!ctx.socket.authorized,
      certificateSubjectMatches: () => false,
    },
    resourceIndicators: {
      enabled: true,
      defaultResource: () => API,
      useGrantedResource: () => true,
      getResourceServerInfo: async (ctx, resource) => {
        if (resource !== API) throw new Provider.errors.InvalidTarget();
        return { scope: API_SCOPES, audience: API, accessTokenFormat: 'opaque', accessTokenTTL: topo.settings.accessTokenTtlSec };
      },
    },
    deviceFlow: { enabled: true },
    rpInitiatedLogout: { enabled: true },
  },
  pkce: { required: () => true },
  clientAuthMethods: ['private_key_jwt', 'none'],
  enabledJWA: {
    clientAuthSigningAlgValues: ['ES256'],
    dPoPSigningAlgValues: ['ES256'],
    idTokenSigningAlgValues: ['ES256'],
    requestObjectSigningAlgValues: ['ES256'],
  },
  ttl: {
    AccessToken: () => topo.settings.accessTokenTtlSec,
    AuthorizationCode: 60,
    RefreshToken: 3600,
    Interaction: 600,
    Session: 3600,
    Grant: 3600,
    IdToken: 300,
    DeviceCode: 600,
  },
  issueRefreshToken: async (ctx, client) => client.grantTypeAllowed('refresh_token'),
  rotateRefreshToken: (ctx) => ctx.oidc.client.clientAuthMethod === 'none',
  extraTokenClaims: async (ctx, token) => {
    if (token.kind !== 'AccessToken') return undefined;
    const src = ctx.oidc.entities.AuthorizationCode || ctx.oidc.entities.RefreshToken || ctx.oidc.entities.DeviceCode;
    const tid = grantTid.get(token.grantId);
    return {
      tid, ptype: 'human',
      acr: src?.acr, amr: src?.amr, auth_time: src?.authTime,
      gref: token.grantId ? mapOpaque(kMap, `grant:${issuer}:${token.grantId}`) : undefined,
      psid: (token.sid || token.sessionUid) ? mapOpaque(kMap, `sid:${issuer}:${token.sid || token.sessionUid}`) : undefined, // session id (sessionUid when no OIDC sid is minted)
      ver: '1.0',
    };
  },
  conformIdTokenClaims: true,
  cookies: { keys: [crypto.randomBytes(32).toString('base64url')] },
  renderError: async (ctx, out) => { ctx.type = 'application/json'; ctx.body = out; },
});
provider.proxy = false;
provider.on('server_error', (ctx, err) => log.error('server_error', { e: err.stack }));
provider.on('grant.success', (ctx) => ev({ ev: 'grant.success', client: ctx.oidc.client?.clientId }));
provider.on('grant.error', (ctx, err) => ev({ ev: 'grant.error', client: ctx.oidc.client?.clientId, error: err.error, desc: err.error_description }));
provider.on('authorization.error', (ctx, err) => ev({ ev: 'authorization.error', error: err.error, desc: err.error_description }));
provider.on('introspection.error', (ctx, err) => ev({ ev: 'introspection.error', error: err.error }));

// ---- interactions (synthetic login; the harness is the user agent) ------------------------------
async function interactionRoutes(req, res) {
  const url = new URL(req.url, issuer);
  const m = /^\/interaction\/([^/]+)(\/(login|abort))?$/.exec(url.pathname);
  if (!m) return false;
  try {
    const details = await provider.interactionDetails(req, res);
    if (req.method === 'GET' && !m[3]) {
      send(res, 200, { uid: details.uid, prompt: details.prompt.name, reasons: details.prompt.reasons, details: details.prompt.details, params: details.params, grantId: details.grantId });
      return true;
    }
    if (req.method === 'POST' && m[3] === 'abort') {
      await provider.interactionFinished(req, res, { error: 'access_denied', error_description: 'user aborted' }, { mergeWithLastSubmission: false });
      return true;
    }
    if (req.method === 'POST' && m[3] === 'login') {
      const f = await readForm(req);
      const u = users.get(f.sub);
      const amr = String(f.amr || 'pwd').split(',').filter(Boolean);
      const fail = async (desc) => { ev({ ev: 'login.failure', desc }); await provider.interactionFinished(req, res, { error: 'access_denied', error_description: desc }, { mergeWithLastSubmission: false }); };
      if (!u) return (await fail('unknown subject'), true);
      if (u.status !== 'active') return (await fail('subject not active'), true);
      const mem = (u.memberships || []).find((x) => x.tid === f.tid && (x.status || 'active') === 'active');
      if (!mem) return (await fail('no active membership in tenant'), true);
      const params = details.params;
      const grant = new provider.Grant({ accountId: u.id, clientId: params.client_id });
      const scopes = String(params.scope || '').split(' ').filter(Boolean);
      const oidcScopes = scopes.filter((s) => ['openid', 'offline_access'].includes(s));
      const apiScopes = scopes.filter((s) => !['openid', 'offline_access'].includes(s));
      grant.addOIDCScope(scopes.join(' ')); // API scopes are registered provider scopes too (client metadata validation), so they are granted on both sides
      grant.addResourceScope(params.resource || API, apiScopes.join(' '));
      const grantId = await grant.save();
      grantTid.set(grantId, f.tid);
      if (!accountGrants.has(u.id)) accountGrants.set(u.id, new Set());
      accountGrants.get(u.id).add(grantId);
      ev({ ev: 'login.success', sub_hash: crypto.createHash('sha256').update(u.id).digest('hex').slice(0, 12), amr, client: params.client_id });
      await provider.interactionFinished(req, res, {
        login: { accountId: u.id, acr: ACR_BY_AMR(amr), amr, ts: Math.floor(Date.now() / 1000) },
        consent: { grantId },
      }, { mergeWithLastSubmission: false });
      return true;
    }
  } catch (e) {
    send(res, 400, { error: 'interaction_error', detail: e.message });
    return true;
  }
  return false;
}

// ---- admin (harness / admin workloads over mTLS) ----------------------------------------------------
const stateTls = clientTls(topo, name);
async function adminRoutes(req, res) {
  const url = new URL(req.url, issuer);
  if (!url.pathname.startsWith('/admin/')) return false;
  const pc = req.socket.getPeerCertificate && req.socket.getPeerCertificate();
  const okCaller = req.socket.authorized && pc && /URI:spiffe:\/\/[^/]+\/w\/(admin|harness)\b/.test(pc.subjectaltname || '');
  if (!okCaller) { send(res, 403, 'forbidden'); return true; }
  const body = await new Promise((r) => { let d = ''; req.on('data', (x) => (d += x)); req.on('end', () => r(d ? JSON.parse(d) : {})); });
  if (url.pathname === '/admin/user-status') {
    const u = users.get(body.sub) || { id: body.sub, memberships: [] };
    if (body.status) u.status = body.status;
    if (body.memberships) u.memberships = body.memberships;
    users.set(body.sub, u);
    ev({ ev: 'admin.user', status: u.status });
    send(res, 200, { ok: true });
    return true;
  }
  if (url.pathname === '/admin/revoke-grant') {
    const grant = await provider.Grant.find(body.grantId);
    if (grant) await grant.destroy();
    await provider.AccessToken.revokeByGrantId(body.grantId);
    await provider.RefreshToken.revokeByGrantId(body.grantId);
    const gref = mapOpaque(kMap, `grant:${issuer}:${body.grantId}`);
    await request(`${topo.urls.state}/revocations`, { body: { scope: 'gref', value: gref, reason: 'grant_revoked' }, tls: stateTls });
    send(res, 200, { ok: true, gref });
    return true;
  }
  if (url.pathname === '/admin/revoke-account-grants') {
    // CH-ESPA-05 (TC-018 / identity-lifecycle INV-6, MT-6): revoke every grant of an account (optionally only the
    // grants whose active tenant is body.tid): grant, access and refresh tokens, and the gref in the revocation state.
    const out = [];
    for (const gid of [...(accountGrants.get(body.sub) || [])]) {
      if (body.tid && grantTid.get(gid) !== body.tid) continue;
      const grant = await provider.Grant.find(gid);
      if (grant) await grant.destroy();
      await provider.AccessToken.revokeByGrantId(gid);
      await provider.RefreshToken.revokeByGrantId(gid);
      const gref = mapOpaque(kMap, `grant:${issuer}:${gid}`);
      await request(`${topo.urls.state}/revocations`, { body: { scope: 'gref', value: gref, reason: body.reason || 'account_lifecycle' }, tls: stateTls });
      accountGrants.get(body.sub).delete(gid);
      out.push(gref);
    }
    ev({ ev: 'admin.revoke_account_grants', n: out.length, scoped: !!body.tid });
    send(res, 200, { ok: true, revoked: out.length });
    return true;
  }
  if (url.pathname === '/admin/grant-of-token') {
    // test helper: map an opaque access token to its grant id
    const t = await provider.AccessToken.find(body.token);
    send(res, 200, t ? { grantId: t.grantId, gref: mapOpaque(kMap, `grant:${issuer}:${t.grantId}`) } : { grantId: null });
    return true;
  }
  send(res, 404, 'not found');
  return true;
}

const callback = provider.callback();
const server = https.createServer({
  key: fs.readFileSync(topo.workloads[name].key),
  cert: fs.readFileSync(topo.workloads[name].cert),
  ca: [fs.readFileSync(topo.pki.ca)],
  requestCert: true,
  rejectUnauthorized: false, // client certificates are optional (BFF presents one for certificate-bound tokens)
  minVersion: 'TLSv1.2',
}, async (req, res) => {
  try {
    if (req.url === '/healthz') return send(res, 200, { ok: true });
    if (await adminRoutes(req, res)) return;
    if (await interactionRoutes(req, res)) return;
    return callback(req, res);
  } catch (e) {
    log.error('as handler', { e: e.stack });
    if (!res.headersSent) send(res, 500, 'internal error');
  }
});
await new Promise((ok, ko) => { server.once('error', ko); server.listen(port, '127.0.0.1', ok); });
ready(name, `https://127.0.0.1:${port}`);
onShutdown(() => new Promise((r) => server.close(r)));
