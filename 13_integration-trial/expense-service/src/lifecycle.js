// CR-9: lifecycle event receiver (CON-12 lifecycle-events.asyncapi.yaml 0.5.0, CON-13 lifecycle-event.schema.json 0.2.x,
// CON-15 x-state-query-api 0.1.0). Binding-free core (CON-11 §16.2 7a): events are handed to receive().
import crypto from 'node:crypto';

const P = 'example.id-domain.lifecycle.'; // LC-OI-1: prefix value undecided; taken verbatim from CON-13
const t = (s) => P + s;

/** Key manifest: (iss, typ, kid) -> {alg, jwk}. Format is undecided (ADR-007, CON-11 L11-11) -> pluggable. */
export class StaticKeyManifest {
  constructor(entries = []) { this.m = new Map(entries.map((e) => [`${e.iss}|${e.typ}|${e.kid}`, e])); }
  lookup(iss, typ, kid) { return this.m.get(`${iss}|${typ}|${kid}`); }
}

export function verifyLcsig(ev, manifest, expectedEnv) {
  // RO-11 (a)(b)(c)
  if (typeof ev.lcsig !== 'string') return { ok: false, why: 'lcsig_missing' };
  const parts = ev.lcsig.split('.');
  if (parts.length !== 3 || !parts[2]) return { ok: false, why: 'lcsig_malformed' };
  let h, p;
  try { h = JSON.parse(Buffer.from(parts[0], 'base64url')); p = JSON.parse(Buffer.from(parts[1], 'base64url')); } catch { return { ok: false, why: 'lcsig_malformed' }; }
  if (h.alg === 'none') return { ok: false, why: 'alg_none' };
  if (h.typ !== 'lifecycle-event+jws') return { ok: false, why: 'bad_typ' };
  const entry = manifest.lookup(p.iss, h.typ, h.kid);
  if (!entry) return { ok: false, why: 'key_not_in_manifest' };
  if (h.alg !== entry.alg) return { ok: false, why: 'alg_not_pinned' };
  const key = crypto.createPublicKey({ key: entry.jwk, format: 'jwk' });
  const ok = crypto.verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'));
  if (!ok) return { ok: false, why: 'bad_signature' };
  if (p.env !== expectedEnv) return { ok: false, why: 'env_mismatch' };
  for (const f of ['id', 'source', 'type', 'sequence', 'partitionkey']) if (p[f] !== ev[f]) return { ok: false, why: `payload_mismatch_${f}` };
  return { ok: true, payload: p };
}

export class LifecycleReceiver {
  /**
   * @param deps {validateEvent(ev)->{ok,errors}, validateReport(r)->{ok,errors}, manifest, cfg, store, queryClient, sendReport, alert}
   */
  constructor(deps) {
    Object.assign(this, deps);
    this.seen = new Set(); // (source,id)
    this.lastSeq = new Map(); // partition -> BigInt
    this.held = new Map(); // partition -> Map(seq -> ev)
    this.quarantine = [];
    this.pendingDeletes = new Map(); // request_id -> {kind, id, ev, deadline}
    this.log = [];
  }

  /** Returns {ack:boolean, status} ; ack only after durable handling (RO-2: here in-memory). */
  receive(ev) {
    const v = this.validateEvent(ev);
    if (!v.ok) { this.quarantine.push({ ev, why: 'schema', errors: v.errors }); this.alert('schema_invalid', ev); return { ack: false, status: 'quarantined_schema' }; }
    const s = verifyLcsig(ev, this.manifest, this.cfg.lifecycleEnv);
    if (!s.ok) { this.quarantine.push({ ev, why: s.why }); this.alert('signature_invalid', ev); return { ack: false, status: `quarantined_${s.why}` }; }
    const key = `${ev.source}|${ev.id}`;
    if (this.seen.has(key)) return { ack: true, status: 'duplicate' }; // RO-3
    const part = ev.partitionkey;
    const seq = BigInt(ev.sequence);
    const last = this.lastSeq.get(part) ?? 0n;
    if (seq <= last) return { ack: true, status: 'duplicate_seq' }; // RO-4
    if (seq !== last + 1n) { // gap -> hold (RO-4)
      if (!this.held.has(part)) this.held.set(part, new Map());
      this.held.get(part).set(seq, ev);
      return { ack: true, status: 'held_gap' };
    }
    this.process(ev, s.payload);
    this.seen.add(key); this.lastSeq.set(part, seq);
    // drain held
    const h = this.held.get(part);
    while (h && h.has(this.lastSeq.get(part) + 1n)) {
      const n = this.lastSeq.get(part) + 1n; const e2 = h.get(n); h.delete(n);
      const s2 = verifyLcsig(e2, this.manifest, this.cfg.lifecycleEnv);
      this.process(e2, s2.payload); this.seen.add(`${e2.source}|${e2.id}`); this.lastSeq.set(part, n);
    }
    return { ack: true, status: 'processed' };
  }

  gaps() { return [...this.held.entries()].filter(([, m]) => m.size).map(([p]) => ({ partition: p, from: (this.lastSeq.get(p) ?? 0n) + 1n })); }

