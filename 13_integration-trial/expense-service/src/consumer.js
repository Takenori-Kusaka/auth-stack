// P-04 consumer of the approval-notification message (P-24 producer is app.js enqueue()).
// Per message: internal-start Txn-Token from TTS (requestTxnToken, preview) -> three-way tid match
// (message tid, tctx.tid, resource-derived tid) -> re-authorize at execution time -> send or dead-letter.
export async function processOutbox({ store, sts, pdp, audit, cfg, notifier }) {
  const results = [];
  while (store.outbox.length) {
    const msg = store.outbox.shift();
    const report = store.reports.get(msg.report_id);
    const dead = (why) => { store.deadLetter.push({ msg, why }); results.push({ id: msg.id, outcome: 'dead_letter', why }); };
    if (!report) { dead('resource_gone'); continue; }
    if (store.suspendedTenants.has(msg.tid) || store.suspendedMembers.has(`${msg.tid}|${msg.recipient_sub}`) || store.suspendedPrincipals.has(msg.recipient_sub)) { dead('suspended'); continue; }
    const tx = await sts.requestTxnToken({ jobRunId: msg.job_run_id, audience: process.env.TTS_AUDIENCE || 'txn-td-c00', scope: 'op.expense.notify' });
    if (tx.kind !== 'ok') { store.outbox.push(msg); results.push({ id: msg.id, outcome: 'retry_later', why: tx.why }); break; } // backoff, do not run (D26-09)
    // tctx.tid: the Txn-Token is signed by TTS; TTS has no discovery/JWKS in the contracts (INT-00 §6.3) so the
    // signature cannot be verified here. We only read the claim and fail closed if it is absent or different.
    let tctxTid;
    try { tctxTid = JSON.parse(Buffer.from(tx.txnToken.split('.')[1], 'base64url')).tctx?.tid; } catch { tctxTid = undefined; }
    if (!tctxTid || tctxTid !== msg.tid || report.tid !== msg.tid) { dead('tenant_mismatch_or_missing_tctx'); continue; }
    const d = await pdp.evaluate({
      subject: { type: 'core/user', id: msg.recipient_sub, properties: { tid: msg.tid } },
      action: { name: 'approve' }, resource: { type: 'expense/report', id: report.id, properties: { tid: report.tid } },
      tier: 'write', txnToken: tx.txnToken,
    });
    audit.enforce({ tid: msg.tid, tier: 'write', sub: msg.recipient_sub, resourceType: 'expense/report', resourceId: report.id, action: 'approve', decisionId: d.decisionId, requestId: msg.id, traceId: '0'.repeat(31) + '1', reason: d.reason || 'deny_unavailable', entryPointId: 'expense:consume:approval_requested', result: d.kind === 'allow' ? 'allowed' : d.kind === 'deny' ? 'denied' : 'unavailable' });
    if (d.kind === 'allow') { notifier({ to: msg.recipient_sub, report_id: report.id }); results.push({ id: msg.id, outcome: 'sent' }); }
    else if (d.kind === 'deny') dead('denied_at_execution');
    else { store.outbox.push(msg); results.push({ id: msg.id, outcome: 'retry_later', why: d.why }); break; }
  }
  return results;
}
