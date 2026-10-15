// TC-019 reference implementation: upstream OIDC IdP mocks (2), a federation broker with linking rules
// (identity-lifecycle §8〜§9, §14, ADR-004) and a SCIM service provider (CON-07 / mock-contract-test-kit MK-06 rules,
// identity-lifecycle §15). Linking is by the triple (tenant, IdP issuer, upstream sub) only; email / username are never
// linking keys (INV-2). Adding an IdP, changing linking rules and re-linking an account to another IdP are protected
// operations (fresh admin re-authentication + notification + audit). Platform effects go to the AS (account,
// memberships, grant revocation), the revocation state and the CAM membership tuple.
import http from 'node:http';
import crypto from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { syntheticId } from '../../../lib/ids.js';

export class IdpMock {
  constructor({ name, port }) { this.name = name; this.port = port; this.issuer = `http://127.0.0.1:${port}`; this.up = false; }
  async start() {
    const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
    this.key = privateKey; this.jwk = { ...(await exportJWK(publicKey)), kid: `${this.name}-k1`, alg: 'ES256', use: 'sig' };
    this.srv = http.createServer((req, res) => { if (!this.up) { res.writeHead(503); return res.end(); } res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ keys: [this.jwk] })); });
    await new Promise((ok) => this.srv.listen(this.port, '127.0.0.1', ok));
    this.up = true;
    return this;
  }
  /** an ID token as the upstream IdP would issue it (claims under the IdP's control, incl. mutable email/username) */
  async idToken({ sub, aud, nonce, email, preferred_username }) {
    if (!this.up) throw Object.assign(new Error('idp unavailable'), { code: 'IDP_DOWN' });
    return new SignJWT({ nonce, email, preferred_username, email_verified: true }).setProtectedHeader({ alg: 'ES256', kid: this.jwk.kid, typ: 'JWT' }).setIssuer(this.issuer).setSubject(sub).setAudience(aud).setIssuedAt().setExpirationTime('5m').sign(this.key);
  }
  async stop() { await new Promise((ok) => this.srv.close(ok)); }
}