  process(ev, signed) {
    const d = signed.data; // use the signed payload values, not the envelope (PO-13)
    switch (signed.type) {
      case t('tenant.suspended'): this.store.suspendTenant(d.tid); break; // RO-6 / §2
      case t('tenant.resumed'): this.store.resumeTenant(d.tid); break;
      case t('membership.suspended'):
      case t('membership.removed'): this.store.suspendMember(d.tid, d.sub); break; // stop async work; data via RO-12
      case t('user.suspended'): this.store.suspendPrincipal(d.sub); break;
      case t('tenant.deletion.requested'):
      case t('user.deletion.requested'): {
        const kind = signed.type.includes('tenant.') ? 'tenant' : 'principal';
        this.store.markForDeletion(kind, kind === 'tenant' ? d.tid : d.sub); // reversible preparation only (RO-13)
        this.pendingDeletes.set(d.request_id, { kind, id: kind === 'tenant' ? d.tid : d.sub, ev, data: d, graceUntil: Date.now() + this.cfg.lifecycleGraceMs });
        break;
      }
      case t('tenant.deletion.withdrawn'):
      case t('user.deletion.withdrawn'): {
        const p = this.pendingDeletes.get(d.request_id);
        if (p) { this.store.unmarkForDeletion(p.kind, p.id); this.pendingDeletes.delete(d.request_id); }
        this.sendReport(this.report(ev, d.request_id, signed.type.replace('withdrawn', 'requested'), 'withdrawn'));
        break;
      }
      default:
        this.log.push({ ignored: signed.type }); // RO-5: unknown / unhandled types are accepted and ignored
    }
  }

  report(ev, requestId, requestType, outcome, extra = {}) {
    const r = {
      specversion: '1.0', id: crypto.randomUUID(), source: this.cfg.workloadId,
      type: t('deletion.report'), time: new Date().toISOString(), datacontenttype: 'application/json',
      dataschema: 'https://contracts.id-domain.example/schemas/lifecycle-event/v1/lifecycle-event.schema.json',
      partitionkey: requestId,
      data: { request_id: requestId, request_type: requestType, outcome, completed_at: new Date().toISOString(), stores: ['expense_db'], ...extra },
    };
    const v = this.validateReport(r);
    if (!v.ok) throw new Error('own DeletionReport does not conform: ' + JSON.stringify(v.errors));
    return r;
  }

  /** Called when the grace period has elapsed (RO-13), then RO-12 / CON-15 QC-1..QC-4. */
  async executeDueDeletions(now = Date.now()) {
    const out = [];
    for (const [requestId, p] of this.pendingDeletes) {
      if (now < p.graceUntil) continue;
      const reqBody = {
        action: p.kind === 'tenant' ? 'delete_tenant_data' : 'delete_principal_data',
        event: { id: p.ev.id, source: p.ev.source, type: p.ev.type, sequence: p.ev.sequence },
        request_id: requestId,
        ...(p.kind === 'tenant' ? { tid: p.id } : { sub: p.id }),
      };
      const r = await this.queryClient.verify(reqBody);
      let outcome;
      if (r.kind === 'proceed' && r.result.target.id === p.id) {
        const n = this.store.deleteData(p.kind, p.id);
        outcome = this.report(p.ev, requestId, p.ev.type, 'completed', { affected_count: n });
        this.pendingDeletes.delete(requestId);
      } else if (r.kind === 'proceed') { // generic mock answered about another target
        outcome = this.report(p.ev, requestId, p.ev.type, 'failed', { failure_reason: 'source_of_truth_mismatch' });
        this.alert('target_mismatch', p.ev); this.pendingDeletes.delete(requestId);
      } else if (r.kind === 'do_not_proceed' && r.result.reason_code === 'LQ02') {
        this.store.unmarkForDeletion(p.kind, p.id);
        outcome = this.report(p.ev, requestId, p.ev.type, 'withdrawn'); this.pendingDeletes.delete(requestId);
      } else if (r.kind === 'do_not_proceed' && r.result.reason_code === 'LQ08') {
        p.graceUntil = Date.parse(r.result.grace_until) || now + 1000; continue; // re-query later (QC-3)
      } else if (r.kind === 'unavailable' || (r.kind === 'do_not_proceed' && r.result.reason_code === 'LQ11')) {
        out.push({ requestId, held: true, why: r.why || 'LQ11' }); continue; // QC-4: hold, retry until deadline
      } else {
        outcome = this.report(p.ev, requestId, p.ev.type, 'failed', { failure_reason: 'source_of_truth_mismatch' });
        this.alert('source_of_truth_mismatch', p.ev); this.pendingDeletes.delete(requestId);
      }
      this.sendReport(outcome);
      out.push({ requestId, outcome: outcome.data.outcome });
    }
    return out;
  }
}

/** CON-15 verifyLifecycleAction client with QC-2 fail-closed interpretation. */
export class StateQueryClient {
  constructor(cfg, validateResult) { this.cfg = cfg; this.validateResult = validateResult; this.calls = []; }
  async verify(body) {
    this.calls.push(body);
    try {
      const r = await fetch(new URL('/v1/lifecycle/verifications', this.cfg.lifecycleStateQueryUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.cfg.pdpDeadlineMs * 10) });
      if ([429, 503].includes(r.status)) return { kind: 'unavailable', why: `http_${r.status}`, retryAfter: r.headers.get('retry-after') };
      if (r.status !== 200) return { kind: 'error', why: `http_${r.status}` };
      const j = await r.json().catch(() => null);
      const v = this.validateResult(j);
      if (!v.ok) return { kind: 'error', why: 'schema', errors: v.errors };
      // LQN-17 consistency checks
      if (j.verdict === 'proceed' && j.reason_code !== 'LQ00') return { kind: 'error', why: 'inconsistent_verdict' };
      if (j.reason_code === 'LQ08' && !j.grace_until) return { kind: 'error', why: 'lq08_without_grace_until' };
      if (j.verdict === 'proceed') return { kind: 'proceed', result: j };
      if (j.verdict === 'do_not_proceed') return { kind: 'do_not_proceed', result: j };
      return { kind: 'error', why: 'unknown_verdict' };
    } catch { return { kind: 'unavailable', why: 'network_or_timeout' }; }
  }
}
