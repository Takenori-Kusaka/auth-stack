// CR-9 lifecycle receiver: CON-12 RO-1..RO-13 (subset), CON-13 examples and LC-NE-*, CON-15 QC-1..QC-4 and LQN-*.
// MK-08 does not exist; events are injected binding-free (CON-11 §16.2 7a). Positive signature tests use our own
// key (CON-13's lcsig is a dummy; INT-00 §6.1). CON-15 positive path uses the Prism mock of the extracted CON-15.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { C, PRISM, genEc, sign, listen } from './harness.js';
import { LifecycleReceiver, StaticKeyManifest, StateQueryClient } from '../src/lifecycle.js';
import { Store } from '../src/app.js';

const ISS = 'https://lifecycle-publisher.trial.invalid/p/q8v3k2';
const kp = genEc();
const manifest = new StaticKeyManifest([{ iss: ISS, typ: 'lifecycle-event+jws', kid: 'k7m2qx4vd9', alg: 'ES256', jwk: kp.publicKey.export({ format: 'jwk' }) }]);
const ex = Object.fromEntries(C.docs['CON-13'].examples.map((e) => [e.type.replace('example.id-domain.lifecycle.', ''), e]));

function resign(ev, { key = kp.privateKey, env = 'trial', iss = ISS, alg = 'ES256', tamper } = {}) {
  const e = structuredClone(ev);
  const payload = { id: e.id, source: e.source, type: e.type, specversion: e.specversion, sequence: e.sequence, partitionkey: e.partitionkey, time: e.time, dataschema: e.dataschema, data: e.data, iss, env };
  if (tamper) Object.assign(payload, tamper);
  e.lcsig = sign({ alg, kid: 'k7m2qx4vd9', typ: 'lifecycle-event+jws' }, payload, key, alg);
  return e;
}
function at(ev, seq, over = {}) { return resign({ ...structuredClone(ev), id: crypto.randomUUID().replace(/-/g, '').slice(0, 26), sequence: String(seq).padStart(20, '0'), ...over }); }

function mkReceiver(queryUrl = PRISM.query) {
  const reports = []; const alerts = []; const store = new Store();
  const cfg = { lifecycleEnv: 'trial', lifecycleGraceMs: 0, lifecycleStateQueryUrl: queryUrl, pdpDeadlineMs: 300, workloadId: 'spiffe://sandbox.invalid/ns/expense/sa/api' };
  const rx = new LifecycleReceiver({
    validateEvent: C.con13, validateReport: C.con13def('DeletionReport'), manifest, cfg, store,
    queryClient: new StateQueryClient(cfg, C.oas('CON-15', 'VerificationResult')),
    sendReport: (r) => reports.push(r), alert: (why, ev) => alerts.push({ why, id: ev.id }),
  });
  return { rx, reports, alerts, store };
}

test('CON-13 examples as-is (dummy lcsig) are quarantined, not processed (RO-11; INT-00 §6.1 "正例 lcsig はダミー")', () => {
  const { rx, alerts } = mkReceiver();
  const r = rx.receive(ex['tenant.suspended']);
  assert.equal(r.ack, false); assert.match(r.status, /quarantined_/); assert.equal(alerts.length, 1);
});

test('LC-NE-01..11: every negative is rejected (schema) before any processing', () => {
  const { rx, store } = mkReceiver();
  for (const n of C.docs['CON-13']['x-negative-examples']) {
    const r = rx.receive(n.value);
    assert.equal(r.ack, false, n.id); assert.equal(r.status, 'quarantined_schema', n.id);
  }
  assert.equal(store.suspendedTenants.size, 0);
});

test('RO-11 own-key positive: re-signed tenant.suspended is processed; tenant is suspended', () => {
  const { rx, store } = mkReceiver();
  const tid = ex['tenant.suspended'].data.tid;
  // sequence must start at 1 for a fresh partition in this receiver
  const r = rx.receive(at(ex['tenant.suspended'], 1));
  assert.equal(r.status, 'processed'); assert.ok(store.suspendedTenants.has(tid));
});

