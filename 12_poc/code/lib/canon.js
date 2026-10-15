// Canonical JSON (sorted keys, no whitespace; RFC 8785-like for the value types used here).
// Used for the audit producer chain fingerprint. The canonicalisation rule for audit fingerprints is
// undecided in the design (audit-event.schema.json Integrity: "DL-77 付属文書で TC-014-13 の前に決める");
// this PoC fixes it as: fp = "sha-256:" + b64url(SHA-256(canonical(record without integrity.seal,
// received_time, record_stage, tenant_seq))). See README "PoC で置いた実装上の決め".
import crypto from 'node:crypto';

export function canonical(v) {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('non-finite number');
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return '[' + v.map((x) => canonical(x === undefined ? null : x)).join(',') + ']';
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

/** Fields added after the producer signs off (journal / sealer) are excluded from the producer fingerprint. */
const POST_PRODUCER = new Set(['received_time', 'record_stage', 'tenant_seq']);

export function producerView(rec) {
  const out = {};
  for (const [k, v] of Object.entries(rec)) {
    if (POST_PRODUCER.has(k)) continue;
    if (k === 'integrity') {
      const { seal, ...rest } = v || {};
      out[k] = rest;
    } else out[k] = v;
  }
  return out;
}

export function fingerprint(rec) {
  return 'sha-256:' + crypto.createHash('sha256').update(canonical(producerView(rec))).digest('base64url');
}

export function sha256hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
