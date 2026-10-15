// Platform self-test (not a TC; pre-freeze only): the three evaluators of the CAM — OpenFGA (via the adapter),
// Cedar (via the adapter) and the Python reference evaluator — agree on randomly sampled R-stage checks over a
// synthetic dataset, including cross-tenant subjects and expired external grants.
//   node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { ProcGroup } from '../harness/proc.js';
import { OpenFgaAdapter } from '../pdp/adapters/openfga.js';
import { CedarAdapter } from '../pdp/adapters/cedar.js';
import { loadCam } from '../model/cam.js';
import { generate } from '../data/gen-synthetic.js';
import { seededRng } from '../lib/ids.js';
import { portBase } from '../config/ports.js';
import { OPENFGA_BIN, CODE_DIR } from '../lib/topology.js';

test('OpenFGA, Cedar and the Python reference evaluator agree (R stage)', { timeout: 300_000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'poc-selftest-'));
  const base = portBase('selftest');
  const pg = new ProcGroup({ logDir: tmp });
  await pg.start('openfga', OPENFGA_BIN, ['run', '--datastore-engine', 'memory', '--http-addr', `127.0.0.1:${base + 4}`, '--grpc-addr', `127.0.0.1:${base + 5}`, '--playground-enabled=false', '--metrics-enabled=false', '--log-level', 'warn'], { ready: { url: `http://127.0.0.1:${base + 4}/healthz` } });
  try {
    const cam = loadCam(path.join(CODE_DIR, 'model', 'cam.json'));
    const fga = await new OpenFgaAdapter({ url: `http://127.0.0.1:${base + 4}` }).init();
    await fga.registerModel(cam);
    const ced = new CedarAdapter({ storeFile: null });
    await ced.registerModel(cam);
    const ds = generate({ seed: 7, profile: 'small', now: Date.parse('2026-10-15T00:00:00Z') });
    const tuples = ds.tuples.map(({ tid, ...t }) => t);
    for (let i = 0; i < tuples.length; i += 100) {
      const chunk = tuples.slice(i, i + 100);
      const a = await fga.write({ writes: chunk, modelRevision: cam.revision });
      assert.ok(a.ok, `openfga write ${JSON.stringify(a)}`);
      const b = await ced.write({ writes: chunk });
      assert.ok(b.ok, `cedar write ${JSON.stringify(b)}`);
    }
    // sample queries: random user (any tenant) x random object x each permission of its type
    const rng = seededRng('selftest-queries');
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const objects = [
      ...ds.files.map((f) => ['files/file', f.id]), ...ds.folders.map((f) => ['files/folder', f.id]),
      ...ds.projects.map((p) => ['proj/project', p.id]), ...ds.tools.map((t) => ['proj/tool_instance', t.id]),
      ...ds.units.map((u) => ['core/unit', u.id]), ...ds.tenants.map((t) => ['core/tenant', t.id]),
    ];
    const queries = [];
    // bias towards plausible allows: owners/grantees of the sampled object plus random users
    for (let i = 0; i < 1500; i++) {
      const [type, id] = pick(objects);
      const t = cam.types.get(type);
      const perm = pick([...t.perms.keys()]);
      const user = rng() < 0.5 ? pick(ds.users).id : (ds.tuples.find((x) => x.resource.id === id && x.subject.type === 'core/user')?.subject.id || pick(ds.users).id);
      queries.push({ user, type, id, permission: perm });
    }
    for (const g of ds.externalGrants) queries.push({ user: g.grantee, type: 'files/folder', id: g.target.id, permission: 'read' });
    const qf = path.join(tmp, 'q.jsonl');
    fs.writeFileSync(qf, queries.map((q) => JSON.stringify(q)).join('\n') + '\n');
    const tf = path.join(tmp, 'tuples.json');
    fs.writeFileSync(tf, JSON.stringify(tuples));
    const now = Date.now();
    const pyOut = execFileSync('python', ['-I', path.join(CODE_DIR, 'ref', 'ref_eval.py'), '--cam', path.join(CODE_DIR, 'model', 'cam.json'), '--tuples', tf, '--queries', qf, '--now', new Date(now).toISOString()], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const ref = pyOut.trim().split('\n').map((l) => JSON.parse(l));
    let allows = 0;
    const diffs = [];
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const args = { subject: { type: 'core/user', id: q.user }, relation: q.permission, resource: { type: q.type, id: q.id }, modelRevision: cam.revision, mode: 'fully_consistent', now };
      const a = await fga.check(args);
      const b = await ced.check(args);
      const r = ref[i].allowed;
      if (a.allowed) allows++;
      if (a.allowed !== b.allowed || a.allowed !== r) diffs.push({ q, openfga: a.allowed ?? a.error, cedar: b.allowed ?? b.error, ref: r, detail: b.detail || a.detail });
    }
    fs.writeFileSync(path.join(tmp, 'diffs.json'), JSON.stringify(diffs, null, 2));
    console.log(JSON.stringify({ queries: queries.length, allows, diffs: diffs.length, tmp }));
    assert.ok(allows > 50, `too few allows sampled (${allows})`);
    assert.equal(diffs.length, 0, `engine/ref differences: ${JSON.stringify(diffs.slice(0, 3))}`);
  } finally {
    await pg.stopAll();
  }
});
