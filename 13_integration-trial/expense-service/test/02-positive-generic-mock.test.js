// Positive-path integration against the generic mocks started from 11_contracts (Prism 5.12.0).
// Outgoing requests are validated against the contract request schemas (CON-11 §8 step 4, self-run).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { C, PRISM, startIdp, startEchoShim, buildApp, serve, call, fixtureLines, ISS_A, T1 } from './harness.js';

let idp, shim, ctx, base;
before(async () => {
  idp = await startIdp(ISS_A);
  shim = await startEchoShim(PRISM.pdp, { upgradeConsistency: true });
  process.env.PAYMENT_SCOPE = 'invoice.read'; // the only scope the static CON-05 example returns
  ctx = buildApp({ idp, pdpUrl: shim.url });
  fixtureLines(ctx.store);
  base = await serve(ctx.app);
});
after(async () => { ctx.app.server.close(); await shim.close(); await idp.close(); });

test('OBSERVATION: raw Prism (no shim) cannot satisfy the X-Request-ID echo rule -> PEP fails closed (503)', async () => {
  const raw = buildApp({ idp, pdpUrl: PRISM.pdp });
  const b = await serve(raw.app);
  const r = await call(b, 'POST', `/t/${T1}/expenses`, idp.mint(), { amount: 1200, unit_id: 'unit-sales' });
  raw.app.server.close();
  assert.equal(r.status, 503);
  assert.ok(raw.logs.some((l) => l.why === 'request_id_mismatch'), JSON.stringify(raw.logs));
});

test('OBSERVATION: Prism + echo only (W-1) still fails closed on write: static allow example is at_least_as_fresh', async () => {
  const s1 = await startEchoShim(PRISM.pdp);
  const a = buildApp({ idp, pdpUrl: s1.url });
  const b = await serve(a.app);
  const r = await call(b, 'POST', `/t/${T1}/expenses`, idp.mint(), { amount: 1200, unit_id: 'unit-sales' });
  a.app.server.close(); await s1.close();
  assert.equal(r.status, 503);
  assert.ok(a.logs.some((l) => l.why === 'consistency_downgraded'), JSON.stringify(a.logs));
});

test('OBSERVATION: PDP metadata policy_decision_point does not match the mock base URL (MUST NOT use)', async () => {
  const r = await fetch(`${PRISM.pdp}/.well-known/authzen-configuration`);
  const j = await r.json();
  assert.notEqual(j.policy_decision_point, PRISM.pdp);
  assert.ok(C.oas('CON-03', 'PdpMetadata')(j).ok);
});

let reportId;
test('create (P-01 entry point, write): evaluateAccess + writeRelationships through mocks -> 201', async () => {
  const r = await call(base, 'POST', `/t/${T1}/expenses`, idp.mint(), { amount: 150000, unit_id: 'unit-sales', description: 'flight' });
  assert.equal(r.status, 201, r.text);
  reportId = r.json.id;
  const ev = ctx.pdp.calls.at(-1);
  assert.equal(ev.path, '/access/v1/evaluation');
  assert.ok(C.oas('CON-03', 'EvaluationRequest')(ev.body).ok, JSON.stringify(C.oas('CON-03', 'EvaluationRequest')(ev.body).errors));
  assert.equal(ev.body.context['x-authz-profile'].consistency.mode, 'fully_consistent');
  const w = ctx.registry.calls.at(-1);
  const body = { writes: w.writes, idempotency_key: '6f1c2b7e-2d1a-4c55-9a7e-0b5d3f1e9a21' };
  const v = C.oas('CON-04', 'WriteRelationshipsRequest')(body);
  assert.ok(v.ok, JSON.stringify(v.errors));
});

test('view (read-sensitive): consistency at_least_as_fresh with the stored consistency token', async () => {
  const r = await call(base, 'GET', `/t/${T1}/expenses/${reportId}`, idp.mint());
  assert.equal(r.status, 200, r.text);
  const ev = ctx.pdp.calls.at(-1);
  assert.equal(ev.body.context['x-authz-profile'].consistency.mode, 'at_least_as_fresh');
  assert.ok(ev.body.context['x-authz-profile'].consistency.token);
  assert.ok(C.oas('CON-03', 'EvaluationRequest')(ev.body).ok);
});

test('submit -> approver tuple written, approval notification enqueued (P-24, references only)', async () => {
  const r = await call(base, 'POST', `/t/${T1}/expenses/${reportId}/submit`, idp.mint());
  assert.equal(r.status, 200, r.text);
  const msg = ctx.store.outbox.at(-1);
  assert.equal(msg.recipient_sub, 'u-manager');
  assert.deepEqual(Object.keys(msg).sort(), ['id', 'job_run_id', 'origin_sub', 'origin_txn', 'recipient_sub', 'report_id', 'tid', 'type']);
});