test('RO-11 negatives with own key: wrong key / env / iss / payload tamper / alg none (non-empty sig) -> quarantined', () => {
  const { rx } = mkReceiver();
  const base = at(ex['tenant.suspended'], 1);
  const cases = {
    bad_signature: resign(base, { key: genEc().privateKey }),
    env_mismatch: resign(base, { env: 'prod' }),
    key_not_in_manifest: resign(base, { iss: 'https://other-publisher.trial.invalid/p/x' }),
    payload_mismatch_sequence: resign(base, { tamper: { sequence: '00000000000000000099' } }),
  };
  for (const [why, ev] of Object.entries(cases)) assert.equal(rx.receive(ev).status, `quarantined_${why}`, why);
  const none = structuredClone(base); const [h, p] = base.lcsig.split('.');
  none.lcsig = `${Buffer.from(JSON.stringify({ alg: 'none', kid: 'k7m2qx4vd9', typ: 'lifecycle-event+jws' })).toString('base64url')}.${p}.AAAA`;
  assert.equal(rx.receive(none).status, 'quarantined_alg_none'); void h;
});

test('RO-3/RO-4: duplicate (source,id) acked once; gap held then drained in order', () => {
  const { rx, store } = mkReceiver();
  const e1 = at(ex['tenant.suspended'], 1);
  assert.equal(rx.receive(e1).status, 'processed');
  assert.equal(rx.receive(e1).status, 'duplicate');
  const e3 = at(ex['membership.suspended'], 3);
  assert.equal(rx.receive(e3).status, 'held_gap');
  assert.deepEqual(rx.gaps().map((g) => g.from), [2n]);
  const e2 = at(ex['tenant.future_event'], 2);
  assert.equal(rx.receive(e2).status, 'processed');
  assert.ok(store.suspendedMembers.size === 1, 'held seq 3 drained after 2');
});

test('RO-5: unknown type (tenant.future_event) accepted and ignored, sequence advances', () => {
  const { rx } = mkReceiver();
  const r = rx.receive(at(ex['tenant.future_event'], 1));
  assert.equal(r.status, 'processed'); assert.deepEqual(rx.log.at(-1), { ignored: 'example.id-domain.lifecycle.tenant.future_event' });
});

test('RO-13: tenant.deletion.withdrawn is a KNOWN type -> outcome=withdrawn report (conforms to DeletionReport)', () => {
  const { rx, reports } = mkReceiver();
  rx.receive(at(ex['tenant.deletion.withdrawn'], 1));
  assert.equal(reports.length, 1); assert.equal(reports[0].data.outcome, 'withdrawn');
  assert.ok(C.con13def('DeletionReport')(reports[0]).ok);
});

test('RO-12/RO-13 + CON-15 via Prism: user.deletion.requested -> grace -> verifyLifecycleAction', async () => {
  const { rx, reports, store, alerts } = mkReceiver();
  const ev = at(ex['user.deletion.requested'], 1);
  store.reports.set('x', { id: 'x', tid: 't', requester: ev.data.sub, amount: 1 });
  rx.receive(ev);
  assert.ok(store.deletionMarks.has(`principal|${ev.data.sub}`), 'reversible preparation only');
  assert.ok(store.reports.has('x'), 'not deleted before verification');
  const out = await rx.executeDueDeletions();
  const sent = rx.queryClient.calls.at(-1);
  assert.ok(C.oas('CON-15', 'VerificationRequest')(sent).ok, JSON.stringify(C.oas('CON-15', 'VerificationRequest')(sent).errors));
  // The static Prism answer is "proceed" for target tenant t5wq... (not our principal) -> must NOT delete
  assert.equal(out[0].outcome, 'failed'); assert.ok(store.reports.has('x'));
  assert.equal(reports[0].data.failure_reason, 'source_of_truth_mismatch'); assert.equal(alerts.at(-1).why, 'target_mismatch');
  assert.ok(C.con13def('DeletionReport')(reports[0]).ok);
});