export class Broker {
  constructor({ s, clientId = 'broker-rp', maxAgeMs = 5000 }) {
    this.s = s; this.clientId = clientId; this.maxAgeMs = maxAgeMs;
    this.tenantIdps = new Map(); // tid -> Map(issuer -> { jwks, rules: { jit: true } })
    this.links = new Map(); // `${tid}|${iss}|${sub}` -> platform sub
    this.accountLink = new Map(); // platform sub -> { tid, iss, sub }
    this.audit = []; this.notifications = [];
    this.altLoginForTenant = new Map(); // tid -> IL-D4 option ('a' = no alternative (default) | 'b' = alternative allowed)
  }
  rec(e) { const r = { t: Date.now(), ...e }; this.audit.push(r); return r; }
  protectedOk(adminAuth) { return adminAuth && adminAuth.reauth === true && Date.now() - adminAuth.at <= this.maxAgeMs; }
  /** protected operation: add an IdP to a tenant */
  addIdp(tid, idp, adminAuth) {
    if (!this.protectedOk(adminAuth)) return this.rec({ op: 'idp.add', ok: false, why: 'protected_operation_requires_fresh_reauth' });
    if (!this.tenantIdps.has(tid)) this.tenantIdps.set(tid, new Map());
    this.tenantIdps.get(tid).set(idp.issuer, { jwks: createRemoteJWKSet(new URL(idp.issuer)), rules: { jit: true } });
    this.notifications.push({ tid, what: 'idp_added', to: 'all_admins_and_security_contact' });
    return this.rec({ op: 'idp.add', ok: true, tid_hash: h(tid) });
  }
  setupIdp(tid, idp) { if (!this.tenantIdps.has(tid)) this.tenantIdps.set(tid, new Map()); this.tenantIdps.get(tid).set(idp.issuer, { jwks: createRemoteJWKSet(new URL(idp.issuer)), rules: { jit: true } }); }
  changeLinkingRule(tid, rule, adminAuth) {
    if (!this.protectedOk(adminAuth)) return this.rec({ op: 'linking_rule.change', ok: false, why: 'protected_operation_requires_fresh_reauth' });
    if (['email', 'username', 'upn'].includes(rule.match_on)) return this.rec({ op: 'linking_rule.change', ok: false, why: 'mutable_attribute_linking_forbidden (INV-2)' });
    this.notifications.push({ tid, what: 'linking_rule_changed' });
    return this.rec({ op: 'linking_rule.change', ok: true });
  }
  /** re-bind an existing account to another IdP (protected: admin fresh re-auth + user notification + audit) */
  relink(platformSub, tid, newIss, newSub, adminAuth) {
    if (!this.protectedOk(adminAuth)) return this.rec({ op: 'account.relink', ok: false, why: 'protected_operation_requires_fresh_reauth' });
    const old = this.accountLink.get(platformSub);
    if (old) this.links.delete(`${old.tid}|${old.iss}|${old.sub}`);
    this.links.set(`${tid}|${newIss}|${newSub}`, platformSub);
    this.accountLink.set(platformSub, { tid, iss: newIss, sub: newSub });
    this.notifications.push({ to: 'user_all_targets', what: 'idp_relinked' });
    return this.rec({ op: 'account.relink', ok: true });
  }
  link(tid, iss, sub, platformSub) { this.links.set(`${tid}|${iss}|${sub}`, platformSub); this.accountLink.set(platformSub, { tid, iss, sub }); }
  /** RP-initiated login for tenant tid through an upstream IdP: returns the platform subject or a refusal */
  async login(tid, idp, upstream, { nonce = crypto.randomBytes(8).toString('hex'), scim } = {}) {
    const cfg = this.tenantIdps.get(tid)?.get(idp.issuer);
    if (!cfg) return this.rec({ op: 'login', ok: false, why: 'idp_not_configured_for_tenant' });
    let tok;
    try { tok = await idp.idToken({ ...upstream, aud: this.clientId, nonce }); } catch (e) { return this.rec({ op: 'login', ok: false, why: 'upstream_idp_unavailable', alt_login_offered: this.altLoginForTenant.get(tid) === 'b' }); }
    let v;
    try { v = await jwtVerify(tok, cfg.jwks, { issuer: idp.issuer, audience: this.clientId }); } catch (e) { return this.rec({ op: 'login', ok: false, why: `assertion_invalid:${e.code}` }); }
    if (v.payload.nonce !== nonce) return this.rec({ op: 'login', ok: false, why: 'nonce' });
    const key = `${tid}|${v.payload.iss}|${v.payload.sub}`;
    let p = this.links.get(key);
    let created = false;
    if (!p) {
      if (!cfg.rules.jit) return this.rec({ op: 'login', ok: false, why: 'no_link_and_no_jit' });
      // JIT through SCIM-compatible creation (single creator, keyed by the triple: no duplicate with SCIM)
      p = scim ? await scim.createOrBind(tid, { iss: v.payload.iss, sub: v.payload.sub }, 'jit') : syntheticId();
      this.link(tid, v.payload.iss, v.payload.sub, p);
      created = true;
    }
    return this.rec({ op: 'login', ok: true, platform_sub: p, created, linked_by: 'tenant+iss+sub' });
  }
}

