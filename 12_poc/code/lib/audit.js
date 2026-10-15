// Audit producer SDK (ADR-014): builds audit-event.schema.json records, keeps the producer chain
// (L1: producer_seq + prev_fp, D14-29), sends them to the cell journal over mTLS and spools locally when the
// journal is unreachable. Spool limits per tier implement ADR-013 D13-25 (Q_r / Q_w; privileged requires a
// synchronous journal acknowledgement and is rejected when the journal is down).
import fs from 'node:fs';
import path from 'node:path';
import { request } from './http.js';
import { opaqueId, jtiRef, subjRef, resRef } from './ids.js';
import { fingerprint } from './canon.js';

export const SCHEMA_VER = '1.0.0-draft.1';
export const OCSF_MAP_VER = '1.9.0';
export const SDK_VER = '0.1.0';

function isoMs(d = new Date()) { return d.toISOString(); } // always 3-digit ms + Z

export class AuditProducer {
  /**
   * opts: { topo, secrets, workload (name), journalUrl, tls, stateDir, limits: { 'read-sensitive': n, write: n }, syncTimeoutMs }
   */
  constructor(opts) {
    this.topo = opts.topo;
    this.w = opts.topo.workloads[opts.workload];
    this.producerId = this.w.spiffeId;
    this.journalUrl = opts.journalUrl || `${opts.topo.urls.journal}/events`;
    this.tls = opts.tls;
    this.kCorr = Buffer.from(opts.secrets.kCorr, 'hex');
    this.kSubj = Buffer.from(opts.secrets.kSubj, 'hex');
    this.kRes = Buffer.from(opts.secrets.kRes, 'hex');
    this.limits = { 'read-sensitive': 1000, write: 200, privileged: 0, 'break-glass': 0, public: 1000, ...(opts.limits || {}) };
    this.syncTimeoutMs = opts.syncTimeoutMs || 1500;
    const dir = opts.stateDir || path.join(opts.topo.dataDir, 'audit-producers');
    fs.mkdirSync(dir, { recursive: true });
    this.stateFile = path.join(dir, `${opts.workload}.state.json`);
    this.spoolFile = path.join(dir, `${opts.workload}.spool.jsonl`);
    this.sentFile = path.join(dir, `${opts.workload}.produced.jsonl`); // producer-side issue log (seq, event_id, fp) for C1 reconciliation
    const st = fs.existsSync(this.stateFile) ? JSON.parse(fs.readFileSync(this.stateFile, 'utf8')) : { seq: 0, prevFp: null };
    this.seq = st.seq;
    this.prevFp = st.prevFp;
    this.spool = fs.existsSync(this.spoolFile) ? fs.readFileSync(this.spoolFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    this.journalUp = true;
    this.counters = { produced: 0, delivered: 0, spooled: 0, rejected: 0, redelivered: 0 };
    this.flushTimer = setInterval(() => this.flush().catch(() => {}), 500);
    this.flushTimer.unref();
  }

  // ---- helpers for correlation fields (ADR-014 D14-21, D14-09) ----
  jtiRef(iss, jti) { return jtiRef(this.kCorr, iss, jti); }
  subjRef(sub) { return subjRef(this.kSubj, sub); }
  resRef(type, id) { return resRef(this.kRes, type, id); }

  principal(ptype, sub, extra = {}) {
    if (ptype === 'human') return { type: 'human', subj_ref: this.subjRef(sub), ...extra };
    return { type: ptype, nhi_id: sub, ...extra };
  }

  /** Build a record (not yet chained). */
  build(f) {
    const now = isoMs();
    const rec = {
      schema_ver: SCHEMA_VER,
      ocsf_map_ver: OCSF_MAP_VER,
      record_stage: 'produced',
      event_id: opaqueId(),
      family: f.family,
      event_type: f.event_type,
      event_time: f.event_time || now,
      observed_time: now,
      integrity: null,
      cell_id: this.topo.cellId,
      jurisdiction: this.topo.jurisdiction,
      tid: f.tid,
      tier: f.tier,
      outcome: f.outcome,
      reason_code: f.reason_code,
      data_class: f.data_class || { base: 'CUS', labels: [] },
      corr: f.corr || {},
      detail: f.detail,
    };
    if (f.tier_sub) rec.tier_sub = f.tier_sub;
    for (const k of ['subject', 'actor', 'resource', 'action', 'purpose']) if (f[k]) rec[k] = f[k];
    // drop undefined in corr
    for (const k of Object.keys(rec.corr)) if (rec.corr[k] === undefined || rec.corr[k] === null) delete rec.corr[k];
    return rec;
  }

  chain(rec) {
    this.seq += 1;
    rec.integrity = {
      producer_id: this.producerId,
      producer_seq: this.seq,
      prev_fp: this.prevFp,
      producer_sdk_ver: SDK_VER,
    };
    const fp = fingerprint(rec);
    this.prevFp = fp;
    fs.writeFileSync(this.stateFile, JSON.stringify({ seq: this.seq, prevFp: this.prevFp }));
    fs.appendFileSync(this.sentFile, JSON.stringify({ seq: this.seq, event_id: rec.event_id, fp, t: rec.observed_time }) + '\n');
    this.counters.produced++;
    return rec;
  }

  async post(records) {
    const r = await request(this.journalUrl, { method: 'POST', body: { records }, tls: this.tls, timeoutMs: this.syncTimeoutMs });
    if (r.status !== 200) throw new Error(`journal status ${r.status}`);
    return r.json();
  }

  /**
   * Emit an event. Returns { ok, mode: 'delivered'|'spooled'|'rejected' }.
   * - tier privileged / break-glass: synchronous acknowledgement required (fail -> rejected, caller must deny)
   * - other tiers: try delivery; on failure spool up to limits[tier]; beyond -> rejected
   */
  async emit(fields, { sync } = {}) {
    const rec = this.chain(this.build(fields));
    const tier = fields.tier;
    const needSync = sync ?? (tier === 'privileged' || tier === 'break-glass');
    if (needSync) {
      try {
        await this.post([rec]);
        this.journalUp = true;
        this.counters.delivered++;
        return { ok: true, mode: 'delivered', record: rec };
      } catch {
        this.journalUp = false;
        // the record is chained already: keep it in the spool so the chain has no hole, but report rejection
        this.spoolAppend(rec);
        this.counters.rejected++;
        return { ok: false, mode: 'rejected', record: rec };
      }
    }
    if (this.journalUp && this.spool.length === 0) {
      try {
        await this.post([rec]);
        this.counters.delivered++;
        return { ok: true, mode: 'delivered', record: rec };
      } catch {
        this.journalUp = false;
      }
    }
    const limit = this.limits[tier] ?? 0;
    const spooledForTier = this.spool.filter((s) => s.tier === tier).length;
    this.spoolAppend(rec);
    if (spooledForTier >= limit) {
      this.counters.rejected++;
      return { ok: false, mode: 'rejected', record: rec };
    }
    this.counters.spooled++;
    return { ok: true, mode: 'spooled', record: rec };
  }

  spoolAppend(rec) {
    this.spool.push(rec);
    fs.appendFileSync(this.spoolFile, JSON.stringify(rec) + '\n');
  }

  async flush() {
    if (this.flushing || this.spool.length === 0) return;
    this.flushing = true;
    try {
      const batch = this.spool.slice(0, 200);
      await this.post(batch);
      this.spool = this.spool.slice(batch.length);
      fs.writeFileSync(this.spoolFile, this.spool.map((r) => JSON.stringify(r)).join('\n') + (this.spool.length ? '\n' : ''));
      this.counters.redelivered += batch.length;
      this.journalUp = true;
    } catch {
      this.journalUp = false;
    } finally {
      this.flushing = false;
    }
  }

  spoolSize(tier) { return tier ? this.spool.filter((s) => s.tier === tier).length : this.spool.length; }

  close() { clearInterval(this.flushTimer); }
}
