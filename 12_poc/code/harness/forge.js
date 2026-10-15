// Test-only token forging (negative vectors for TC-004/TC-006/TC-014/TC-015/TC-025). Loads the run's STS / TTS
// key stores from the git-ignored secrets directory and signs arbitrary headers / payloads, or signs with a
// freshly generated foreign key. Never used by components.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { importJWK, generateKeyPair, exportJWK, CompactSign } from 'jose';
import { opaqueId } from '../lib/ids.js';

export async function loadIssuerKeys(topo, which = 'at') {
  const f = path.join(topo.secretsDir, which === 'txn' ? 'tts-txn-keys.json' : 'sts-at-keys.json');
  const saved = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Promise.all(saved.keys.map(async (k) => ({ ...k, privateKey: await importJWK(k.privateJwk, k.alg) })));
}

/** Sign raw header + payload (no claim defaults, no validation). alg 'none' produces an unsigned token. */
export async function signRaw(header, payload, key) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  if (header.alg === 'none') return `${enc(header)}.${enc(payload)}.`;
  return new CompactSign(Buffer.from(JSON.stringify(payload))).setProtectedHeader(header).sign(key);
}

export async function foreignKey(alg = 'ES256') {
  const { privateKey, publicKey } = await generateKeyPair(alg, { extractable: true });
  return { alg, privateKey, publicJwk: { ...(await exportJWK(publicKey)), kid: `foreign-${crypto.randomBytes(3).toString('hex')}`, alg } };
}

/** A schema-valid internal access token payload for a human subject (override any field). */
export function atPayload(topo, { sub, tid, aud, scope = 'files.read', cnfX5t, ...over } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: topo.issuers.sts, sub, aud, exp: now + 60, iat: now, jti: opaqueId(), client_id: topo.clients.bff.clientId,
    scope, tid, ptype: 'human', acr: 'L2', amr: ['pwd', 'otp'], auth_time: now - 10, sid: opaqueId(), gref: opaqueId(),
    ...(cnfX5t ? { cnf: { 'x5t#S256': cnfX5t } } : {}), ver: '1.0', ...over,
  };
}
