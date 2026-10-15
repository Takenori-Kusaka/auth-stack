// Quick manual smoke run against own stubs (not part of the contract test result).
import { startStack } from '../test/harness.js';
const s = await startStack();
if (s.startupError) { console.error('startup', s.startupError); process.exit(1); }
const { fx, stubs, call, mint, mintTxn } = s;
stubs.pdp.grant(fx.alice, 'book', 'rsv/room', fx.room1);
const r = await call('POST', `/v1/rooms/${fx.room1}/bookings`, { token: mint(), txn: mintTxn(), body: { start: '2026-10-15T00:00:00Z', end: '2026-10-15T01:00:00Z' } });
console.log('create', r.status, r.text);
stubs.pdp.grant(fx.alice, 'view', 'rsv/booking', r.json?.id);
console.log('view', (await call('GET', `/v1/bookings/${r.json?.id}`, { token: mint() })).status);
stubs.pdp.grant(fx.alice, 'view', 'rsv/room', fx.room1);
stubs.pdp.grant(fx.alice, 'view', 'rsv/booking', fx.b1);
const l = await call('GET', `/v1/rooms/${fx.room1}/bookings`, { token: mint() });
console.log('list', l.status, l.text);
console.log('reminder', await s.app.reminder.runDue('2026-12-01T00:00:00Z'), s.app.store.notifications);
console.log('audit events', stubs.sink.events.length, 'invalid', stubs.sink.invalid.length, JSON.stringify(stubs.sink.invalid[0]?.missing));
await s.close();
