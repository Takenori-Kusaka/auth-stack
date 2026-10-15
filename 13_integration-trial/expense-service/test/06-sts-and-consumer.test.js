// CR-3 (token exchange, Txn-Token) and the P-04 consumer of the approval notification.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { C, PRISM, startIdp, startPdpStub, buildApp, serve, call, fixtureReport, fixtureLines, listen, ISS_A, T1 } from './harness.js';
import { processOutbox } from '../src/consumer.js';

let idp, pdp;
before(async () => { idp = await startIdp(ISS_A); pdp = await startPdpStub(); });
after(async () => { await pdp.close(); await idp.close(); });

async function stsStub(status, body) {
  return listen(async (req, res) => { for await (const _ of req) void _; res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); });
}

for (const [label, status, body] of [
  ['N-09 unregistered pair -> 400 invalid_target (R06)', 400, { error: 'invalid_target' }],
  ['N-12 scope widening -> 400 invalid_scope (R07)', 400, { error: 'invalid_scope' }],
  ['N-08 unregistered SVID -> 401 invalid_client (R01)', 401, { error: 'invalid_client' }],
  ['STS unavailable -> 503', 503, { error: 'temporarily_unavailable' }],
]) {
  test(`CON-05 ${label}: approval succeeds locally but the downstream hand-over is NOT performed`, async () => {
    const s = await stsStub(status, body);
    const ctx = buildApp({ idp, pdpUrl: pdp.url, stsUrl: s.url }); fixtureLines(ctx.store);
    const base = await serve(ctx.app);
    const id = fixtureReport(ctx.store, { state: 'submitted' });
    const r = await call(base, 'POST', `/t/${T1}/expenses/${id}/approve`, idp.mint({ sub: 'u-manager' }), {});
    ctx.app.server.close(); await s.close();
    assert.equal(r.status, 200);
    assert.match(ctx.store.reports.get(id).payment, /^pending\(/);
  });
}

test('CON-05 profile (client side): request never carries actor_token / audience; resource exactly one', async () => {
  const ctx = buildApp({ idp, pdpUrl: pdp.url }); fixtureLines(ctx.store);
  const base = await serve(ctx.app);
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  await call(base, 'POST', `/t/${T1}/expenses/${id}/approve`, idp.mint({ sub: 'u-manager' }), {});
  ctx.app.server.close();
  const f = ctx.sts.calls.at(-1).form;
  for (const k of ['actor_token', 'actor_token_type', 'audience', 'authorization_details', 'requested_token_type']) assert.ok(!(k in f), k);
  assert.equal(typeof f.resource, 'string');
  assert.ok(C.oas('CON-05', 'AccessTokenExchangeRequest')(f).ok);
});

test('P-04 consumer via Prism TTS: static Txn-Token has no tctx -> dead letter (fail closed), no notification', async () => {
  const ctx = buildApp({ idp, pdpUrl: pdp.url }); fixtureLines(ctx.store);
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  ctx.store.outbox.push({ type: 'expense.approval_requested', id: 'm1', tid: T1, report_id: id, recipient_sub: 'u-manager', origin_sub: 'u-requester', job_run_id: 'jr_9fK2mQ7xL0pV3sT8' });
  const sent = [];
  const out = await processOutbox({ ...ctx, notifier: (n) => sent.push(n) });
  assert.equal(out[0].outcome, 'dead_letter'); assert.equal(sent.length, 0);
  const f = ctx.sts.calls.at(-1).form;
  const v = C.oas('CON-05', 'TxnTokenRequest')(f);
  assert.ok(v.ok, JSON.stringify(v.errors));
});

async function ttsStub(tid) {
  const tok = `eyJhbGciOiJFUzI1NiIsInR5cCI6InR4bnRva2VuK2p3dCJ9.${Buffer.from(JSON.stringify({ txn: 'x1t2r3a4n5s6a7c8t9i0o1n2id', tctx: { tid } })).toString('base64url')}.c2ln`;
  return listen(async (req, res) => { for await (const _ of req) void _; res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ access_token: tok, issued_token_type: 'urn:ietf:params:oauth:token-type:txn_token', token_type: 'N_A', expires_in: 60 })); });
}

test('P-04 with tctx-bearing TTS stub: re-authorized at execution -> sent; revoked in between -> dead letter (NP04-1)', async () => {
  const tts = await ttsStub(T1);
  const ctx = buildApp({ idp, pdpUrl: pdp.url, ttsUrl: tts.url }); fixtureLines(ctx.store);
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  const msg = (n) => ({ type: 'expense.approval_requested', id: n, tid: T1, report_id: id, recipient_sub: 'u-manager', origin_sub: 'u-requester', job_run_id: 'jr_x' });
  const sent = [];
  ctx.store.outbox.push(msg('m1'));
  let out = await processOutbox({ ...ctx, notifier: (n) => sent.push(n) });
  assert.equal(out[0].outcome, 'sent');
  assert.equal(pdp.state.calls.at(-1).headers['txn-token'] !== undefined, true);
  pdp.state.mode = 'deny'; ctx.store.outbox.push(msg('m2'));
  out = await processOutbox({ ...ctx, notifier: (n) => sent.push(n) });
  pdp.state.mode = 'allow';
  assert.equal(out[0].outcome, 'dead_letter'); assert.equal(sent.length, 1);
  await tts.close();
});

test('NP04-2 message tid tampered (≠ tctx.tid / resource tid) -> dead letter', async () => {
  const tts = await ttsStub(T1);
  const ctx = buildApp({ idp, pdpUrl: pdp.url, ttsUrl: tts.url });
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  ctx.store.outbox.push({ type: 'expense.approval_requested', id: 'm3', tid: 'mfrggzdfmztwq2lknnwg23tpob', report_id: id, recipient_sub: 'u-manager', origin_sub: 'u-requester', job_run_id: 'jr_y' });
  const out = await processOutbox({ ...ctx, notifier: () => {} });
  assert.equal(out[0].outcome, 'dead_letter');
  await tts.close();
});

test('PDP unavailable at execution -> message kept for retry (not silently dropped, not run)', async () => {
  const tts = await ttsStub(T1);
  const ctx = buildApp({ idp, pdpUrl: pdp.url, ttsUrl: tts.url });
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  ctx.store.outbox.push({ type: 'expense.approval_requested', id: 'm4', tid: T1, report_id: id, recipient_sub: 'u-manager', origin_sub: 'u-requester', job_run_id: 'jr_z' });
  pdp.state.mode = 'engine_unreachable';
  const out = await processOutbox({ ...ctx, notifier: () => { throw new Error('must not send'); } });
  pdp.state.mode = 'allow';
  assert.equal(out[0].outcome, 'retry_later'); assert.equal(ctx.store.outbox.length, 1);
  await tts.close();
});

test('tenant.suspended (via lifecycle) stops async notification work', async () => {
  const ctx = buildApp({ idp, pdpUrl: pdp.url });
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  ctx.store.suspendTenant(T1);
  ctx.store.outbox.push({ type: 'expense.approval_requested', id: 'm5', tid: T1, report_id: id, recipient_sub: 'u-manager', origin_sub: 'u-requester', job_run_id: 'jr_w' });
  const out = await processOutbox({ ...ctx, notifier: () => { throw new Error('must not send'); } });
  assert.equal(out[0].outcome, 'dead_letter');
});
void PRISM;
