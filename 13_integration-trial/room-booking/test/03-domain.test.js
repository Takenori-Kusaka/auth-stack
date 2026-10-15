// Domain positive/negative tests for the five features (own stubs). INT-02 NP-xx ids are cited where they exist.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startStack, T1, T2 } from './harness.js';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
let S;
before(async () => { S = await startStack(); if (S.startupError) throw S.startupError; });
after(async () => { await S?.close(); });

const reset = () => { S.stubs.pdp.inject = null; S.stubs.pdp.allow.clear(); S.stubs.pdp.revoked.clear(); S.stubs.tts.failLedger = false; S.stubs.tts.failTts = false; S.stubs.tts.overrideClaims = null; };
const create = (o = {}) => S.call('POST', `/v1/rooms/${o.room ?? S.fx.room1}/bookings`, { token: o.token ?? S.mint(), txn: o.txn === undefined ? S.mintTxn() : o.txn, body: { start: o.start ?? '2026-10-16T00:00:00Z', end: '2026-10-16T01:00:00Z', attendees: o.attendees ?? [S.fx.bob] } });

test('create booking: allow -> 201, acceptance record registered, outbox has references only (BN-1, NP24-4)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'book', 'rsv/room', S.fx.room1);
  const r = await create();
  assert.equal(r.status, 201);
  const msg = S.app.store.outbox.at(-1);
  assert.equal(msg.resource_id, r.json.id);
  assert.ok(S.stubs.tts.records.has(msg.job_run_id));
  const raw = JSON.stringify(msg);
  assert.ok(!/eyJ/.test(raw) && !/@/.test(raw), 'no token / contact in outbox');
  const req = S.stubs.pdp.requests.at(-1).body;
  assert.equal(req.action.name, 'book'); assert.equal(req.subject.type, 'core/user'); assert.equal(req.context['x-authz-profile'].consistency.mode, 'fully_consistent');
});

test('create booking without Txn-Token -> 401, no business, no PDP call', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'book', 'rsv/room', S.fx.room1);
  const n = S.app.store.bookings.size, c = S.stubs.pdp.calls;
  const r = await create({ txn: null });
  assert.equal(r.status, 401); assert.equal(S.app.store.bookings.size, n); assert.equal(S.stubs.pdp.calls, c);
  assert.equal(S.stubs.sink.events.at(-1).corr.txn_absence, 'not_presented');
});

test('create booking when the job ledger is down -> 503, booking not created (CON-05: no job without a record)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'book', 'rsv/room', S.fx.room1); S.stubs.tts.failLedger = true;
  const n = S.app.store.bookings.size;
  const r = await create();
  assert.equal(r.status, 503); assert.equal(S.app.store.bookings.size, n);
});

test('create in another tenant room -> 404 identical to absent room (CV-008 shape)', async () => {
  reset();
  const a = await create({ room: S.fx.room2 });
  const b = await create({ room: 'nosuchroom0000000000000000' });
  assert.equal(a.status, 404); assert.equal(a.text, b.text);
});

test('external guest with a resource-side token (tid=T1) can view b1 when granted (P-16)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.guest, 'view', 'rsv/booking', S.fx.b1);
  const r = await S.call('GET', `/v1/bookings/${S.fx.b1}`, { token: S.mint({ sub: S.fx.guest, tid: T1 }) });
  assert.equal(r.status, 200);
});

test('NP16-1 guest presenting a home-side token (tid=T2) is denied without PDP call', async () => {
  reset(); S.stubs.pdp.grant(S.fx.guest, 'view', 'rsv/booking', S.fx.b1);
  const c = S.stubs.pdp.calls;
  const r = await S.call('GET', `/v1/bookings/${S.fx.b1}`, { token: S.mint({ sub: S.fx.guest, tid: T2 }) });
  assert.equal(r.status, 404); assert.equal(S.stubs.pdp.calls, c);
});

