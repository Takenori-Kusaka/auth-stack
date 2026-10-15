// Signing key store for an issuer (STS, TTS, AS-internal uses). Keys are generated at run time and
// persisted only under the run's secrets directory (12_poc/code/.run/, git-ignored).
// Lifecycle (ADR-007 計画 rotation 4 段): pending(事前公開) -> active(署名) -> retiring(保持・検証のみ) -> removed.
// - JWKS publishes pending + active + retiring.
// - `retain` keys cannot be removed (TC-014: retain 指定の鍵の削除は阻止).
// - 1 key = 1 alg = 1 token kind (ADR-005 V2).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { generateKeyPair, exportJWK, importJWK } from 'jose';

const ALG_PARAMS = {
  ES256: { crv: 'P-256' },
  ES384: { crv: 'P-384' },
  PS256: { modulusLength: 2048 },
  EdDSA: { crv: 'Ed25519' },
};

export class KeyStore {
  constructor({ file, kind, kidPrefix, alg = 'ES256' }) {
    this.file = file;
    this.kind = kind; // 'at' | 'txn' | ...
    this.kidPrefix = kidPrefix;
    this.defaultAlg = alg;
    this.keys = [];
    this.events = []; // lifecycle log (no key material)
  }

  async init() {
    if (this.file && fs.existsSync(this.file)) {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const k of saved.keys) {
        k.privateKey = await importJWK(k.privateJwk, k.alg);
        this.keys.push(k);
      }
    }
    if (!this.keys.some((k) => k.state === 'active')) {
      const k = await this.generate(this.defaultAlg);
      k.state = 'active';
      k.activatedAt = Date.now();
      this.persist();
    }
    return this;
  }

  async generate(alg = this.defaultAlg, { retain = false } = {}) {
    if (!ALG_PARAMS[alg]) throw new Error(`unsupported alg ${alg}`);
    const { privateKey } = await generateKeyPair(alg, { ...ALG_PARAMS[alg], extractable: true });
    const privateJwk = await exportJWK(privateKey);
    const kid = `${this.kidPrefix}-${crypto.randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, 'x')}`;
    const { d, p, q, dp, dq, qi, ...pub } = privateJwk;
    const k = {
      kid, alg, kind: this.kind, state: 'pending', retain, createdAt: Date.now(),
      privateJwk, privateKey, publicJwk: { ...pub, kid, alg, use: 'sig' },
    };
    this.keys.push(k);
    this.log('generate', k);
    this.persist();
    return k;
  }

  log(op, k, extra = {}) {
    this.events.push({ t: new Date().toISOString(), op, kid: k.kid, alg: k.alg, state: k.state, ...extra });
  }

  persist() {
    if (!this.file) return;
    const out = { keys: this.keys.map(({ privateKey, ...rest }) => rest) };
    fs.writeFileSync(this.file, JSON.stringify(out), { mode: 0o600 });
  }

  active() {
    const a = this.keys.filter((k) => k.state === 'active');
    if (a.length !== 1) throw new Error(`expected exactly one active key, have ${a.length}`);
    return a[0];
  }

  jwks() {
    return { keys: this.keys.filter((k) => ['pending', 'active', 'retiring'].includes(k.state)).map((k) => k.publicJwk) };
  }

  find(kid) {
    return this.keys.find((k) => k.kid === kid);
  }

  /** Planned rotation step 1: pre-publish a new key. */
  async prepublish(alg = this.defaultAlg, opts = {}) {
    return this.generate(alg, opts);
  }

  /**
   * Step 2: switch signing to `kid` (must be pending). The previous active key moves to retiring.
   * A retiring key (still published) may be re-activated: this is the rollback of ADR-015 D15-71 step 4
   * ("旧鍵は公開したままなので戻しも利用側無改修で済む") and re-switch of step 5 (RK-05).
   */
  activate(kid) {
    const k = this.find(kid);
    if (!k || (k.state !== 'pending' && k.state !== 'retiring')) throw Object.assign(new Error('key not pending'), { status: 409 });
    if (k.state === 'retiring') this.log('reactivate', k);
    for (const o of this.keys) if (o.state === 'active') { o.state = 'retiring'; o.retiringAt = Date.now(); this.log('retire', o); }
    k.state = 'active';
    k.activatedAt = Date.now();
    this.log('activate', k);
    this.persist();
    return k;
  }

  /** Step 4: remove a retiring key from the JWKS. Retained keys and the active key cannot be removed. */
  remove(kid, { force = false, checkInUse = false } = {}) {
    const k = this.find(kid);
    if (!k) throw Object.assign(new Error('unknown kid'), { status: 404 });
    if (k.retain && !force) {
      this.log('remove_blocked_retain', k);
      throw Object.assign(new Error('key is marked retain'), { status: 409, code: 'retain' });
    }
    if (k.state === 'active') {
      this.log('remove_blocked_active', k);
      throw Object.assign(new Error('key is active'), { status: 409, code: 'active' });
    }
    // RK-04 (ADR-007 D7-35 condition 2, partial): with `checkInUse` no unexpired token signed by this key may
    // remain. Opt-in (STS setting keyRemovalInUseCheck or request flag) so that other groups' removals are unchanged.
    // A removal without the check while tokens are live is the "mistaken removal" of TC-07-04 and is logged as such.
    const liveUntil = (k.lastExp || 0) * 1000;
    if (liveUntil > Date.now()) {
      if (checkInUse) {
        this.log('remove_blocked_in_use', k, { live_until: new Date(liveUntil).toISOString() });
        throw Object.assign(new Error('key still has unexpired tokens'), { status: 409, code: 'in_use' });
      }
      this.log('remove_while_in_use', k, { live_until: new Date(liveUntil).toISOString() });
    }
    k.state = 'removed';
    k.removedAt = Date.now();
    this.log('remove', k);
    this.persist();
    return k;
  }

  /** Emergency: stop using `kid` immediately (new active key generated if needed). Revocation is distributed by the state store. */
  async emergencyRevoke(kid) {
    const k = this.find(kid);
    if (!k) throw Object.assign(new Error('unknown kid'), { status: 404 });
    const wasActive = k.state === 'active';
    k.state = 'removed';
    k.revokedAt = Date.now();
    this.log('emergency_revoke', k);
    if (wasActive) {
      const n = await this.generate(k.alg);
      n.state = 'active';
      n.activatedAt = Date.now();
      this.log('activate', n);
    }
    this.persist();
    return k;
  }

  /** RK-04: remember the latest expiry signed with a key (in memory; drives the in-use removal check). */
  noteSigned(k, exp) {
    if (typeof exp === 'number' && exp > (k.lastExp || 0)) k.lastExp = exp;
  }

  /**
   * RK-06 key-age hard limit (ADR-007 D7-32): when the active key is older than maxAgeMs, switch to the oldest
   * pre-published key of the same alg without stopping issuance; with no next key keep signing and raise Sev-1
   * once per key (no issuance error either way). Returns the event name or null.
   */
  rollIfAged(maxAgeMs) {
    if (!maxAgeMs) return null;
    const a = this.active();
    if (Date.now() - a.activatedAt <= maxAgeMs) return null;
    const next = this.keys.filter((k) => k.state === 'pending' && k.alg === a.alg).sort((x, y) => x.createdAt - y.createdAt)[0];
    if (next) {
      this.log('hard_limit_switch', a, { next: next.kid, age_ms: Date.now() - a.activatedAt });
      this.activate(next.kid);
      return 'hard_limit_switch';
    }
    if (a.sev1Raised) return null;
    a.sev1Raised = true;
    this.log('hard_limit_no_next_sev1', a, { age_ms: Date.now() - a.activatedAt });
    return 'hard_limit_no_next_sev1';
  }

  /** Key age hard limit check (ADR-007: 鍵年齢の硬上限). Returns false if active key is older than maxAgeMs. */
  activeWithinAge(maxAgeMs) {
    if (!maxAgeMs) return true;
    return Date.now() - this.active().activatedAt <= maxAgeMs;
  }
}
