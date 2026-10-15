// DPoP (RFC 9449) proof creation (client side) and verification (edge / RS side).
// ADR-005 D5: nonce mandatory; jti replay check in a shared store; DPoP proofs are only accepted over TLS.
import crypto from 'node:crypto';
import { SignJWT, generateKeyPair, exportJWK, importJWK, jwtVerify, calculateJwkThumbprint, decodeProtectedHeader } from 'jose';

export async function newDpopKey(alg = 'ES256') {
  const { privateKey, publicKey } = await generateKeyPair(alg, { extractable: true });
  const publicJwk = await exportJWK(publicKey);
  return { alg, privateKey, publicJwk, jkt: await calculateJwkThumbprint(publicJwk) };
}

export function htuOf(url) {
  const u = new URL(url);
  return `${u.protocol}//${u.host}${u.pathname}`;
}

export function ath(accessToken) {
  return crypto.createHash('sha256').update(accessToken).digest('base64url');
}

export async function createProof(key, { htm, htu, accessToken, nonce, iat, jti }) {
  const payload = { htm, htu: htuOf(htu), jti: jti || crypto.randomUUID() };
  if (accessToken) payload.ath = ath(accessToken);
  if (nonce) payload.nonce = nonce;
  return new SignJWT(payload)
    .setProtectedHeader({ typ: 'dpop+jwt', alg: key.alg, jwk: key.publicJwk })
    .setIssuedAt(iat ?? Math.floor(Date.now() / 1000))
    .sign(key.privateKey);
}

/** Replay store with expiry (single process; the edge is the only DPoP-accepting RS in this PoC). */
export class JtiStore {
  constructor(ttlMs = 120_000) { this.ttl = ttlMs; this.m = new Map(); }
  seen(jti) {
    const now = Date.now();
    if (this.m.size > 50_000) for (const [k, exp] of this.m) if (exp < now) this.m.delete(k);
    const exp = this.m.get(jti);
    if (exp && exp > now) return true;
    this.m.set(jti, now + this.ttl);
    return false;
  }
}

/** Stateless nonce: HMAC(key, window) with a small set of accepted windows. */
export class NonceSource {
  constructor(windowMs = 30_000) { this.key = crypto.randomBytes(32); this.windowMs = windowMs; }
  current() { return this.make(Math.floor(Date.now() / this.windowMs)); }
  make(w) { return w.toString(36) + '.' + crypto.createHmac('sha256', this.key).update(String(w)).digest('base64url').slice(0, 22); }
  valid(n) {
    if (typeof n !== 'string') return false;
    const w = parseInt(n.split('.')[0], 36);
    const cur = Math.floor(Date.now() / this.windowMs);
    return (w === cur || w === cur - 1) && n === this.make(w);
  }
}

/**
 * Verify a DPoP proof. Returns { jkt } or throws Error with .code.
 * opts: { htm, htu, accessToken?, algs=['ES256'], windowSec=60, skewSec=10, jtiStore, nonces? (NonceSource) }
 */
export async function verifyProof(proof, opts) {
  const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
  if (typeof proof !== 'string' || proof.split('.').length !== 3) fail('dpop_malformed');
  let h;
  try { h = decodeProtectedHeader(proof); } catch { fail('dpop_malformed'); }
  if (h.typ !== 'dpop+jwt') fail('dpop_typ');
  if (!(opts.algs || ['ES256']).includes(h.alg)) fail('dpop_alg');
  if (!h.jwk || h.jwk.d) fail('dpop_jwk');
  let payload;
  try {
    const key = await importJWK(h.jwk, h.alg);
    ({ payload } = await jwtVerify(proof, key, { typ: 'dpop+jwt', algorithms: [h.alg] }));
  } catch { fail('dpop_sig'); }
  if (payload.htm !== opts.htm) fail('dpop_htm');
  if (payload.htu !== htuOf(opts.htu)) fail('dpop_htu');
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat !== 'number' || payload.iat > now + (opts.skewSec ?? 10) || payload.iat < now - (opts.windowSec ?? 60)) fail('dpop_iat');
  if (!payload.jti) fail('dpop_jti');
  if (opts.accessToken !== undefined && payload.ath !== ath(opts.accessToken)) fail('dpop_ath');
  if (opts.nonces && !opts.nonces.valid(payload.nonce)) fail('use_dpop_nonce');
  if (opts.jtiStore && opts.jtiStore.seen(`${h.jwk.x || h.jwk.n}:${payload.jti}`)) fail('dpop_replay');
  return { jkt: await calculateJwkThumbprint(h.jwk), payload };
}