test('NP16-6 guest on a booking without external grant -> 404 (PDP table deny)', async () => {
  reset();
  const r = await S.call('GET', `/v1/bookings/${S.fx.b1}`, { token: S.mint({ sub: S.fx.guest, tid: T1 }) });
  assert.equal(r.status, 404);
});

test('invite external guest: allowed by PDP but no contract to create core/external_grant -> 501 (finding C-1)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'invite_guest', 'rsv/booking', S.fx.b1);
  const r = await S.call('POST', `/v1/bookings/${S.fx.b1}/guests`, { token: S.mint(), txn: S.mintTxn(), body: { guest: 'someone' } });
  assert.equal(r.status, 501);
});

test('AI assistant delegated booking (sub=human, act.ptype=ai_agent): actor type undecided -> 403 without PDP call (finding C-2)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'book', 'rsv/room', S.fx.room1);
  const c = S.stubs.pdp.calls;
  const tok = S.mint({ claims: { act: { sub: 'agent-0001', ptype: 'ai_agent' }, client_id: 'agent-client-01' } });
  const r = await create({ token: tok });
  assert.equal(r.status, 403); assert.equal(S.stubs.pdp.calls, c);
});

test('AI assistant read without Txn-Token is rejected (+AGT: Txn-Token at every tier, INT-02 P-08)', async () => {
  reset();
  const tok = S.mint({ claims: { act: { sub: 'agent-0001', ptype: 'ai_agent' } } });
  const r = await S.call('GET', `/v1/bookings/${S.fx.b1}`, { token: tok });
  assert.equal(r.status, 401);
});

test('token whose sub itself is ai_agent -> 403 without PDP (CON-02 x-subject-type-map)', async () => {
  reset();
  const c = S.stubs.pdp.calls;
  const r = await S.call('GET', `/v1/bookings/${S.fx.b1}`, { token: S.mint({ sub: 'agent-0001', ptype: 'ai_agent' }) });
  assert.equal(r.status, 403); assert.equal(S.stubs.pdp.calls, c);
});

test('NP08-7 agent token whose Txn-Token tctx.tid differs from tid -> l0_mismatch', async () => {
  reset();
  const tok = S.mint({ claims: { act: { sub: 'agent-0001', ptype: 'ai_agent' } } });
  const r = await S.call('GET', `/v1/bookings/${S.fx.b1}`, { token: tok, txn: S.mintTxn({ tctx: { tid: T2 } }) });
  assert.equal(r.status, 404); assert.equal(S.stubs.sink.events.at(-1).reason_code, 'deny_l0:mismatch');
});

test('list: candidates by tenant+room, every item post-checked; denied items are dropped (P-09, LS-2)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'view', 'rsv/room', S.fx.room1); S.stubs.pdp.grant(S.fx.alice, 'view', 'rsv/booking', S.fx.b1);
  const r = await S.call('GET', `/v1/rooms/${S.fx.room1}/bookings`, { token: S.mint() });
  assert.equal(r.status, 200);
  const ids = r.json.items.map((i) => i.id);
  assert.ok(ids.includes(S.fx.b1)); assert.ok(ids.length < [...S.app.store.bookings.values()].filter((b) => b.tid === T1 && b.status === 'active').length);
  assert.ok(!ids.includes(S.fx.b2));
  const ev = S.stubs.pdp.requests.at(-1).body; assert.equal(ev.options.evaluations_semantic, 'execute_all');
});

test('list: evaluations count mismatch -> 503 "unavailable", not an empty list (D25-19)', async () => {
  reset(); S.stubs.pdp.grant(S.fx.alice, 'view', 'rsv/room', S.fx.room1);
  S.stubs.pdp.inject = 'count_mismatch';
  const r = await S.call('GET', `/v1/rooms/${S.fx.room1}/bookings`, { token: S.mint() });
  assert.equal(r.status, 503);
});

