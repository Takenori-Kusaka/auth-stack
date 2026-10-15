// EP-RSV-06: reminder consumer (P-04 + INT-02 §3.9 BN-1..BN-9). Runs as its own entry point with its own PEP steps:
// internal-start Txn-Token from the TTS (CON-05) -> three-way tenant match -> business/lifecycle state -> re-check
// with the ORIGIN subject -> minimal in-app notification. Deny / no decision -> dead letter + audit (never silent).
import { verifyTxnToken } from './token.js';

const INTERNAL_START_TYPE = 'urn:uuid:569d2793-a1dc-493e-a1ef-ca2904f77173'; // CON-05 v1.1 (I-9)

export class ReminderConsumer {
  constructor(cfg, pep, store) { this.cfg = cfg; this.pep = pep; this.store = store; this.ep = pep.ep('EP-RSV-06'); }

  async requestTxnToken(jobRunId) {
    const form = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requested_token_type: 'urn:ietf:params:oauth:token-type:txn_token',
      audience: this.cfg.tts.audience, scope: 'rsv.reminder.v1', subject_token: jobRunId, subject_token_type: INTERNAL_START_TYPE,
    });
    try {
      const r = await fetch(`${this.cfg.tts.url}/txn-token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form, signal: AbortSignal.timeout(1000) });
      if (r.status !== 200) return { fail: `tts_${r.status}` };
      const j = await r.json();
      if (j.issued_token_type !== 'urn:ietf:params:oauth:token-type:txn_token' || typeof j.access_token !== 'string') return { fail: 'tts_response' };
      return { token: j.access_token };
    } catch { return { fail: 'tts_unreachable' }; }
  }

  deadLetter(msg, why) { this.store.deadLetters.push({ msg_id: msg.id, why }); }

  async processOne(msg) {
    const ep = this.ep;
    const t = await this.requestTxnToken(msg.job_run_id);
    if (t.fail) { this.deadLetter(msg, t.fail); return { outcome: 'retry_later', why: t.fail }; }  // backoff, not silent
    const v = await verifyTxnToken(t.token, this.cfg, this.pep.ttsKeys, null);   // EN-3: verify before reading
    if (!v.ok) {
      await this.pep.audit.emit({ ep: ep.id, tier: ep.tier, tid: msg.tid, action: ep.action, result: 'denied', noDecisionCause: 'token_invalid', reasonCode: 'deny_token', txn: { invalid: true } });
      this.deadLetter(msg, v.reason); return { outcome: 'dead_letter', why: v.reason };
    }
    const txn = v.txn;
    if (txn.tctx.ptxn && txn.tctx.ptxn !== msg.origin_txn) { this.deadLetter(msg, 'ptxn_mismatch'); return { outcome: 'dead_letter', why: 'ptxn_mismatch' }; }
    // three-way: message tid (reference only), tctx.tid (from ledger), resource-derived tid
    const booking = this.store.bookings.get(msg.resource_id);
    const tRes = booking ? booking.tid : 'NOT_FOUND';
    if (msg.tid !== txn.tctx.tid || tRes !== txn.tctx.tid) {
      await this.pep.audit.emit({ ep: ep.id, tier: ep.tier, tid: txn.tctx.tid, resource: { type: 'rsv/booking', id: msg.resource_id }, action: ep.action, result: 'denied', noDecisionCause: 'l0_reject', reasonCode: 'deny_l0:mismatch', txn });
      this.deadLetter(msg, 'l0_mismatch'); return { outcome: 'dead_letter', why: 'l0_mismatch' };
    }
    const tid = txn.tctx.tid;
    // BN-4: business state and lifecycle (tenant suspended / booking cancelled) -> do not send
    if (booking.status !== 'active') return { outcome: 'skipped', why: 'cancelled' };
    if (this.store.tenantState.get(tid) === 'suspended') return { outcome: 'skipped', why: 'tenant_suspended' };
    // BN-3: re-check with the ORIGIN subject and the verb that caused the notification (book on the room).
    // The Txn-Token carries no principal type, so subject.type comes from the stored subject_type column (N-19).
    if (txn.sub !== booking.organizer.id) { this.deadLetter(msg, 'origin_subject_mismatch'); return { outcome: 'dead_letter', why: 'origin_subject_mismatch' }; }
    const subject = { type: booking.organizer.type, id: txn.sub, properties: { tid } };
    const d = await this.pep.pdp.evaluate({ subject, action: 'book', resource: { type: 'rsv/room', id: booking.roomId, properties: { tid } }, tier: ep.tier, txn, txnToken: txn.raw });
    if (d.noDecision || !d.allow) {
      await this.pep.audit.emit({ ep: ep.id, tier: ep.tier, tid, resource: { type: 'rsv/room', id: booking.roomId }, action: 'book', result: 'denied', decision: d.decisionId ? d : null, noDecisionCause: d.decisionId ? undefined : d.noDecision, reasonCode: d.noDecision ? 'deny_failmode' : d.reason, txn });
      this.deadLetter(msg, d.noDecision ? 'no_decision' : 'denied'); return { outcome: 'dead_letter', why: d.noDecision ?? 'denied' };
    }
    await this.pep.audit.emit({ ep: ep.id, tier: ep.tier, tid, resource: { type: 'rsv/room', id: booking.roomId }, action: 'book', result: 'permitted', decision: d, reasonCode: d.reason, txn, requestId: d.requestId });
    // BN-5/BN-6/BN-7: in-app only, minimal body, plain screen URL, no contact data, no token
    for (const sub of msg.recipients) {
      const key = `${msg.id}:${sub}`;                 // BN-8 idempotency
      if (this.store.sentLog.some((s) => s.key === key)) continue;
      this.store.notifications.push({ tid, to_sub: sub, kind: 'booking_reminder', ref: booking.id, url: `/bookings/${booking.id}` });
      this.store.sentLog.push({ key, kind: 'booking_reminder', resource_id: booking.id, origin_txn: msg.origin_txn, result: 'sent' });
    }
    return { outcome: 'sent' };
  }

  async runDue(nowIso) {
    const due = this.store.outbox.filter((m) => !m.done && m.due_at <= nowIso);
    const results = [];
    for (const m of due) { const r = await this.processOne(m); if (r.outcome !== 'retry_later') m.done = true; results.push(r); }
    return results;
  }
}
