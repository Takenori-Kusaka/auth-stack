// Internal JWT issuance and verification (ADR-005 D2 V1–V14, token-profile ARC-01, claims-catalog ARC-15).
// The verifier is shared by the PEP SDK, the STS/TTS (subject_token checks) and test checkpoints.
// Rules are applied by default and cannot be disabled by the caller (ADR-005 D2: 利用側で無効化できない).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SignJWT, compactVerify, importJWK, decodeProtectedHeader } from 'jose';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { request } from './http.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CONTRACTS_DIR = path.resolve(here, '../../../11_contracts');

// ---------------------------------------------------------------------------------------------
// Contract schema validation (access-token-claims.schema.json). Unknown claims are dropped before
// validation because receivers MUST ignore claims they do not understand (RFC 7519 §4, ADR-022 H-2);
// claims the profile forbids (`"not": {}`) are known properties and therefore still rejected.
// ---------------------------------------------------------------------------------------------
let ajvCache = null;
export function claimValidators() {
  if (ajvCache) return ajvCache;
  const schema = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'schemas/access-token-claims.schema.json'), 'utf8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(schema);
  const id = schema.$id;
  const get = (def) => ajv.getSchema(`${id}#/$defs/${def}`);
  ajvCache = {
    schema,
    at: { validate: get('internalAccessTokenClaims'), known: Object.keys(schema.$defs.internalAccessTokenClaims.properties) },
    atHeader: { validate: get('accessTokenJwsHeader'), known: Object.keys(schema.$defs.accessTokenJwsHeader.properties) },
    txn: { validate: get('txnTokenClaims'), known: Object.keys(schema.$defs.txnTokenClaims.properties) },
    txnHeader: { validate: get('txnTokenJwsHeader'), known: Object.keys(schema.$defs.txnTokenJwsHeader.properties) },
    introspection: { validate: get('introspectionActive'), known: Object.keys(schema.$defs.introspectionActive.properties) },
  };
  return ajvCache;
}

