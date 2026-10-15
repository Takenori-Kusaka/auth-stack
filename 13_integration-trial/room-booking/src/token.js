// Token verification for the two accepted kinds only (CON-16 §1.1): K3 internal access token
// (Authorization: Bearer, typ at+jwt) and K5 Transaction Token (Txn-Token header, typ txntoken+jwt).
// Order follows CON-16 §1.2. Reasons are internal only (§1.9); callers map every failure to one response.
import { parseCompact, verifyES256 } from './jwt.js';

const FORBIDDEN_HEADER = ['jku', 'x5u', 'x5c', 'jwk', 'crit', 'cty']; // TP-02, V3, V13 (crit: none defined in v1)
const KID_RE = /^[A-Za-z0-9_-]{1,64}$/; // TP-04
const PTYPES = new Set(['human', 'service_account', 'workload', 'ai_agent']);
const K3_REQUIRED = ['iss', 'sub', 'aud', 'exp', 'iat', 'jti', 'client_id', 'tid', 'ptype', 'ver'];
const K3_HUMAN_REQUIRED = ['acr', 'amr', 'auth_time', 'sid', 'gref'];
const K5_REQUIRED = ['iss', 'aud', 'iat', 'exp', 'txn', 'sub', 'scope', 'req_wl', 'tctx'];
const TCTX_REQUIRED = ['tid', 'root_jti', 'tier', 'ver'];
const OPAQUE = (v) => typeof v === 'string' && /^[\x21-\x7E]{1,64}$/.test(v); // receive-side OpaqueId

export class JwksSource {
  // fetchJwksUri: async () => jwks_uri (fixed by configuration / discovery of the configured issuer)
  constructor({ name, getJwksUri, minRefetchMs, log }) {
    this.name = name; this.getJwksUri = getJwksUri; this.minRefetchMs = minRefetchMs; this.log = log;
    this.keys = new Map(); this.lastFetch = 0; this.fetchCount = 0;
  }
  async refresh() {
    const uri = await this.getJwksUri();
    const r = await fetch(uri, { signal: AbortSignal.timeout(3000) });
    if (r.status !== 200) throw new Error(`jwks ${this.name} ${r.status}`);
    const set = await r.json();
    if (!Array.isArray(set.keys)) throw new Error('jwks: keys missing');
    const next = new Map();
    for (const k of set.keys) if (k && typeof k.kid === 'string') next.set(k.kid, k);
    this.keys = next; this.lastFetch = Date.now(); this.fetchCount++;
  }
  // TP-02: unknown kid -> refetch once (rate-limited), then reject. Returns {key} | {miss} | {unavailable}
  async lookup(kid) {
    if (this.keys.has(kid)) return { key: this.keys.get(kid) };
    if (Date.now() - this.lastFetch < this.minRefetchMs && this.lastFetch !== 0) return { miss: true };
    try { await this.refresh(); } catch (e) {
      // §1.9: JWKS unreachable -> keep last known good; if no key at all -> 503 not 401
      return this.keys.size === 0 ? { unavailable: true } : { miss: true };
    }
    return this.keys.has(kid) ? { key: this.keys.get(kid) } : { miss: true };
  }
}

function majorOf(v) { return Number(String(v).split('.')[0]); }

function commonHeaderChecks(h, expectedTypes, allowlist) {
  if (!expectedTypes.includes(h.typ)) return 'bad_typ';                           // V5
  if (typeof h.alg !== 'string' || !allowlist.includes(h.alg)) return 'bad_alg';   // V1, V12, V14 (exact case)
  for (const p of FORBIDDEN_HEADER) if (p in h) return `forbidden_header_${p}`;    // TP-02, V3, V13
  if (typeof h.kid !== 'string' || !KID_RE.test(h.kid)) return 'bad_kid';         // TP-04
  return null;
}

async function signatureCheck(parsed, source) {
  const found = await source.lookup(parsed.header.kid);
  if (found.unavailable) return { unavailable: true };
  if (!found.key) return { reason: 'unknown_kid' };
  const k = found.key;
  if (k.alg !== parsed.header.alg) return { reason: 'key_alg_mismatch' };            // V2
  if (parsed.header.alg !== 'ES256') return { reason: 'alg_not_implemented' };       // only ES256 is issued (CP v1)
  if (k.kty !== 'EC' || k.crv !== 'P-256') return { reason: 'key_type_mismatch' };   // V2
  if (!verifyES256(parsed.signingInput, parsed.signature, k)) return { reason: 'bad_signature' }; // V12
  return { ok: true };
}

function timeChecks(p, skew, now) {
  if (typeof p.exp !== 'number' || !(p.exp > now)) return 'expired';               // V7: no skew on exp (EN-1)
  if (typeof p.iat !== 'number' || p.iat - now > skew) return 'iat_future';
  if ('nbf' in p && (typeof p.nbf !== 'number' || p.nbf - now > skew)) return 'nbf_future';
  return null;
}