test('NP09-4a app code never calls search / engine listing', () => {
  const src = fs.readdirSync(path.join(here, '..', 'src')).map((f) => fs.readFileSync(path.join(here, '..', 'src', f), 'utf8')).join('\n');
  assert.ok(!/\/access\/v1\/search\/|searchResources|ListObjects|LookupResources/.test(src));
});

test('AN-5 action names the app sends are catalog verbs only', () => {
  const cam = JSON.parse(fs.readFileSync(path.join(here, '..', 'model', 'rsv.cam.json'), 'utf8'));
  const verbs = new Set(cam.types.flatMap((t) => t.permissions.map((p) => p.name)).filter((n) => !['administrators', 'bookers'].includes(n)));
  const sent = new Set(S.stubs.pdp.requests.map((r) => r.body.action?.name).filter(Boolean));
  for (const a of sent) assert.ok(verbs.has(a), a);
});

// ---------------- reminders (EP-RSV-06) ----------------
async function newBookingForReminder() {
  S.stubs.pdp.grant(S.fx.alice, 'book', 'rsv/room', S.fx.room1);
  const r = await create({ start: '2026-10-17T00:00:00Z' });
  assert.equal(r.status, 201);
  return { id: r.json.id, msg: S.app.store.outbox.at(-1) };
}

test('reminder: re-check with origin subject (book) then in-app notification with minimal body (BN-3, BN-5)', async () => {
  reset(); const { id, msg } = await newBookingForReminder();
  const out = await S.app.reminder.processOne(msg);
  assert.equal(out.outcome, 'sent');
  const n = S.app.store.notifications.filter((x) => x.ref === id);
  assert.equal(n.length, 2);
  assert.ok(n.every((x) => !/eyJ|token|@/.test(JSON.stringify(x))));
  const last = S.stubs.pdp.requests.at(-1);
  assert.equal(last.body.action.name, 'book'); assert.ok(last.headers['txn-token']);
});

test('reminder for a cancelled booking is not sent (BN-4)', async () => {
  reset(); const { id, msg } = await newBookingForReminder();
  S.app.store.bookings.get(id).status = 'cancelled';
  assert.equal((await S.app.reminder.processOne(msg)).outcome, 'skipped');
});

test('NP24-6 reminder after tenant suspension is not sent', async () => {
  reset(); const { msg } = await newBookingForReminder();
  S.app.store.tenantState.set(T1, 'suspended');
  try { assert.equal((await S.app.reminder.processOne(msg)).outcome, 'skipped'); } finally { S.app.store.tenantState.delete(T1); }
});

test('NP24-7 reminder re-check deny / no decision -> dead letter + audit', async () => {
  reset(); const { msg } = await newBookingForReminder();
  S.stubs.pdp.allow.clear();
  const ev = S.stubs.sink.events.length;
  assert.equal((await S.app.reminder.processOne(msg)).outcome, 'dead_letter');
  assert.ok(S.stubs.sink.events.length > ev);
  const { msg: m2 } = await newBookingForReminder();
  S.stubs.pdp.inject = 'indeterminate';
  assert.equal((await S.app.reminder.processOne(m2)).outcome, 'dead_letter');
});

test('NP04-2 message tid tampered -> three-way mismatch, dead letter', async () => {
  reset(); const { msg } = await newBookingForReminder();
  const bad = { ...msg, tid: T2 };
  assert.equal((await S.app.reminder.processOne(bad)).outcome, 'dead_letter');
});

test('reminder when TTS is down -> retry later (not silently dropped, not executed)', async () => {
  reset(); const { msg } = await newBookingForReminder();
  S.stubs.tts.failTts = true;
  assert.equal((await S.app.reminder.processOne(msg)).outcome, 'retry_later');
});

test('audit sink accepted every E2 record shape (CON-08 required fields, txn/txn_absence, decision_source)', () => {
  assert.deepEqual(S.stubs.sink.invalid.map((x) => x.missing), []);
  const counts = [...S.app.pep.audit.counters.entries()];
  assert.ok(counts.length > 0);
});
