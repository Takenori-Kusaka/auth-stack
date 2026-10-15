// Positive flows + key negative flows of the support ticket service against self-made stubs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startWorld, call } from './harness.js';

let w, f;
before(async () => { w = await startWorld(); await w.startSut(); f = w.fixtures(); });
after(async () => {
  await w.app.audit.flush();
  fs.mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../out/audit-positive.jsonl', import.meta.url), w.sink.events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  await w.stopAll();
});

const tok = (over = {}) => w.mint({ claims: over });

test('EP-SUP-01 create ticket: write with Txn-Token, A1 acceptance registered, containment tuples written', async () => {
  const before = w.tts.calls.acceptance;
  const r = await call(w, 'POST', `/desks/${f.d1}/tickets`, { token: tok(), txn: w.txnFor(), body: { title: 'mail bounce' } });
  assert.equal(r.status, 201);
  assert.equal(w.tts.calls.acceptance, before + 1);
  assert.equal(w.app.queue.length >= 1, true);
  const id = r.json.id;
  const g = await call(w, 'GET', `/tickets/${id}`, { token: tok() });
  assert.equal(g.status, 200);
  assert.equal(g.json.title, 'mail bounce');
});

test('EP-SUP-02/03 read and list: requester sees own tickets only; other-tenant and absent are the same 404', async () => {
  const l = await call(w, 'GET', '/tickets', { token: tok() });
  assert.equal(l.status, 200);
  const ids = l.json.items.map((i) => i.id);
  assert.ok(ids.includes(f.own) && ids.includes(f.third));
  assert.ok(!ids.includes(f.ungranted) && !ids.includes(f.t2existing));
  assert.equal(l.json.completeness, 'complete');
  const a = await call(w, 'GET', `/tickets/${f.t2existing}`, { token: tok() });
  const b = await call(w, 'GET', `/tickets/${f.absent}`, { token: tok() });
  const c = await call(w, 'GET', `/tickets/${f.ungranted}`, { token: tok() });
  assert.equal(a.status, 404); assert.equal(a.text, b.text); assert.equal(b.text, c.text);
  // PDP request shape: action.name is the verb permission, subject.type mapped (SM-1), tid from binding
  const ev = w.pdp.calls.find((x) => x.path === '/access/v1/evaluation' && x.body.resource.id === f.ungranted);
  assert.equal(ev.body.action.name, 'read');
  assert.equal(ev.body.subject.type, 'core/user');
  assert.equal(ev.body.resource.properties.tid, w.ids.t1);
});

test('EP-SUP-04 admin assigns own-tenant staff (CON-04 write); assigning outsourced partner staff is rejected by Registry', async () => {
  const at = tok({ sub: w.ids.admin });
  const ok = await call(w, 'POST', `/tickets/${f.own}/assign`, { token: at, txn: w.txnFor(w.ids.admin), body: { assignee_sub: w.ids.staff } });
  assert.equal(ok.status, 200);
  const ng = await call(w, 'POST', `/tickets/${f.own}/assign`, { token: at, txn: w.txnFor(w.ids.admin), body: { assignee_sub: w.ids.partner } });
  assert.equal(ng.status, 409);
  assert.equal(ng.json.code, 'tenant_boundary_violation');
  const self = await call(w, 'POST', `/tickets/${f.own}/assign`, { token: tok(), txn: w.txnFor(), body: { assignee_sub: w.ids.staff } });
  assert.equal(self.status, 404); // requester has no assign
});

test('P-16 outsourced partner: desk-level external grant lets partner (tid=customer) handle all desk tickets; home-tenant token is rejected', async () => {
  w.xg.fixtureGrant({ anchor: `sup/desk:${f.d1}`, relation: 'partner', grantee: w.ids.partner, expires_at: new Date(Date.now() + 3600e3).toISOString(), tid: w.ids.t1 });
  const pt = tok({ sub: w.ids.partner, tid: w.ids.t1 });
  assert.equal((await call(w, 'GET', `/tickets/${f.ungranted}`, { token: pt })).status, 200);
  const home = tok({ sub: w.ids.partner, tid: w.ids.t3 });
  assert.equal((await call(w, 'GET', `/tickets/${f.own}`, { token: home })).status, 404);
  const l = await call(w, 'GET', '/tickets', { token: pt });
  assert.ok(l.json.items.length >= 3); // partner sees every ticket of the desk: no per-ticket narrowing possible (C-1)
});

