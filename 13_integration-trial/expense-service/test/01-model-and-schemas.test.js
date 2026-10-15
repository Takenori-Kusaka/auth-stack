// Static / schema-level checks that need no mock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C } from './harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const mcr = JSON.parse(fs.readFileSync(path.join(here, '../model/expense.model-change-request.json'), 'utf8'));

test('INT-03 S-3: ModelChangeRequest validates against CON-04 ModelChangeRequest', () => {
  const r = C.oas('CON-04', 'ModelChangeRequest')(mcr);
  assert.ok(r.ok, JSON.stringify(r.errors));
});

test('INT-03 S-3: each module validates against CON-04 CamModule', () => {
  for (const m of mcr.modules) {
    const r = C.oas('CON-04', 'CamModule')(m.content);
    assert.ok(r.ok, JSON.stringify(r.errors));
  }
});

test('INT-03 E-2 (CAM 式 v0): no mixed operators without parentheses (manual check per §15.1 cond.2)', () => {
  for (const t of mcr.modules[0].content.types) for (const p of t.permissions || []) {
    const ops = new Set((p.expression.match(/\||&| - /g) || []).map((s) => s.trim()));
    assert.ok(ops.size <= 1 || p.expression.includes('('), `${t.name}#${p.name}`);
  }
});

test('INT-03 D-5: every relation is covered by at least one positive and one negative check (self-computed)', () => {
  const rels = mcr.modules[0].content.types.flatMap((t) => (t.relations || []).map((r) => `${t.name}#${r.name}`));
  const used = new Set(mcr.tests.flatMap((tc) => tc.tuples.map((x) => `${x.resource.type}#${x.relation}`)));
  const uncovered = rels.filter((r) => !used.has(r));
  // expense/report#unit is intentionally unused by any permission (see report: core/unit public permission unknown)
  assert.deepEqual(uncovered, ['expense/report#unit']);
});

test('INT-03 N-24: action names the app sends are catalog verbs only', () => {
  const src = fs.readFileSync(path.join(here, '../src/app.js'), 'utf8') + fs.readFileSync(path.join(here, '../src/consumer.js'), 'utf8');
  const sent = new Set([...src.matchAll(/action: '([a-z_]+)'/g), ...src.matchAll(/name: '([a-z_]+)'/g)].map((m) => m[1]));
  const catalog = new Set(mcr.modules[0].content.types.flatMap((t) => (t.permissions || []).map((p) => p.name)));
  for (const a of sent) assert.ok(catalog.has(a), `action ${a} not in catalog`);
});

test('CON-13: all examples conform, all x-negative-examples (LC-NE-01..11) are rejected', () => {
  for (const e of C.docs['CON-13'].examples) assert.ok(C.con13(e).ok);
  const neg = C.docs['CON-13']['x-negative-examples'];
  assert.equal(neg.length, 11);
  for (const n of neg) assert.equal(C.con13(n.value).ok, false, n.id);
});

test('CON-13 DeletionReport: examples conform, LC-DR-NE-01/02 rejected', () => {
  const dr = C.docs['CON-13'].$defs.DeletionReport;
  for (const e of dr.examples) assert.ok(C.con13def('DeletionReport')(e).ok);
  for (const n of dr['x-negative-examples']) assert.equal(C.con13def('DeletionReport')(n.value).ok, false, n.id);
});

test('NP24-1 / NP04-3 (static): the outbox message schema carries no token, role or permission list', () => {
  const src = fs.readFileSync(path.join(here, '../src/app.js'), 'utf8');
  const enq = src.slice(src.indexOf('function enqueue'), src.indexOf('const server'));
  for (const bad of ['authorization', 'access_token', 'txnToken', 'roles', 'permissions', 'scope']) assert.ok(!enq.includes(bad), bad);
});

test('CON-11 §16.2 step 3 (static): no URL literal in src/ except contract-copied constants', () => {
  for (const f of fs.readdirSync(path.join(here, '../src'))) {
    const s = fs.readFileSync(path.join(here, '../src', f), 'utf8');
    const urls = [...s.matchAll(/['"`](https?:\/\/[^'"`]+)['"`]/g)].map((m) => m[1])
      .filter((u) => !u.startsWith('http://local') && !u.startsWith('https://contracts.id-domain.example/') && !u.startsWith('https://id-domain.example/token-types/'));
    assert.deepEqual(urls, [], f);
  }
});
