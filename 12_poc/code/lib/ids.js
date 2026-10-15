// Identifier helpers.
// - Opaque IDs: lowercase base32 (RFC 4648 alphabet, lowercased), CSPRNG, no embedded semantics
//   (ADR-021 D21-09 / D21-36). 26 chars = 130 bits >= 122 bits.
// - Synthetic IDs (test plan §2.9 / C-1): every synthetic subject/tenant/resource ID starts with
//   the prefix "syn", a form that production IDs never take, so a scanner can detect real data.
// - Keyed references for audit (ADR-014 D14-21): jti_ref = "k1." + b64url(HMAC-SHA-256(K_corr, iss || jti)).
import crypto from 'node:crypto';

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';

export function base32(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Opaque random ID, 26 lowercase base32 chars (matches audit OpaqueId ^[a-z0-9][a-z0-9-]{15,63}$). */
export function opaqueId(len = 26) {
  return base32(crypto.randomBytes(Math.ceil((len * 5) / 8))).slice(0, len);
}

export const SYNTHETIC_PREFIX = 'syn';

/** Synthetic ID: "syn" + 23 base32 chars (26 total). Deterministic when a seeded rng is given. */
export function syntheticId(rng) {
  if (rng) {
    let s = SYNTHETIC_PREFIX;
    for (let i = 0; i < 23; i++) s += B32[Math.floor(rng() * 32)];
    return s;
  }
  return SYNTHETIC_PREFIX + opaqueId(23);
}

export function isSynthetic(id) {
  return typeof id === 'string' && id.startsWith(SYNTHETIC_PREFIX);
}

export function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function sha256b64url(data) {
  return crypto.createHash('sha256').update(data).digest('base64url');
}

export function hmacB64url(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('base64url');
}

/** jti_ref = k<ver>.<43 chars> (audit KeyedRef). */
export function jtiRef(kCorr, iss, jti, ver = 1) {
  return `k${ver}.${hmacB64url(kCorr, `${iss}\u0000${jti}`)}`;
}

/** subj_ref = sr_<26 base32> (audit SubjRef, pseudonymous). */
export function subjRef(kSubj, sub) {
  return 'sr_' + base32(crypto.createHmac('sha256', kSubj).update(String(sub)).digest()).slice(0, 26);
}

/** res_ref = rr_k1.<43> (audit Resource.res_ref). */
export function resRef(kRes, type, id, ver = 1) {
  return `rr_k${ver}.${hmacB64url(kRes, `${type}:${id}`)}`;
}

/** Deterministic opaque mapping of a foreign identifier (e.g. oidc-provider grantId / sid) into OpaqueId form. */
export function mapOpaque(key, value) {
  return base32(crypto.createHmac('sha256', key).update(String(value)).digest()).slice(0, 26);
}

/** W3C traceparent helpers. */
export function newTraceId() {
  let t;
  do { t = crypto.randomBytes(16).toString('hex'); } while (/^0+$/.test(t));
  return t;
}
export function newSpanId() {
  return crypto.randomBytes(8).toString('hex');
}
export function newTraceparent(traceId = newTraceId()) {
  return `00-${traceId}-${newSpanId()}-01`;
}
export function parseTraceparent(tp) {
  const m = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(tp || '');
  if (!m || /^0+$/.test(m[2]) || /^0+$/.test(m[3])) return null;
  return { version: m[1], traceId: m[2], spanId: m[3], flags: m[4] };
}

/** Seeded PRNG (mulberry32) for reproducible synthetic data and property tests. */
export function seededRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashSeed(String(seed))) >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s) {
  return crypto.createHash('sha256').update(s).digest().readUInt32LE(0);
}