test('approve stage 1 by manager, stage 2 by director (amount > threshold), then token exchange to payment (P-03)', async () => {
  // a Txn-Token-shaped value (the edge would add it in reality; no TTS discovery/JWKS exists in the contracts)
  const txn = `eyJhbGciOiJFUzI1NiIsInR5cCI6InR4bnRva2VuK2p3dCJ9.${Buffer.from(JSON.stringify({ txn: 'x1t2r3a4n5s6a7c8t9i0o1n2id' })).toString('base64url')}.c2ln`;
  let r = await call(base, 'POST', `/t/${T1}/expenses/${reportId}/approve`, idp.mint({ sub: 'u-manager' }), {}, { 'txn-token': txn });
  assert.equal(r.status, 200, r.text);
  assert.equal(ctx.pdp.calls.at(-1).headers['txn-token'], txn, 'Txn-Token forwarded unmodified to PDP');
  assert.equal(ctx.store.reports.get(reportId).stage, 1);
  r = await call(base, 'POST', `/t/${T1}/expenses/${reportId}/approve`, idp.mint({ sub: 'u-director' }), { content_hash: r.json.content_hash });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.state, 'approved');
  const ex = ctx.sts.calls.at(-1);
  assert.equal(ex.op, 'exchangeToken');
  const v = C.oas('CON-05', 'AccessTokenExchangeRequest')(ex.form);
  assert.ok(v.ok, JSON.stringify(v.errors));
  assert.ok(!('actor_token' in ex.form) && !('audience' in ex.form));
  assert.notEqual(ex.form.subject_token, undefined);
  assert.equal(ctx.store.reports.get(reportId).payment, 'handed_over');
});

test('list (P-09): candidates from domain index, post-check with evaluateAccessBatch execute_all', async () => {
  // Prism's static example returns 2 decisions for any batch: send a page of exactly 2 to get an "ok" batch.
  ctx.store.reports.set('zzzz-extra', { id: 'zzzz-extra', tid: T1, requester: 'u-requester', unit: 'unit-sales', amount: 1, description: '', state: 'draft', approvals: [] });
  const r = await call(base, 'GET', `/t/${T1}/expenses?limit=2`, idp.mint());
  assert.equal(r.status, 200, r.text);
  const ev = ctx.pdp.calls.at(-1);
  assert.equal(ev.path, '/access/v1/evaluations');
  const v = C.oas('CON-03', 'EvaluationsRequest')(ev.body);
  assert.ok(v.ok, JSON.stringify(v.errors));
  assert.equal(r.json.items.length, 1, 'only the allow item is returned (Prism example: [allow, deny_indeterminate])');
  assert.equal(r.json.completeness.status, 'incomplete');
  assert.ok(!('total' in r.json) && !('count' in r.json), 'NP09-2: no total count');
});

test('OBSERVATION: Prism evaluations always returns 2 items -> a 3-item page fails closed (503, never an empty list)', async () => {
  ctx.store.reports.set('zzzz-extra2', { id: 'zzzz-extra2', tid: T1, requester: 'u-requester', unit: 'unit-sales', amount: 1, description: '', state: 'draft', approvals: [] });
  const r = await call(base, 'GET', `/t/${T1}/expenses?limit=3`, idp.mint());
  assert.equal(r.status, 503);
});

test('searchResources (preview) as candidate generator: request conforms, x-constraint of completeness checked', async () => {
  const r = await ctx.pdp.searchCandidates({ subject: { type: 'core/user', id: 'u-requester', properties: { tid: T1 } }, action: { name: 'view' }, resourceType: 'expense/report', tid: T1, limit: 20 });
  const sent = ctx.pdp.calls.at(-1).body;
  assert.ok(C.oas('CON-03', 'ResourceSearchRequest')(sent).ok, JSON.stringify(C.oas('CON-03', 'ResourceSearchRequest')(sent).errors));
  assert.equal(r.kind, 'ok');
  // the mock returns docs/document results for an expense/report query: candidates must still be post-checked
  assert.ok(r.results.every((x) => x.type !== 'expense/report'));
});

test('audit: pep.enforce events conform to CON-08, except write events without a Txn-Token (no txn available)', () => {
  assert.ok(ctx.audit.events.length >= 5);
  const bad = [];
  for (const e of ctx.audit.events) {
    const v = C.con08(e);
    if (!v.ok) bad.push({ action: e.action.name, tier: e.tier, hasTxn: !!e.corr.txn, missing: v.errors.filter((x) => x.keyword === 'required').map((x) => x.params.missingProperty) });
  }
  // every invalid event is a write without txn (create/submit/stage-2 approve were called without Txn-Token)
  assert.ok(bad.length > 0 && bad.every((b) => b.tier === 'write' && !b.hasTxn && b.missing.length === 1 && b.missing[0] === 'txn'), JSON.stringify(bad));
  console.log('# audit events', ctx.audit.events.length, 'invalid(write w/o txn)', bad.length);
});
