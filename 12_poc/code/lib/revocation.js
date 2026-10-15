// Revocation-state client (ADR-006 D6-06/D6-08): polls the cell state store, keeps the revocation boundary
// per scope and the time of the last successful sync. Consumers must refuse read-sensitive and above when the
// state is older than M_rev (stale()).
import { request } from './http.js';

export class RevocationClient {
  constructor({ url, tls, pollMs = 200, onEpoch }) {
    this.url = url;
    this.tls = tls;
    this.pollMs = pollMs;
    this.epoch = 0;
    this.byScope = new Map(); // `${scope}:${value}` -> latest revoked_at (ms)
    this.status = { tenants: {}, subjects: {}, freeze: false };
    this.placement = {};
    this.lastSyncAt = 0;
    this.onEpoch = onEpoch;
    this.failures = 0;
  }

  async sync() {
    try {
      const r = await request(`${this.url}/revocations?since=${this.epoch}`, { tls: this.tls, timeoutMs: 1500 });
      if (r.status !== 200) throw new Error(String(r.status));
      const b = r.json();
      for (const e of b.entries) {
        const k = `${e.scope}:${e.value}`;
        this.byScope.set(k, Math.max(this.byScope.get(k) || 0, e.at));
      }
      // RK-07: never step back to an older crypto profile version (monotonic CP, ADR-015 D15-71 step 7)
      const prevCp = this.status && this.status.alg_policy;
      this.status = b.status;
      if (prevCp && (!b.status.alg_policy || b.status.alg_policy.version < prevCp.version)) this.status = { ...b.status, alg_policy: prevCp };
      this.placement = b.placement;
      const prev = this.epoch;
      this.epoch = b.epoch;
      this.lastSyncAt = Date.now();
      if (this.onEpoch && b.epoch !== prev) this.onEpoch(b.epoch, prev);
      return true;
    } catch {
      this.failures++;
      return false;
    }
  }

  start() {
    const loop = async () => { await this.sync(); this.timer = setTimeout(loop, this.pollMs); this.timer.unref?.(); };
    return this.sync().then(() => { this.timer = setTimeout(loop, this.pollMs); this.timer.unref?.(); });
  }

  stop() { clearTimeout(this.timer); }

  ageMs() { return this.lastSyncAt ? Date.now() - this.lastSyncAt : Infinity; }
  stale(mRevMs) { return this.ageMs() > mRevMs; }

  /** True if any scope of the token was revoked at or after the token's iat (seconds). */
  revoked(claims, iatSec) {
    const iatMs = (iatSec || 0) * 1000;
    const check = (scope, v) => {
      if (!v) return false;
      const at = this.byScope.get(`${scope}:${v}`);
      return at !== undefined && at >= iatMs;
    };
    return check('sub', claims.sub) || check('sid', claims.sid) || check('gref', claims.gref)
      || check('client', claims.client_id) || check('tid', claims.tid) || check('jti_ref', claims.jti_ref)
      || (claims.act && check('sub', claims.act.sub));
  }

  kidRevoked(kid) { return this.byScope.has(`kid:${kid}`); }
  tenantCell(tid) { return this.placement[tid] || null; }
  tenantSuspended(tid) { return this.status.tenants[tid] === 'suspended'; }
  subjectSuspended(sub) { return this.status.subjects[sub] === 'suspended'; }
  frozen() { return !!this.status.freeze; }
}