// verify_access_token (CON-16 §1.2). Returns {ok:true, principal} | {ok:false, reason, unavailable?}
export async function verifyAccessToken(headerValue, cfg, issuerKeys, now = Math.floor(Date.now() / 1000)) {
  if (typeof headerValue !== 'string' || !headerValue.startsWith('Bearer ')) return { ok: false, reason: 'missing' };
  const token = headerValue.slice(7).trim();
  if (Buffer.byteLength(token) > cfg.maxJwtBytes) return { ok: false, reason: 'too_large' };   // TP-06
  const parsed = parseCompact(token);
  if (!parsed) return { ok: false, reason: 'malformed' };
  const hErr = commonHeaderChecks(parsed.header, ['at+jwt', 'application/at+jwt'], cfg.verifier.alg_allowlist);
  if (hErr) return { ok: false, reason: hErr };
  if (cfg.environment === 'production' && parsed.header.kid.startsWith('test-only-')) return { ok: false, reason: 'test_key' };
  const sig = await signatureCheck(parsed, issuerKeys);
  if (sig.unavailable) return { ok: false, reason: 'jwks_unavailable', unavailable: true };
  if (!sig.ok) return { ok: false, reason: sig.reason };
  const p = parsed.payload;
  if (p.iss !== cfg.issuer.expected) return { ok: false, reason: 'bad_iss' };               // V4
  const tErr = timeChecks(p, cfg.verifier.clock_skew_seconds, now);
  if (tErr) return { ok: false, reason: tErr };
  if (typeof p.aud !== 'string' || p.aud !== cfg.audience) return { ok: false, reason: 'bad_aud' }; // V6
  for (const c of K3_REQUIRED) if (!(c in p)) return { ok: false, reason: `missing_${c}` };
  if ('txn' in p || 'tctx' in p) return { ok: false, reason: 'kind_confusion' };            // NE-12
  if (typeof p.tid !== 'string' || !OPAQUE(p.tid)) return { ok: false, reason: 'bad_tid' };  // V9
  if (!OPAQUE(p.sub) || !OPAQUE(p.client_id) || !OPAQUE(p.jti)) return { ok: false, reason: 'bad_id' };
  if (!PTYPES.has(p.ptype)) return { ok: false, reason: 'bad_ptype' };
  if (typeof p.ver !== 'string' || !/^\d+\.\d+$/.test(p.ver)) return { ok: false, reason: 'bad_ver' };
  if (majorOf(p.ver) < majorOf(cfg.verifier.min_profile_version)) return { ok: false, reason: 'ver_below_min' }; // CV-014
  if (p.ptype === 'human') for (const c of K3_HUMAN_REQUIRED) if (!(c in p)) return { ok: false, reason: `missing_${c}` };
  if ('act' in p && (typeof p.act !== 'object' || !OPAQUE(p.act.sub) || !PTYPES.has(p.act.ptype))) return { ok: false, reason: 'bad_act' };
  if (p.cnf) {
    // V8: needs the caller's mTLS certificate thumbprint. No mTLS in this trial -> recorded as untested (CON-16 §4.4).
  }
  return {
    ok: true,
    principal: {
      kind: 'K3', iss: p.iss, sub: p.sub, ptype: p.ptype, tid: p.tid, clientId: p.client_id, jti: p.jti, sid: p.sid ?? null,
      gref: p.gref ?? null, acr: p.acr ?? null, ver: p.ver,
      actor: p.act ? { sub: p.act.sub, ptype: p.act.ptype } : null,   // V10: only the outermost act
    },
  };
}

// Txn-Token verification (CON-16 §1.6). at = verified access-token principal (null for internal start).
export async function verifyTxnToken(value, cfg, ttsKeys, at, now = Math.floor(Date.now() / 1000)) {
  if (typeof value !== 'string' || value.length === 0) return { ok: false, reason: 'txn_missing' };
  if (Buffer.byteLength(value) > cfg.maxJwtBytes) return { ok: false, reason: 'too_large' };
  const parsed = parseCompact(value);
  if (!parsed) return { ok: false, reason: 'malformed' };
  const hErr = commonHeaderChecks(parsed.header, ['txntoken+jwt'], cfg.verifier.alg_allowlist);
  if (hErr) return { ok: false, reason: hErr };
  if (cfg.environment === 'production' && parsed.header.kid.startsWith('test-only-')) return { ok: false, reason: 'test_key' }; // CON-05 §8
  const sig = await signatureCheck(parsed, ttsKeys);   // TTS key family only (K3 keys never accepted)
  if (sig.unavailable) return { ok: false, reason: 'jwks_unavailable', unavailable: true };
  if (!sig.ok) return { ok: false, reason: `txn_${sig.reason}` };
  const p = parsed.payload;
  if (p.iss !== cfg.tts.issuer) return { ok: false, reason: 'txn_bad_iss' };
  if (p.aud !== cfg.tts.audience) return { ok: false, reason: 'txn_bad_aud' };
  const tErr = timeChecks(p, cfg.verifier.clock_skew_seconds, now);
  if (tErr) return { ok: false, reason: `txn_${tErr}` };
  for (const c of K5_REQUIRED) if (!(c in p)) return { ok: false, reason: `txn_missing_${c}` };
  if (typeof p.tctx !== 'object' || p.tctx === null) return { ok: false, reason: 'txn_bad_tctx' };
  for (const c of TCTX_REQUIRED) if (!(c in p.tctx)) return { ok: false, reason: `txn_missing_tctx_${c}` };
  if (at) {
    if (p.sub !== at.sub) return { ok: false, reason: 'txn_sub_mismatch' };
    // tctx.tid vs tid is checked in bind_tenant (CON-16 §2.4) so that it is recorded as l0_mismatch.
  }
  return { ok: true, txn: { txn: p.txn, sub: p.sub, scope: p.scope, tctx: p.tctx, raw: value } };
}
