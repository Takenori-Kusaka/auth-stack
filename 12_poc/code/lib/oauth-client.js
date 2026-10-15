// OAuth client toolkit used by the BFF, the harness (as user agent / public CLI client) and negative tests.
// Implements: discovery, PAR, PKCE (S256), private_key_jwt, DPoP (with nonce retry), the authorization round
// trip through the synthetic login, RFC 9207 issuer check, token / refresh / introspection calls.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { SignJWT, importJWK } from 'jose';
import { request } from './http.js';
import { createProof } from './dpop.js';

export function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge, method: 'S256' };
}

export async function clientAssertion({ clientId, privateJwk, privateJwkFile, aud }) {
  const jwk = privateJwk || JSON.parse(fs.readFileSync(privateJwkFile, 'utf8'));
  const key = await importJWK(jwk, 'ES256');
  return new SignJWT({ jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
    .setIssuer(clientId).setSubject(clientId).setAudience(aud)
    .setIssuedAt().setExpirationTime('60s')
    .sign(key);
}

/** Minimal cookie-keeping user agent (no automatic redirects). */
export class UserAgent {
  constructor({ tls } = {}) { this.tls = tls; this.cookies = new Map(); }
  cookieHeader(url) {
    const host = new URL(url).host;
    const jar = this.cookies.get(host);
    return jar ? [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ') : undefined;
  }
  store(url, res) {
    const sc = res.headers['set-cookie'];
    if (!sc) return;
    const host = new URL(url).host;
    let jar = this.cookies.get(host);
    if (!jar) this.cookies.set(host, (jar = new Map()));
    for (const c of [].concat(sc)) {
      const [kv, ...attrs] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      if (attrs.some((a) => /expires=Thu, 01 Jan 1970/i.test(a)) || v === '') jar.delete(k); else jar.set(k, v);
    }
  }
  async go(url, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const ck = this.cookieHeader(url);
    if (ck) headers.cookie = ck;
    const r = await request(url, { ...opts, headers, tls: opts.tls || this.tls });
    this.store(url, r);
    return r;
  }
}

export async function discover(base, tls) {
  const r = await request(`${base}/.well-known/openid-configuration`, { tls });
  if (r.status !== 200) throw new Error(`discovery failed ${r.status}`);
  return r.json();
}

async function authParams(auth, aud) {
  if (auth.type === 'private_key_jwt') {
    return {
      client_id: auth.clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: await clientAssertion({ clientId: auth.clientId, privateJwkFile: auth.privateJwkFile, privateJwk: auth.privateJwk, aud }),
    };
  }
  return { client_id: auth.clientId };
}

/** POST to a token-like endpoint with optional DPoP (retries once on use_dpop_nonce). */
export async function tokenRequest(meta, endpoint, form, { auth, dpopKey, tls, accessToken } = {}) {
  let nonce;
  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = {};
    if (dpopKey) headers.dpop = await createProof(dpopKey, { htm: 'POST', htu: endpoint, nonce, accessToken });
    const body = { ...form, ...(auth ? await authParams(auth, meta.issuer) : {}) };
    const r = await request(endpoint, { method: 'POST', form: body, headers, tls });
    const j = r.json() || {};
    if (dpopKey && (j.error === 'use_dpop_nonce') && r.headers['dpop-nonce'] && attempt === 0) { nonce = r.headers['dpop-nonce']; continue; }
    return { status: r.status, body: j, headers: r.headers };
  }
  throw new Error('unreachable');
}

export async function par(meta, params, { auth, tls, dpopKey }) {
  return tokenRequest(meta, meta.pushed_authorization_request_endpoint, params, { auth, tls, dpopKey });
}

/**
 * Drive the browser leg: authorization endpoint -> synthetic login -> callback URL.
 * login: { sub, tid, amr } ; returns { callbackUrl, params, interaction } (params from the redirect query)
 */
export async function authorizeAsUser(ua, meta, query, login, { stopAtLogin = false } = {}) {
  let url = `${meta.authorization_endpoint}?${new URLSearchParams(query)}`;
  let interaction;
  for (let hop = 0; hop < 10; hop++) {
    const r = await ua.go(url);
    if (r.status === 303 || r.status === 302) {
      const loc = new URL(r.headers.location, url).toString();
      const issHost = new URL(meta.authorization_endpoint).host;
      if (new URL(loc).host !== issHost || !loc.startsWith(new URL(meta.authorization_endpoint).origin)) {
        const u = new URL(loc);
        return { callbackUrl: loc, params: Object.fromEntries(u.searchParams), interaction };
      }
      if (/\/interaction\/[^/]+$/.test(new URL(loc).pathname)) {
        const d = await ua.go(loc);
        interaction = d.json();
        if (stopAtLogin) return { interaction, loginUrl: loc };
        const lr = await ua.go(`${loc}/login`, { method: 'POST', form: login });
        if (lr.status !== 303 && lr.status !== 302) throw new Error(`login failed ${lr.status} ${lr.text}`);
        url = new URL(lr.headers.location, loc).toString();
        continue;
      }
      url = loc;
      continue;
    }
    if (r.status === 400 || r.status === 200) {
      return { error: r.json() || r.text, status: r.status, interaction };
    }
    throw new Error(`unexpected authorization response ${r.status}: ${r.text.slice(0, 200)}`);
  }
  throw new Error('too many redirects');
}

/** RFC 9207 §2.4: compare `iss` with the issuer the request was sent to (simple string comparison). */
export function checkIssuer(params, expectedIssuer, { issParameterSupported = true } = {}) {
  if (params.iss === undefined) return issParameterSupported ? 'iss_missing' : null;
  return params.iss === expectedIssuer ? null : 'iss_mismatch';
}

/** Full authorization-code flow helper (PAR + PKCE). Returns tokens or an error object. */
export async function codeFlow({ meta, auth, tls, dpopKey, ua, login, redirectUri, scope, resource, usePar = true, expectedIssuer, extraAuthParams = {} }) {
  const p = pkce();
  const state = crypto.randomBytes(12).toString('base64url');
  const nonce = crypto.randomBytes(12).toString('base64url');
  const reqParams = { response_type: 'code', client_id: auth.clientId, redirect_uri: redirectUri, scope, state, nonce, code_challenge: p.challenge, code_challenge_method: 'S256', ...extraAuthParams };
  if (resource) reqParams.resource = resource;
  if (dpopKey) reqParams.dpop_jkt = dpopKey.jkt;
  let query;
  if (usePar) {
    const pr = await par(meta, reqParams, { auth, tls, dpopKey });
    if (pr.status !== 201) return { error: 'par_failed', detail: pr.body };
    query = { client_id: auth.clientId, request_uri: pr.body.request_uri };
  } else query = reqParams;
  const az = await authorizeAsUser(ua, meta, query, login);
  if (az.error) return { error: 'authorization_failed', detail: az.error };
  if (az.params.error) return { error: 'authorization_error', detail: az.params };
  if (az.params.state !== state) return { error: 'state_mismatch' };
  const issErr = checkIssuer(az.params, expectedIssuer || meta.issuer);
  if (issErr) return { error: issErr, detail: az.params };
  const tr = await tokenRequest(meta, meta.token_endpoint, { grant_type: 'authorization_code', code: az.params.code, redirect_uri: redirectUri, code_verifier: p.verifier, ...(resource ? { resource } : {}) }, { auth, tls, dpopKey });
  if (tr.status !== 200) return { error: 'token_failed', detail: tr.body, status: tr.status };
  return { tokens: tr.body, code: az.params.code, verifier: p.verifier, authParams: az.params };
}

export async function introspect(meta, token, { auth, tls }) {
  const r = await tokenRequest(meta, meta.introspection_endpoint, { token }, { auth, tls });
  return r.body;
}