async function queryStub(result, status = 200, headers = {}) {
  return listen(async (req, res) => { for await (const _ of req) void _; res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }); res.end(typeof result === 'string' ? result : JSON.stringify(result)); });
}
const vr = (over) => ({ verification_id: 'vq9k2m4x7hd3ta6pnr2bw7cyz1', verdict: 'proceed', reason_code: 'LQ00', checked_at: '2026-10-15T03:00:05Z', authoritative_as_of: '2026-10-15T03:00:05Z', target: { kind: 'principal', id: ex['user.deletion.requested'].data.sub, state: 'D' }, request_status: 'executable', hold_status: 'not_applicable', mapping_status: 'not_applicable', partition_last_sequence: '00000000000000000001', ...over });

async function runWith(result, status, headers) {
  const s = await queryStub(result, status, headers);
  const k = mkReceiver(s.url);
  const ev = at(ex['user.deletion.requested'], 1);
  k.store.reports.set('x', { id: 'x', tid: 't', requester: ev.data.sub, amount: 1 });
  k.rx.receive(ev);
  const out = await k.rx.executeDueDeletions();
  await s.close();
  return { ...k, out };
}

test('CON-15 proceed for our target -> delete and report completed (affected_count)', async () => {
  const { out, reports, store } = await runWith(vr({}));
  assert.equal(out[0].outcome, 'completed'); assert.equal(store.reports.size, 0);
  assert.equal(reports[0].data.affected_count, 1); assert.ok(C.con13def('DeletionReport')(reports[0]).ok);
});
test('LQN-03 do_not_proceed/LQ01 -> failed source_of_truth_mismatch, nothing deleted', async () => {
  const { out, reports, store } = await runWith(vr({ verdict: 'do_not_proceed', reason_code: 'LQ01', request_status: 'unknown' }));
  assert.equal(out[0].outcome, 'failed'); assert.equal(reports[0].data.failure_reason, 'source_of_truth_mismatch'); assert.equal(store.reports.size, 1);
});
test('LQN-04 do_not_proceed/LQ02 -> outcome=withdrawn', async () => {
  const { out } = await runWith(vr({ verdict: 'do_not_proceed', reason_code: 'LQ02', request_status: 'withdrawn' }));
  assert.equal(out[0].outcome, 'withdrawn');
});
test('LQN-07 LQ08 with grace_until -> re-query later, nothing reported', async () => {
  const { out, reports, store } = await runWith(vr({ verdict: 'do_not_proceed', reason_code: 'LQ08', request_status: 'in_grace', grace_until: '2099-01-01T00:00:00Z' }));
  assert.equal(out.length, 0); assert.equal(reports.length, 0); assert.equal(store.reports.size, 1);
});
test('LQN-12 503 + Retry-After -> held, nothing deleted', async () => {
  const { out, store } = await runWith({ type: 'about:blank', status: 503 }, 503, { 'retry-after': '120' });
  assert.equal(out[0].held, true); assert.equal(store.reports.size, 1);
});
test('LQN-13 unknown verdict / missing verdict -> not executed', async () => {
  for (const bad of [vr({ verdict: 'maybe' }), (() => { const x = vr({}); delete x.verdict; return x; })()]) {
    const { store } = await runWith(bad); assert.equal(store.reports.size, 1);
  }
});
test('LQN-17 proceed with LQ05, or LQ08 without grace_until -> not executed', async () => {
  for (const bad of [vr({ reason_code: 'LQ05' }), vr({ verdict: 'do_not_proceed', reason_code: 'LQ08' })]) {
    const { store } = await runWith(bad); assert.equal(store.reports.size, 1);
  }
});
test('LQN-18 LQ11 (stale read) -> held as unavailable', async () => {
  const { out, store } = await runWith(vr({ verdict: 'do_not_proceed', reason_code: 'LQ11', request_status: 'unknown' }));
  assert.equal(out[0].held, true); assert.equal(store.reports.size, 1);
});
