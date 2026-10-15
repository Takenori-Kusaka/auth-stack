// Token verification for K3 (internal access token) and K5 (Transaction Token).
// Rules: CON-16 §1.2-§1.9 (V1-V14, TP-01..TP-10). Failure detail goes to internal log only.
import { parseCompact, jwkToPublicKey, verifyES256 } from './jose.js';

const FORBIDDEN_HEADER = ['jku', 'x5u', 'x5c', 'jwk', 'crit', 'cty'];
const KID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const OPAQUE_RE = /^[\x21-\x7E]{1,64}$/;
const PTYPES = new Set(['human', 'workload', 'service_account', 'ai_agent']);

export class TokenError extends Error {
  constructor(check, { unavailable = false } = {}) { super(check); this.check = check; this.unavailable = unavailable; }
}

// JWKS cache keyed by kid for one issuer (TP-02/TP-03). Last-known-good is kept on fetch failure.
export class KeySet {
  constructor(name, jwksUrlProvider, { minRefetchIntervalMs = 30000, fetchTimeoutMs = 1000 } = {}) {
    this.name = name; this.jwksUrlProvider = jwksUrlProvider;
    this.keys = null; this.lastUnknownRefetch = 0;
    this.minRefetchIntervalMs = minRefetchIntervalMs; this.fetchTimeoutMs = fetchTimeoutMs;
  }
  async fetchKeys() {
    const url = await this.jwksUrlProvider();
    const r = await fetch(url, { signal: AbortSignal.timeout(this.fetchTimeoutMs) });
    if (!r.ok) throw new Error(`jwks ${this.name} ${r.status}`);
    const body = await r.json();
    const m = new Map();
    for (const k of body.keys || []) {
      if (!k.kid || !KID_RE.test(k.kid)) continue;
      if (k.kty !== 'EC' || k.crv !== 'P-256' || k.alg !== 'ES256') continue; // V2: 1 key 1 alg
      m.set(k.kid, jwkToPublicKey(k));
    }
    this.keys = m;
  }
  async refresh() {
    try { await this.fetchKeys(); } catch (e) {
      if (!this.keys) throw new TokenError(`${this.name}_jwks_unavailable`, { unavailable: true });
      console.error(JSON.stringify({ level: 'warn', msg: 'jwks fetch failed, using last known good', set: this.name }));
    }
  }
  async get(kid) {
    if (!this.keys) await this.refresh();
    let k = this.keys.get(kid);
    if (k) return k;
    const now = Date.now();
    if (now - this.lastUnknownRefetch >= this.minRefetchIntervalMs) { // TP-02: refetch once
      this.lastUnknownRefetch = now;
      await this.refresh();
      k = this.keys.get(kid);
    }
    if (!k) throw new TokenError('unknown_kid');
    return k;
  }
}

function checkHeader(h, expectedTyps, allowlist) {
  if (!expectedTyps.includes(h.typ)) throw new TokenError('bad_typ');
  if (typeof h.alg !== 'string' || !allowlist.includes(h.alg)) throw new TokenError('bad_alg');
  for (const p of FORBIDDEN_HEADER) if (p in h) throw new TokenError('forbidden_header');
  if (typeof h.kid !== 'string' || !KID_RE.test(h.kid)) throw new TokenError('bad_kid');
}

function checkTimes(p, now, skew) {
  if (!Number.isInteger(p.exp) || !(p.exp > now)) throw new TokenError('expired'); // V7: no skew on exp
  if (!Number.isInteger(p.iat)) throw new TokenError('bad_iat');
  if (p.iat > now + skew) throw new TokenError('iat_future');
  if (p.nbf !== undefined && (!Number.isInteger(p.nbf) || p.nbf > now + skew)) throw new TokenError('nbf_future');
}

const isOpaque = (v) => typeof v === 'string' && OPAQUE_RE.test(v);

export class Verifier {
  constructor(cfg, issuerKeys, ttsKeys) { this.cfg = cfg; this.issuerKeys = issuerKeys; this.ttsKeys = ttsKeys; }

