// (1) token verification, self-implemented (INT-00 §5.2 row (1): "SDK を提供しない言語").
// Rules taken only from CON-06 (access-token-claims.schema.json) and CON-11 §6.2 (CV-001..CV-014).
// ARC-02 V1-V14 itself is not in the integration hand-off set, so the list below is our reading.
import crypto from 'node:crypto';

const b64urlJson = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
const FORBIDDEN_HEADER = ['jku', 'x5u', 'x5c', 'jwk', 'crit', 'cty']; // CON-06 forbiddenHeaderParams
const ACCEPTED_TYP = ['at+jwt', 'application/at+jwt']; // CON-06 accessTokenJwsHeader $comment

export class TokenError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export class TokenVerifier {
  constructor(cfg, fetchImpl = fetch) {
    this.cfg = cfg;
    this.fetch = fetchImpl;
    this.discovery = null;
    this.keys = new Map();
  }

  async loadDiscovery() {
    const r = await this.fetch(this.cfg.oidcDiscoveryUrl);
    if (!r.ok) throw new TokenError('discovery_unavailable');
    this.discovery = await r.json();
    if (!this.discovery.issuer || !this.discovery.jwks_uri) throw new TokenError('discovery_invalid');
  }

  async refreshJwks() {
    if (!this.discovery) await this.loadDiscovery();
    const r = await this.fetch(this.discovery.jwks_uri);
    if (!r.ok) throw new TokenError('jwks_unavailable');
    const jwks = await r.json();
    const next = new Map();
    for (const k of jwks.keys || []) if (k.kid) next.set(k.kid, k);
    this.keys = next;
  }

  async keyFor(kid) {
    if (!this.keys.has(kid)) await this.refreshJwks(); // CV-005: re-fetch once on unknown kid
    const k = this.keys.get(kid);
    if (!k) throw new TokenError('unknown_kid');
    return k;
  }

  /** Returns verified claims or throws TokenError. */
  async verify(compact) {
    if (typeof compact !== 'string') throw new TokenError('malformed');
    const parts = compact.split('.');
    if (parts.length !== 3 || !parts[2]) throw new TokenError('malformed');
    let header, payload;
    try { header = b64urlJson(parts[0]); payload = b64urlJson(parts[1]); } catch { throw new TokenError('malformed'); }
    // typ: only at+jwt (rejects txntoken+jwt, secevent+jwt, JWT/ID Token, missing typ) -> CV-002, CV-010, NE-01, NE-04
    if (!ACCEPTED_TYP.includes(header.typ)) throw new TokenError('bad_typ');
    // alg allowlist (CV-004, NE-02)
    if (!this.cfg.algAllowlist.includes(header.alg)) throw new TokenError('bad_alg');
    for (const p of FORBIDDEN_HEADER) if (p in header) throw new TokenError(`forbidden_header_${p}`); // CV-006, NE-03
    if (typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(header.kid)) throw new TokenError('bad_kid');
    const jwk = await this.keyFor(header.kid);
    // alg / key type mismatch (CV-004 third case)
    if (header.alg === 'ES256' && !(jwk.kty === 'EC' && jwk.crv === 'P-256')) throw new TokenError('alg_key_mismatch');
    if (jwk.alg && jwk.alg !== header.alg) throw new TokenError('alg_key_mismatch');
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const ok = crypto.verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'));
    if (!ok) throw new TokenError('bad_signature');
    // claims
    if (payload.iss !== this.discovery.issuer) throw new TokenError('bad_iss'); // exact match (CV-003, CV-011)
    if (typeof payload.aud !== 'string' || payload.aud !== this.cfg.serviceAudience) throw new TokenError('bad_aud'); // CV-001, NE-05
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp + this.cfg.clockSkewSec <= now) throw new TokenError('expired'); // CV-007, NE-14
    if (typeof payload.iat !== 'number' || payload.iat - this.cfg.clockSkewSec > now) throw new TokenError('bad_iat');
    if (typeof payload.nbf === 'number' && payload.nbf - this.cfg.clockSkewSec > now) throw new TokenError('not_yet_valid');
    for (const c of ['sub', 'client_id', 'jti']) if (typeof payload[c] !== 'string' || !payload[c]) throw new TokenError(`missing_${c}`);
    if (typeof payload.tid !== 'string' || !payload.tid) throw new TokenError('bad_tid'); // NE-06 (array) is rejected here
    // Txn-Token discriminators inside an access token (NE-12)
    if ('txn' in payload || 'tctx' in payload) throw new TokenError('txn_claims_in_at');
    // profile version downgrade (CV-014). The minimum is read from config, never from the token.
    if (typeof payload.ver !== 'string' || !/^\d+\.\d+$/.test(payload.ver)) throw new TokenError('bad_ver');
    if (Number(payload.ver.split('.')[0]) < this.cfg.minProfileMajor) throw new TokenError('unsupported_profile');
    // unknown claims are ignored (CV-013)
    return payload;
  }
}
