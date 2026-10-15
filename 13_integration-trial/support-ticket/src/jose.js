// Minimal JOSE helpers (Node 22 crypto only). ES256 only for verification (CON-16 §1.2-4, V1).
import crypto from 'node:crypto';

export const b64u = {
  enc: (buf) => Buffer.from(buf).toString('base64url'),
  dec: (s) => Buffer.from(s, 'base64url'),
};

const B64U_RE = /^[A-Za-z0-9_-]*$/;

// Parse a JWS compact serialization strictly. Returns null on any structural error.
export function parseCompact(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  if (!parts.every((p) => B64U_RE.test(p))) return null;
  let header, payload;
  try {
    header = JSON.parse(b64u.dec(parts[0]).toString('utf8'));
    payload = JSON.parse(b64u.dec(parts[1]).toString('utf8'));
  } catch { return null; }
  if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: b64u.dec(parts[2]) };
}

export function jwkToPublicKey(jwk) {
  const { kty, crv, x, y } = jwk;
  return crypto.createPublicKey({ key: { kty, crv, x, y }, format: 'jwk' });
}

export function verifyES256(signingInput, signature, publicKey) {
  if (signature.length !== 64) return false;
  try {
    return crypto.verify('sha256', Buffer.from(signingInput), { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  } catch { return false; }
}

// Signing helpers are used by tests/stubs only.
export function signES256(header, payload, privateKey) {
  const h = b64u.enc(JSON.stringify(header));
  const p = b64u.enc(JSON.stringify(payload));
  const sig = crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${h}.${p}.${b64u.enc(sig)}`;
}

export function randomId() {
  // lower-case base32, 26 chars (CON-02 OpaqueId-like)
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const bytes = crypto.randomBytes(26);
  let s = '';
  for (const b of bytes) s += alphabet[b & 31];
  return s;
}

export function sha256b64u(data) {
  return crypto.createHash('sha256').update(data).digest('base64url');
}