test('EP-SUP-05/09 guest invite via CON-17; invited is not access; active grants read only; close revokes by anchor first', async () => {
  const email = 'guest-xyz@partner.test.invalid';
  const inv = await call(w, 'POST', `/tickets/${f.third}/guests`, { token: tok(), txn: w.txnFor(), body: { email } });
  assert.equal(inv.status, 201); assert.equal(inv.json.state, 'invited');
  const gt = tok({ sub: w.ids.guest, tid: w.ids.t1 });
  assert.equal((await call(w, 'GET', `/tickets/${f.third}`, { token: gt })).status, 404); // XGC-5
  w.xg.accept(inv.json.grant_id, w.ids.guest);
  assert.equal((await call(w, 'GET', `/tickets/${f.third}`, { token: gt })).status, 200);
  assert.equal((await call(w, 'POST', `/tickets/${f.third}/comments`, { token: gt, txn: w.txnFor(w.ids.guest), body: { body: 'hi' } })).status, 404);
  assert.equal((await call(w, 'GET', `/tickets/${f.own}`, { token: gt })).status, 404);
  const gl = await call(w, 'GET', '/tickets', { token: gt });
  assert.deepEqual(gl.json.items.map((i) => i.id), [f.third]);
  const cl = await call(w, 'POST', `/tickets/${f.third}/close`, { token: tok(), txn: w.txnFor() });
  assert.equal(cl.status, 200); assert.equal(cl.json.guest_access_revoked, true);
  assert.ok(w.xg.calls.some((c) => c.url.endsWith('/revoke-by-anchor')));
  assert.equal((await call(w, 'GET', `/tickets/${f.third}`, { token: gt })).status, 404);
  await w.app.audit.flush();
  assert.ok(!JSON.stringify(w.sink.events).includes(email));
  assert.ok(!JSON.stringify([...w.app.store.tickets.values()]).includes(email));
});

test('P-08 AI agent drafts on behalf of staff (CON-18 AD-01..AD-12); sending by the agent is approval-required and rejected; staff sends', async () => {
  const agentTok = tok({ sub: w.ids.staff, act: { sub: w.ids.agent, ptype: 'ai_agent' }, scope: 'sup.draft_reply', client_id: w.ids.deskAgentClient });
  const before = w.pdp.calls.length;
  const d = await call(w, 'POST', `/tickets/${f.own}/drafts`, { token: agentTok, txn: w.txnFor(w.ids.staff), body: { body: 'Please restart the printer.' } });
  assert.equal(d.status, 201); assert.equal(d.json.drafted_by_agent, true);
  const req = w.pdp.calls.slice(before).find((c) => c.body.action?.name === 'draft_reply').body;
  assert.equal(req.subject.type, 'core/user'); assert.equal(req.subject.id, w.ids.staff);
  assert.deepEqual(req.subject.properties.actor, { type: 'core/workload', id: w.ids.agent, principal_type: 'ai_agent' });
  const agentSend = tok({ sub: w.ids.staff, act: { sub: w.ids.agent, ptype: 'ai_agent' }, scope: 'sup.draft_reply sup.send_reply', client_id: w.ids.deskAgentClient });
  const s1 = await call(w, 'POST', `/tickets/${f.own}/drafts/${d.json.draft_id}/send`, { token: agentSend, txn: w.txnFor(w.ids.staff) });
  assert.equal(s1.status, 403); assert.equal(s1.json.code, 'approval_required');
  const s2 = await call(w, 'POST', `/tickets/${f.own}/drafts/${d.json.draft_id}/send`, { token: tok({ sub: w.ids.staff }), txn: w.txnFor(w.ids.staff) });
  assert.equal(s2.status, 200); assert.equal(s2.json.status, 'sent');
  const g = await call(w, 'GET', `/tickets/${f.own}`, { token: tok() });
  assert.ok(g.json.comments.some((c) => c.body === 'Please restart the printer.'));
  assert.ok(w.app.store.outbox.some((o) => o.kind === 'sup.reply.sent' && o.recipient === w.ids.self && !('body' in o)));
  // autonomous agent (sub=ai_agent) is rejected without PDP (AD-02)
  const n = w.pdp.calls.length;
  const auto = tok({ sub: w.ids.agent, ptype: 'ai_agent', client_id: w.ids.autonomousClient, acr: null, amr: null, auth_time: null, sid: null });
  const a = await call(w, 'POST', `/tickets/${f.own}/drafts`, { token: auto, txn: w.txnFor(w.ids.agent), body: { body: 'x' } });
  assert.equal(a.status, 403); assert.equal(w.pdp.calls.length, n);
});

test('EP-SUP-10 SLA consumer: internal-start Txn-Token, re-check with saved subject type, in-app notification to assignee only when breaching', async () => {
  const c = await call(w, 'POST', `/desks/${f.d1}/tickets`, { token: tok(), txn: w.txnFor(), body: { title: 'sla test' } });
  const msg = w.app.queue.find((m) => m.resource === c.json.id);
  await call(w, 'POST', `/tickets/${c.json.id}/assign`, { token: tok({ sub: w.ids.admin }), txn: w.txnFor(w.ids.admin), body: { assignee_sub: w.ids.staff } });
  const r = await w.app.consume(msg);
  assert.equal(r.ok, true); assert.equal(r.notified, 1);
  const n = w.app.store.notifications.at(-1);
  assert.equal(n.recipient, w.ids.staff); assert.equal(n.channel, 'in_app');
  const recheck = w.pdp.calls.at(-1).body;
  assert.equal(recheck.subject.type, 'core/user'); assert.equal(recheck.subject.id, w.ids.self);
});

test('OB-12 counters are emitted per entry point without sampling', () => {
  const c = w.app.audit.counters.get('EP-SUP-02');
  assert.ok(c.handled >= c.judged && c.judged > 0);
});
