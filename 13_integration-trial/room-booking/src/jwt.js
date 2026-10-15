// Minimal JWS (compact) helpers on node:crypto. ES256 only for signing; verification is driven by the
// caller's allowlist (CON-16 §1.2 step 4, V1). No external dependencies.
import crypto from 'node:crypto';

export const b64u = (buf) => Buffer.from(buf).toString('base64url');
export const b64uJson = (obj) => b64u(Buffer.from(JSON.stringify(obj)));
export const unb64u = (s) => Buffer.from(s, 'base64url');

export function parseCompact(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  if (!parts.every((p) => /^[A-Za-z0-9_-]*$/.test(p))) return null;
  let header, payload;
  try {
    header = JSON.parse(unb64u(parts[0]).toString('utf8'));
    payload = JSON.parse(unb64u(parts[1]).toString('utf8'));
  } catch { return null; }
  if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: unb64u(parts[2]), parts };
}

export function signES256(header, payload, privateJwk) {
  const key = crypto.createPrivateKey({ key: privateJwk, format: 'jwk' });
  const input = `${b64uJson(header)}.${b64uJson(payload)}`;
  const sig = crypto.sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64u(sig)}`;
}

// Verify ES256 with a public JWK. Returns boolean; never throws (V12: any crypto failure = reject).
export function verifyES256(signingInput, signature, publicJwk) {
  try {
    if (publicJwk.kty !== 'EC' || publicJwk.crv !== 'P-256') return false;
    if (signature.length !== 64) return false;
    const key = crypto.createPublicKey({ key: { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y }, format: 'jwk' });
    return crypto.verify('sha256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' }, signature);
  } catch { return false; }
}

export function newEcKey(kid) {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = privateKey.export({ format: 'jwk' });
  const priv = { ...jwk, kid, alg: 'ES256', use: 'sig' };
  const pub = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, kid, alg: 'ES256', use: 'sig' };
  return { priv, pub, kid };
}

// Opaque ids in the IssuedOpaqueId candidate-1 form (lower base32, 26 chars). CON-02.
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
export function opaqueId() {
  const bytes = crypto.randomBytes(26);
  let out = '';
  for (let i = 0; i < 26; i++) out += B32[bytes[i] & 31];
  return out;
}
export const sha256b64u = (s) => crypto.createHash('sha256').update(s).digest('base64url');