/** SCIM service provider (platform side) with tenant from credential, uniqueness, ETag/If-Match and JIT binding. */
export class ScimReceiver {
  constructor({ s, port, credentials, onCreate, onDeactivate }) {
    Object.assign(this, { s, port, credentials, onCreate, onDeactivate });
    this.users = new Map(); // id -> { id, tid, externalId, triple, active, version, userName }
    this.byTriple = new Map(); // `${tid}|${iss}|${sub}` -> id
    this.byExternal = new Map(); // `${tid}|${externalId}` -> id
    this.writes = []; this.lock = Promise.resolve();
  }
  serialize(fn) { const p = this.lock.then(fn, fn); this.lock = p.catch(() => {}); return p; } // per-provider serialisation of state changes
  async createOrBind(tid, { iss, sub }, source, externalId) {
    return this.serialize(async () => {
      const tk = `${tid}|${iss}|${sub}`;
      if (this.byTriple.has(tk)) return this.users.get(this.byTriple.get(tk)).id; // JIT and SCIM arriving together bind to one account
      if (externalId && this.byExternal.has(`${tid}|${externalId}`)) return null;
      const id = syntheticId();
      const u = { id, tid, externalId, triple: tk, active: true, version: 1, source };
      this.users.set(id, u); this.byTriple.set(tk, id); if (externalId) this.byExternal.set(`${tid}|${externalId}`, id);
      await this.onCreate(u);
      return id;
    });
  }
  async start() {
    this.srv = http.createServer((req, res) => {
      let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => this.handle(req, res, b).catch((e) => { res.writeHead(500); res.end(e.message); }));
    });
    await new Promise((ok) => this.srv.listen(this.port, '127.0.0.1', ok));
    return this;
  }
  send(res, status, body, headers = {}) { res.writeHead(status, { 'content-type': 'application/scim+json', ...headers }); res.end(body ? JSON.stringify(body) : ''); }
  async handle(req, res, raw) {
    const cred = (req.headers.authorization || '').replace(/^Bearer /, '');
    const tid = this.credentials.get(cred);
    if (!tid) return this.send(res, 401, { status: '401' });
    if (req.headers['x-tenant-id'] && req.headers['x-tenant-id'] !== tid) return this.send(res, 403, { status: '403', scimType: 'tenant_mismatch' });
    const url = new URL(req.url, 'http://local');
    const body = raw ? JSON.parse(raw) : {};
    const m = /^\/scim\/v2\/Users(?:\/([^/]+))?$/.exec(url.pathname);
    if (!m) return this.send(res, 404, { status: '404' });
    const id = m[1];
    if (req.method === 'POST' && !id) {
      if (body.tenant_id && body.tenant_id !== tid) return this.send(res, 400, { status: '400', scimType: 'invalidValue' });
      const { iss, sub } = body['urn:poc:federation'] || {};
      const r = await this.createOrBind(tid, { iss, sub }, 'scim', body.externalId);
      if (r === null) return this.send(res, 409, { status: '409', scimType: 'uniqueness' });
      const u = this.users.get(r);
      this.writes.push({ op: 'create', tid, id: r });
      return this.send(res, 201, { id: u.id, externalId: u.externalId, active: u.active, meta: { version: `W/"${u.version}"` } }, { etag: `W/"${u.version}"` });
    }
    const u = id && this.users.get(id);
    if (!u || u.tid !== tid) return this.send(res, 404, { status: '404' }); // other tenant's id: same as non-existent
    if (req.method === 'GET') return this.send(res, 200, { id: u.id, active: u.active, meta: { version: `W/"${u.version}"` } }, { etag: `W/"${u.version}"` });
    if (req.method === 'PATCH') {
      return this.serialize(async () => {
        const im = req.headers['if-match'];
        if (im && im !== `W/"${u.version}"`) return this.send(res, 412, { status: '412' });
        for (const op of body.Operations || []) {
          if (op.path === 'active') {
            const was = u.active; u.active = op.value === true || op.value === 'true';
            if (was && !u.active) await this.onDeactivate(u);
          } else if (op.path === 'tenant_id' || op.path === 'id') return this.send(res, 400, { status: '400', scimType: 'mutability' });
        }
        u.version++;
        this.writes.push({ op: 'patch', tid, id: u.id, if_match: !!im });
        return this.send(res, 200, { id: u.id, active: u.active, meta: { version: `W/"${u.version}"` } }, { etag: `W/"${u.version}"` });
      });
    }
    return this.send(res, 405, { status: '405' });
  }
  async stop() { await new Promise((ok) => this.srv.close(ok)); }
}
const h = (x) => crypto.createHash('sha256').update(String(x)).digest('hex').slice(0, 12);