function pickKnown(obj, known) {
  const out = {};
  for (const k of known) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export function validateClaims(kind, payload) {
  const v = claimValidators()[kind];
  const ok = v.validate(pickKnown(payload, v.known));
  return ok ? null : (v.validate.errors || []).map((e) => `${e.instancePath} ${e.message}`).join('; ');
}

// ---------------------------------------------------------------------------------------------
// Issuance
// ---------------------------------------------------------------------------------------------
export async function signJwt(keystore, typ, payload, { extraHeader = {} } = {}) {
  const k = keystore.active();
  const jws = await new SignJWT(payload)
    .setProtectedHeader({ alg: k.alg, typ, kid: k.kid, ...extraHeader })
    .sign(k.privateKey);
  if (typeof keystore.noteSigned === 'function') keystore.noteSigned(k, payload.exp); // RK-04: usage record for removal checks
  return jws;
}

// ---------------------------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------------------------
const FORBIDDEN_HEADER = ['jku', 'x5u', 'x5c', 'jwk', 'cty'];

export class JwksCache {
  constructor({ tls, ttlMs = 300_000, unknownKidMinIntervalMs = 1_000, fetchTimeoutMs = 2_000 }) {
    this.tls = tls;
    this.ttlMs = ttlMs;
    this.minInterval = unknownKidMinIntervalMs;
    this.timeout = fetchTimeoutMs;
    this.byUrl = new Map(); // url -> { keys: Map(kid -> {jwk, key}), fetchedAt, lastAttempt, failures }
    this.stats = { fetches: 0, failures: 0 };
  }

  async fetch(url, expectPeer) {
    let ent = this.byUrl.get(url);
    if (!ent) { ent = { keys: new Map(), fetchedAt: 0, lastAttempt: 0, failures: 0 }; this.byUrl.set(url, ent); }
    ent.lastAttempt = Date.now();
    this.stats.fetches++;
    try {
      // expectPeer: SPIFFE ID the JWKS server must present (RK-03); undefined keeps the previous behaviour
      const r = await request(url, { tls: this.tls, timeoutMs: this.timeout, expectSpiffeId: expectPeer });
      if (r.status !== 200) throw new Error(`jwks status ${r.status}`);
      const body = r.json();
      if (!body || !Array.isArray(body.keys)) throw new Error('jwks malformed');
      const keys = new Map();
      for (const jwk of body.keys) {
        if (!jwk.kid || !jwk.alg) continue; // 1 key 1 alg: keys without alg are ignored (V2)
        try { keys.set(jwk.kid, { jwk, key: await importJWK(jwk, jwk.alg) }); } catch { /* ignore unusable key */ }
      }
      ent.keys = keys;
      ent.fetchedAt = Date.now();
      ent.failures = 0;
    } catch (e) {
      // ADR-023 D23-10(5): keep using the previous value and raise an alarm
      ent.failures++;
      this.stats.failures++;
    }
    return ent;
  }

  async getKey(url, kid, expectPeer) {
    let ent = this.byUrl.get(url);
    if (!ent || Date.now() - ent.fetchedAt > this.ttlMs) ent = await this.fetch(url, expectPeer);
    let k = ent.keys.get(kid);
    if (!k && Date.now() - ent.lastAttempt >= this.minInterval) {
      ent = await this.fetch(url, expectPeer);
      k = ent.keys.get(kid);
    }
    return k || null;
  }

  invalidate(url) { this.byUrl.delete(url); }
}

export class VerifyError extends Error {
  constructor(code, detail) {
    super(`${code}${detail ? ': ' + detail : ''}`);
    this.code = code;
  }
}

/**
 * Verify an internal token.
 * cfg: {
 *   kind: 'at' | 'txn',
 *   issuers: { [iss]: { jwksUrl, algs: ['ES256'], cell } },   // V1/V3/V4: allowlist + pinned jwks per issuer, from verifier config
 *   audience: string,             // V6 (at: own service audience; txn: trust-domain value)
 *   jwks: JwksCache,
 *   skewSec: 10,                  // V7 future tolerance S
 *   acceptedMajors: [1],          // V13 profile version
 *   isKidRevoked?: (kid) => bool,
 *   tenantCell?: (tid) => cellId|null,  // ADR-021 D21-07 key cell == tenant cell
 *   now?: () => ms,
 * }
 * opts: { peerX5t?: string (x5t#S256 of the mTLS peer), scheme?: 'Bearer'|'DPoP' }
 */
export async function verifyInternalToken(token, cfg, opts = {}) {
  const now = cfg.now ? cfg.now() : Date.now();
  const nowSec = Math.floor(now / 1000);
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token)) throw new VerifyError('malformed');
  let header;
  try { header = decodeProtectedHeader(token); } catch { throw new VerifyError('malformed', 'header'); }
  // V12: none / unsigned
  if (!header.alg || header.alg === 'none' || token.endsWith('.')) throw new VerifyError('alg', 'none');
  // V5: typ
  const typOk = cfg.kind === 'at'
    ? (header.typ === 'at+jwt' || header.typ === 'application/at+jwt')
    : (header.typ === 'txntoken+jwt' || header.typ === 'application/txntoken+jwt');
  if (!typOk) throw new VerifyError('typ', String(header.typ));
  // V3 / forbidden header params; V13 crit: we understand no crit extension -> reject any crit
  for (const p of FORBIDDEN_HEADER) if (header[p] !== undefined) throw new VerifyError('header_param', p);
  if (header.crit !== undefined) throw new VerifyError('crit');
  if (!header.kid || typeof header.kid !== 'string') throw new VerifyError('kid_missing');
  // payload (unverified) only to select the issuer config; nothing is trusted before signature verification
  let unverified;
  try { unverified = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { throw new VerifyError('malformed', 'payload'); }
  const iss = unverified && unverified.iss;
  const icfg = typeof iss === 'string' ? cfg.issuers[iss] : undefined; // V4 exact match
  if (!icfg) throw new VerifyError('iss', String(iss));
  // V1: alg allowlist from verifier config for (issuer x kind)
  if (!icfg.algs.includes(header.alg)) throw new VerifyError('alg', header.alg);
  if (cfg.isKidRevoked && cfg.isKidRevoked(header.kid)) throw new VerifyError('kid_revoked', header.kid);
  const k = await cfg.jwks.getKey(icfg.jwksUrl, header.kid, icfg.jwksPeer); // V3: keys only from the pinned jwks_uri of that issuer (+ pinned server identity, RK-03)
  if (!k) throw new VerifyError('kid_unknown', header.kid);
  if (k.jwk.alg !== header.alg) throw new VerifyError('alg', 'key alg mismatch'); // V2
  let payload;
  try {
    const res = await compactVerify(token, k.key, { algorithms: [header.alg] });
    payload = JSON.parse(Buffer.from(res.payload).toString('utf8'));
  } catch (e) {
    throw new VerifyError('sig', e.code || e.message); // V12
  }
  if (payload.iss !== iss) throw new VerifyError('iss');
  // V6: audience
  const aud = payload.aud;
  if (cfg.kind === 'at') {
    const auds = Array.isArray(aud) ? aud : [aud];
    if (auds.length !== 1 || auds[0] !== cfg.audience) throw new VerifyError('aud', JSON.stringify(aud));
  } else if (aud !== cfg.audience) throw new VerifyError('aud', JSON.stringify(aud));
  // V7: exp / iat / nbf
  const S = cfg.skewSec ?? 10;
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) throw new VerifyError('exp');
  if (typeof payload.iat !== 'number') throw new VerifyError('claims', 'iat');
  if (payload.iat > nowSec + S) throw new VerifyError('iat_future');
  if (payload.nbf !== undefined && (typeof payload.nbf !== 'number' || payload.nbf > nowSec + S)) throw new VerifyError('nbf_future');
  // contract schema (known claims only)
  const schemaErr = validateClaims(cfg.kind, payload);
  if (schemaErr) throw new VerifyError('claims', schemaErr);
  if (cfg.kind === 'at') {
    // V9: exactly one tenant claim (schema enforces string)
    if (typeof payload.tid !== 'string') throw new VerifyError('tid');
    // V13: profile version
    const major = Number(String(payload.ver).split('.')[0]);
    if (!(cfg.acceptedMajors || [1]).includes(major)) throw new VerifyError('ver', payload.ver);
    if (cfg.minMinor !== undefined) {
      const minor = Number(String(payload.ver).split('.')[1]);
      if (major === (cfg.acceptedMajors || [1])[0] && minor < cfg.minMinor) throw new VerifyError('ver', payload.ver);
    }
    // key cell vs tenant cell (ADR-021 D21-07)
    if (cfg.tenantCell) {
      const tc = cfg.tenantCell(payload.tid);
      if (!tc || tc !== icfg.cell) throw new VerifyError('kid_cell', `${tc} != ${icfg.cell}`);
    }
    // V8: sender constraint
    if (payload.cnf && !opts.skipCnf) {
      // opts.skipCnf: only the STS uses it, for a hop's subject_token (bound to the previous presenter; W55-15)
      if (payload.cnf['x5t#S256']) {
        if (!opts.peerX5t || opts.peerX5t !== payload.cnf['x5t#S256']) throw new VerifyError('cnf', 'x5t#S256');
      } else if (payload.cnf.jkt) {
        if (opts.scheme !== 'DPoP' || !opts.dpopJkt || opts.dpopJkt !== payload.cnf.jkt) throw new VerifyError('cnf', 'jkt');
      }
    } else if (!payload.cnf && cfg.requireCnf) throw new VerifyError('cnf', 'missing');
  } else {
    const major = Number(String(payload.tctx && payload.tctx.ver).split('.')[0]);
    if (!(cfg.acceptedMajors || [1]).includes(major)) throw new VerifyError('ver', payload.tctx && payload.tctx.ver);
    if (cfg.tenantCell) {
      const tc = cfg.tenantCell(payload.tctx.tid);
      if (!tc || tc !== icfg.cell) throw new VerifyError('kid_cell');
    }
  }
  return { header, payload, issuerCell: icfg.cell };
}
