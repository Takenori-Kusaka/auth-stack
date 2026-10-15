// CV-012 (MK-03 16 injections, CON-11 §4.4) and CV-008 (cross-tenant, identical responses) for CR-1/CR-2.
// MK-03 does not exist yet: a programmable stub returning contract-shaped responses stands in (test-only).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startIdp, startPdpStub, startSlowAccept, buildApp, serve, call, fixtureReport, fixtureLines, ISS_A, T1, T2 } from './harness.js';

let idp, pdp, ctx, base, rid, ridT2;
before(async () => {
  idp = await startIdp(ISS_A); pdp = await startPdpStub();
  ctx = buildApp({ idp, pdpUrl: pdp.url, env: { AUTHZ_PDP_DEADLINE_MS: '300' } });
  fixtureLines(ctx.store);
  base = await serve(ctx.app);
  rid = fixtureReport(ctx.store, { state: 'submitted' });
  ridT2 = fixtureReport(ctx.store, { tid: T2 });
});
after(async () => { ctx.app.server.close(); await pdp.close(); await idp.close(); });

const view = () => call(base, 'GET', `/t/${T1}/expenses/${rid}`, idp.mint());
const approve = () => call(base, 'POST', `/t/${T1}/expenses/${rid}/approve`, idp.mint({ sub: 'u-manager' }), {});
const writeAllows = () => ctx.store.reports.get(rid).approvals.length;

const UNAVAILABLE = ['timeout', 'late_allow', 'body_delay', 'overload', 'quota', 'engine_unreachable', 'indeterminate', 'unsupported_profile', 'no_decision_id', 'request_id_mismatch', 'downgrade', 'unknown_reason'];
for (const mode of UNAVAILABLE) {
  test(`CV-012 ${mode}: read -> 503 + Retry-After, write -> 503, write allows = 0 (no fail-open)`, async () => {
    pdp.state.mode = mode; pdp.state.delayMs = 600; // > D(t)=300ms
    const r1 = await view(); const before = writeAllows(); const r2 = await approve();
    pdp.state.mode = 'allow';
    assert.equal(r1.status, 503, `${mode} read ${r1.status}`); assert.ok(r1.headers['retry-after']);
    assert.equal(r2.status, 503, `${mode} write ${r2.status}`); assert.equal(writeAllows(), before);
  });
}

test('CV-012 connection-establishment delay beyond D(t) (PoC TC-010 lesson): no allow on write', async () => {
  const slow = await startSlowAccept(pdp.url, 700);
  const c2 = buildApp({ idp, pdpUrl: slow.url, env: { AUTHZ_PDP_DEADLINE_MS: '300' } }); fixtureLines(c2.store);
  const b2 = await serve(c2.app); const id = fixtureReport(c2.store, { state: 'submitted' });
  const t0 = Date.now();
  const r = await call(b2, 'POST', `/t/${T1}/expenses/${id}/approve`, idp.mint({ sub: 'u-manager' }), {});
  const took = Date.now() - t0;
  c2.app.server.close(); await slow.close();
  assert.equal(r.status, 503); assert.equal(c2.store.reports.get(id).approvals.length, 0);
  assert.ok(took < 650, `deadline honoured (${took}ms)`);
});

test('CV-012 TLS handshake stall: NOT EXECUTED (no mTLS in this trial; Prism ignores mutualTLS)', { skip: 'mTLS not reproducible locally without SVIDs' }, () => {});

test('CV-012 deny -> identical response to not-found and other-tenant (IC-09)', async () => {
  pdp.state.mode = 'deny';
  const denied = await view();
  pdp.state.mode = 'allow';
  const absent = await call(base, 'GET', `/t/${T1}/expenses/00000000-0000-4000-8000-000000000000`, idp.mint());
  const otherTenant = await call(base, 'GET', `/t/${T1}/expenses/${ridT2}`, idp.mint());
  const strip = (r) => ({ status: r.status, text: r.text, ct: r.headers['content-type'], cc: r.headers['cache-control'], len: r.headers['content-length'] });
  assert.deepEqual(strip(denied), strip(absent)); assert.deepEqual(strip(absent), strip(otherTenant));
});

test('CV-012 revocation: allow, then deny on the next request (no allow cached outside the PEP)', async () => {
  assert.equal((await view()).status, 200);
  pdp.state.mode = 'deny'; const r = await view(); pdp.state.mode = 'allow';
  assert.equal(r.status, 404);
});

test('CV-012 G-stage cross-tenant deny_guardrail from PDP -> same as deny', async () => {
  // force a tid mismatch at the PDP by asking with a token of T2 on a T2 route but a T1-owned id is impossible
  // (bind_tenant rejects first). So assert the PEP-side (L0) path: token T2 on T1 route -> identical deny.
  const r = await call(base, 'GET', `/t/${T1}/expenses/${rid}`, idp.mint({ tid: T2 }));
  assert.equal(r.status, 404);
  assert.equal(pdp.state.calls.filter((c) => c.body?.subject?.properties?.tid === T2).length, 0, 'L0 rejects before the PDP');
});

test('CON-03 obligation the PEP does not understand on an allow -> treated as deny', async () => {
  pdp.state.mode = 'obligation'; const r = await view(); pdp.state.mode = 'allow';
  assert.equal(r.status, 404);
});

test('CV-008 cross-tenant: other tenant real id vs nonexistent id -> identical responses', async () => {
  const a = await call(base, 'GET', `/t/${T1}/expenses/${ridT2}`, idp.mint());
  const b = await call(base, 'GET', `/t/${T1}/expenses/ffffffff-0000-4000-8000-000000000000`, idp.mint());
  assert.equal(a.status, b.status); assert.equal(a.text, b.text);
  assert.equal(a.headers['content-length'], b.headers['content-length']);
});

test('evaluations short batch (fewer results than requests) -> list is 503 "unavailable", not empty', async () => {
  pdp.state.mode = 'short_batch';
  const r = await call(base, 'GET', `/t/${T1}/expenses`, idp.mint());
  pdp.state.mode = 'allow';
  assert.equal(r.status, 503);
});

test('SoD (workflow, INT-03 §9.5 note): requester who is also an approver cannot approve own report', async () => {
  const id = fixtureReport(ctx.store, { requester: 'u-manager', state: 'submitted' });
  const r = await call(base, 'POST', `/t/${T1}/expenses/${id}/approve`, idp.mint({ sub: 'u-manager' }), {});
  assert.equal(r.status, 404); // PDP allowed (stub), workflow denied
  assert.equal(ctx.store.reports.get(id).approvals.length, 0);
});

test('approval after content change is refused (content binding)', async () => {
  const id = fixtureReport(ctx.store, { state: 'submitted' });
  const r = await call(base, 'POST', `/t/${T1}/expenses/${id}/approve`, idp.mint({ sub: 'u-manager' }), { content_hash: 'stale' });
  assert.equal(r.status, 409);
});