  // K3: Authorization: Bearer only (TP-01, V11)
  async verifyAccessToken(authorization) {
    const cfg = this.cfg; const v = cfg.verifier;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new TokenError('missing');
    const tok = authorization.slice(7).trim();
    if (Buffer.byteLength(tok) > cfg.maxJwtBytes) throw new TokenError('too_large'); // TP-06
    const jws = parseCompact(tok);
    if (!jws) throw new TokenError('malformed');
    checkHeader(jws.header, ['at+jwt', 'application/at+jwt'], v.alg_allowlist);
    const key = await this.issuerKeys.get(jws.header.kid);
    if (!verifyES256(jws.signingInput, jws.signature, key)) throw new TokenError('bad_signature');
    const p = jws.payload;
    if (p.iss !== cfg.issuer) throw new TokenError('bad_iss');
    const now = Math.floor(Date.now() / 1000);
    checkTimes(p, now, v.clock_skew_seconds);
    if (typeof p.aud !== 'string' || p.aud !== cfg.audience) throw new TokenError('bad_aud');
    for (const c of ['sub', 'jti', 'client_id', 'tid']) if (!isOpaque(p[c])) throw new TokenError(`bad_${c}`);
    if (!PTYPES.has(p.ptype)) throw new TokenError('bad_ptype');
    if (typeof p.ver !== 'string' || !/^\d+\.\d+$/.test(p.ver)) throw new TokenError('bad_ver');
    const [maj] = p.ver.split('.').map(Number); const [minMaj] = v.min_profile_version.split('.').map(Number);
    if (maj < minMaj) throw new TokenError('ver_below_min'); // CV-014
    if ('txn' in p || 'tctx' in p) throw new TokenError('k5_claims_in_k3'); // NE-12
    if (p.ptype === 'human') for (const c of ['acr', 'amr', 'auth_time', 'sid', 'gref']) if (p[c] === undefined) throw new TokenError(`missing_${c}`);
    let actor = null;
    if (p.act !== undefined) {
      if (!p.act || typeof p.act !== 'object' || !isOpaque(p.act.sub) || !PTYPES.has(p.act.ptype)) throw new TokenError('bad_act');
      actor = { sub: p.act.sub, ptype: p.act.ptype }; // AD-04 / V10: outermost act only
    }
    // V10: roles/groups/email etc. are ignored (never copied into Principal)
    return {
      kind: 'K3', issuer: p.iss, profile: p.ver,
      sub: p.sub, ptype: p.ptype, tid: p.tid, actor, clientId: p.client_id,
      scope: typeof p.scope === 'string' ? p.scope.split(' ') : null,
      sid: p.sid ?? null, gref: p.gref ?? null, jti: p.jti, acr: p.acr ?? null,
    };
  }

  // K5: Txn-Token header only (CON-16 §1.6). at = verified K3 principal (null for internal start).
  async verifyTxnToken(value, at) {
    const cfg = this.cfg;
    if (typeof value !== 'string' || value.length === 0) throw new TokenError('txn_missing');
    if (Buffer.byteLength(value) > cfg.maxJwtBytes) throw new TokenError('txn_too_large');
    const jws = parseCompact(value);
    if (!jws) throw new TokenError('txn_malformed');
    checkHeader(jws.header, ['txntoken+jwt'], cfg.verifier.alg_allowlist);
    const key = await this.ttsKeys.get(jws.header.kid);
    if (!verifyES256(jws.signingInput, jws.signature, key)) throw new TokenError('txn_bad_signature');
    const p = jws.payload;
    if (p.iss !== cfg.tts.issuer) throw new TokenError('txn_bad_iss');
    if (p.aud !== cfg.tts.audience) throw new TokenError('txn_bad_aud');
    checkTimes(p, Math.floor(Date.now() / 1000), cfg.verifier.clock_skew_seconds);
    for (const c of ['txn', 'sub']) if (!isOpaque(p[c])) throw new TokenError(`txn_bad_${c}`);
    const t = p.tctx;
    if (!t || typeof t !== 'object' || !isOpaque(t.tid) || !t.root_jti || !t.tier || !t.ver) throw new TokenError('txn_bad_tctx');
    if (at && p.sub !== at.sub) throw new TokenError('txn_sub_mismatch'); // CON-16 §1.6 (3)
    return { txn: p.txn, sub: p.sub, scope: p.scope, tctx: t };
  }
}
