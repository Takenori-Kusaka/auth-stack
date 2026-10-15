// TC-021 認可 graph シナリオ（preregistered-test-plan.md §4.21）— 待（KP-4）: 暫定 n で実行し値を記録（判定保留）
//   node tests/engine-swap-perf-audit/TC-021.js [--harness-check]
import path from 'node:path';
import fc from 'fast-check';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { ProcGroup } from '../../harness/proc.js';
import { request } from '../../lib/http.js';
import { OPENFGA_BIN, CODE_DIR, clientTls } from '../../lib/topology.js';
import { syntheticId, seededRng } from '../../lib/ids.js';
import { loadCam } from '../../model/cam.js';
import { OpenFgaAdapter } from '../../pdp/adapters/openfga.js';
import { CedarAdapter } from '../../pdp/adapters/cedar.js';
import { openRun, groupPortBase, writeEval, sleep, HARNESS_CHECK } from './common.js';
import { refEvaluate } from './lib/helpers.js';

const TC = 'TC-021';
const { run, params } = openRun(TC, { seed: 21 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile, now: Date.parse('2026-10-15T00:00:00Z') });
const base = groupPortBase(TC);
let status = 'completed';
const evalOut = { tc: TC };
let s = null;
const pg = new ProcGroup({ logDir: path.join(run.dir, 'logs-engines') });
const tKey = (t) => `${t.resource.type}:${t.resource.id}#${t.relation}@${t.subject.type}:${t.subject.id}${t.subject.relation ? '#' + t.subject.relation : ''}`;

try {
  // ================= part 1: property test over operation sequences (R stage, both engines vs reference) =========
  await pg.start('openfga', OPENFGA_BIN, ['run', '--datastore-engine', 'memory', '--http-addr', `127.0.0.1:${base + 14}`, '--grpc-addr', `127.0.0.1:${base + 15}`, '--playground-enabled=false', '--metrics-enabled=false', '--log-level', 'warn'], { ready: { url: `http://127.0.0.1:${base + 14}/healthz` } });
  const cam = loadCam(path.join(CODE_DIR, 'model', 'cam.json'));
  const T1 = ds.tenants[0], T2 = ds.tenants[1];
  const baseTuples = ds.tuples.filter((t) => t.tid === T1.id || t.tid === T2.id);
  const users1 = [...new Set(ds.users.filter((u) => u.memberships.some((m) => m.tid === T1.id)).map((u) => u.id))];
  const outsiders = ds.users.filter((u) => !u.memberships.some((m) => m.tid === T1.id)).map((u) => u.id).slice(0, 5);
  const folders = ds.folders.filter((f) => f.tid === T1.id).map((f) => f.id);
  const files = ds.files.filter((f) => f.tid === T1.id);
  const groups = ds.groups.filter((g) => g.tid === T1.id).map((g) => g.id);
  const now = Date.parse('2026-10-15T00:00:00Z');
  const seqResults = [];
  let seqNo = 0;
  const opArb = fc.oneof(
    fc.record({ k: fc.constant('move'), file: fc.nat(files.length - 1), to: fc.nat(folders.length - 1) }),
    fc.record({ k: fc.constant('share_external'), who: fc.nat(outsiders.length - 1), folder: fc.nat(folders.length - 1), expired: fc.boolean() }),
    fc.record({ k: fc.constant('nest_group'), add: fc.boolean() }),
    fc.record({ k: fc.constant('grant'), user: fc.nat(users1.length - 1), folder: fc.nat(folders.length - 1), rel: fc.constantFrom('viewer', 'editor') }),
    fc.record({ k: fc.constant('revoke_any'), pick: fc.nat(1000) }),
    fc.record({ k: fc.constant('custom_role'), user: fc.nat(users1.length - 1), folder: fc.nat(folders.length - 1) }),
  );
  const seqArb = fc.array(fc.oneof(opArb, fc.record({ k: fc.constant('concurrent'), a: opArb, b: opArb })), { minLength: 1, maxLength: 8 });
  const runner = async (ops) => {
    const id = ++seqNo;
    // fresh engines per sequence: an OpenFGA store and a Cedar snapshot with the base tuples
    const fga = await new OpenFgaAdapter({ url: `http://127.0.0.1:${base + 14}`, storeName: `tc021-${id}` }).init();
    await fga.registerModel(cam);
    const ced = new CedarAdapter({ storeFile: null });
    await ced.registerModel(cam);
    const live = new Map(baseTuples.map(({ tid, ...t }) => [tKey(t), t]));
    const put = async (w, d) => { const a = await fga.write({ writes: w, deletes: d, modelRevision: cam.revision, onDuplicate: 'ignore', onMissing: 'ignore' }); const b = await ced.write({ writes: w, deletes: d, onDuplicate: 'ignore', onMissing: 'ignore' }); for (const t of d) live.delete(tKey(t)); for (const t of w) live.set(tKey(t), t); return a.ok && b.ok; };
    for (let i = 0; i < [...live.values()].length; i += 100) { const chunk = [...live.values()].slice(i, i + 100); await fga.write({ writes: chunk, modelRevision: cam.revision }); await ced.write({ writes: chunk }); }
    const nestState = { depth: 0 };
    const extraGroups = [];
    const touched = [];
    const apply = async (op) => {
      const T = (rt, rid, rel, st, sid, srel, cond) => ({ resource: { type: rt, id: rid }, relation: rel, subject: srel ? { type: st, id: sid, relation: srel } : { type: st, id: sid }, ...(cond ? { condition: cond } : {}) });
      if (op.k === 'move') { const f = files[op.file]; const cur = [...live.values()].find((t) => t.resource.type === 'files/file' && t.resource.id === f.id && t.relation === 'parent'); await put([T('files/file', f.id, 'parent', 'files/folder', folders[op.to])], cur ? [cur] : []); touched.push(['files/file', f.id]); }
      else if (op.k === 'share_external') { const g = syntheticId(); await put([T('core/external_grant', g, 'grantee', 'core/user', outsiders[op.who], null, { name: 'c.not_expired', context: { expires_at: new Date(now + (op.expired ? -3600_000 : 86400_000)).toISOString() } }), T('files/folder', folders[op.folder], 'viewer', 'core/external_grant', g, 'grantee'), T('core/tenant', T1.id, 'external_member', 'core/user', outsiders[op.who])], []); touched.push(['files/folder', folders[op.folder]]); }
      else if (op.k === 'nest_group') { if (op.add && nestState.depth < 2) { const g = syntheticId(); extraGroups.push(g); await put([T('core/group', g, 'owner_unit', 'core/tenant', T1.id), T('core/group', groups[0], 'member', 'core/group', g, 'member'), T('core/group', g, 'member', 'core/user', users1[extraGroups.length % users1.length])], []); nestState.depth++; } else if (!op.add && extraGroups.length) { const g = extraGroups.pop(); await put([], [T('core/group', groups[0], 'member', 'core/group', g, 'member')]); nestState.depth = Math.max(0, nestState.depth - 1); } }
      else if (op.k === 'grant') { await put([T('files/folder', folders[op.folder], op.rel, 'core/user', users1[op.user])], []); touched.push(['files/folder', folders[op.folder]]); }
      else if (op.k === 'revoke_any') { const direct = [...live.values()].filter((t) => ['viewer', 'editor'].includes(t.relation) && t.subject.type === 'core/user'); if (direct.length) { const t = direct[op.pick % direct.length]; await put([], [t]); touched.push([t.resource.type, t.resource.id]); } }
      else if (op.k === 'custom_role') { const r = syntheticId(); await put([T('core/role', r, 'assignee', 'core/user', users1[op.user]), T('files/folder', folders[op.folder], 'viewer', 'core/role', r, 'assignee')], []); touched.push(['files/folder', folders[op.folder]]); }
      else if (op.k === 'concurrent') { await Promise.all([apply(op.a), apply(op.b)]); }
    };
    const rng = seededRng(`TC-021-checks:${id}`);
    const diffs = [];
    let checks = 0, allows = 0;
    for (const op of ops) {
      await apply(op);
      // checks: random (user | outsider) x (touched or random) object x permission
      const qs = [];
      for (let c = 0; c < 16; c++) {
        const obj = touched.length && rng() < 0.5 ? touched[Math.floor(rng() * touched.length)] : rng() < 0.5 ? ['files/folder', folders[Math.floor(rng() * folders.length)]] : ['files/file', files[Math.floor(rng() * files.length)].id];
        const who = rng() < 0.8 ? users1[Math.floor(rng() * users1.length)] : outsiders[Math.floor(rng() * outsiders.length)];
        qs.push({ user: who, type: obj[0], id: obj[1], permission: rng() < 0.7 ? 'read' : 'write' });
      }
      const ref = refEvaluate({ tuples: [...live.values()], queries: qs, now: new Date(now) });
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        const args = { subject: { type: 'core/user', id: q.user }, relation: q.permission, resource: { type: q.type, id: q.id }, modelRevision: cam.revision, mode: 'fully_consistent', now };
        const a = await fga.check(args), b = await ced.check(args);
        checks++;
        if (ref[i]) allows++;
        for (const [eng, v] of [['openfga', a], ['cedar', b]]) {
          const got = v.error ? null : v.allowed;
          if (got !== ref[i]) diffs.push({ seq: id, op: op.k, eng, q, ref: ref[i], got, kind: got === true && ref[i] === false ? 'allow_expansion' : got === false && ref[i] === true ? 'deny_expansion' : 'error', detail: v.detail });
        }
      }
    }
    seqResults.push({ seq: id, ops: ops.map((o) => o.k), checks, allows, diffs: diffs.length });
    for (const d of diffs) run.append('diffs.jsonl', d);
    return diffs.filter((d) => d.kind === 'allow_expansion').length === 0;
  };
  const prop = fc.asyncProperty(seqArb, async (ops) => runner(ops));
  const fcRes = await fc.check(prop, { numRuns: params.property_test.sequences_provisional_n, seed: params.seed, endOnFailure: false, verbose: 0 });
  run.writeJson('property-sequences.json', { fast_check: { failed: fcRes.failed, numRuns: fcRes.numRuns, seed: fcRes.seed, counterexample: fcRes.counterexample, counterexamplePath: fcRes.counterexamplePath }, sequences: seqResults });
  await pg.stopAll();
  log(`property part: ${seqResults.length} sequences`);
  // ================= part 2: escalation negatives (custom role service) + part 3: paging during revocation =========
  s = await startStack({ tc: TC, run, engine: 'openfga', dataset: ds, portBase: base });
  const RESERVED = new Set(['manage', 'manage_roles', 'view_audit', 'revoke_session', 'config', 'admin']);
  const roles = new Map();
  const evalPerm = async (sub, tid, perm, type, id) => { const r = await s.evaluate({ subject: { type: 'core/user', id: sub, properties: { tid, principal_type: 'human', acr: 'L2-PR' } }, action: { name: perm }, resource: { type, id, properties: { tid } }, context: { 'x-authz-profile': { profile_version: '1.0' } } }); return r.json()?.decision === true; };
  const createRole = async (tid, creator, perms, folder) => {
    if (perms.some((p) => RESERVED.has(p))) return { ok: false, why: 'reserved_permission' };
    for (const p of perms) if (!(await evalPerm(creator, tid, p, 'files/folder', folder))) return { ok: false, why: `creator_lacks_${p}` };
    const id = syntheticId(); roles.set(id, { tid, perms, folder });
    const rel = perms.includes('write') ? 'editor' : 'viewer';
    const w = await s.writeTuples(tid, { writes: [{ resource: { type: 'files/folder', id: folder }, relation: rel, subject: { type: 'core/role', id, relation: 'assignee' } }] });
    return { ok: w.status === 200, id };
  };
  const assignRole = async (tid, roleId, assignee, { external = false } = {}) => {
    const r = roles.get(roleId);
    if (!r || r.tid !== tid) return { ok: false, why: 'role_not_in_tenant' };
    if (external && r.perms.some((p) => RESERVED.has(p))) return { ok: false, why: 'external_principal_admin_or_privileged (D24-12)' };
    const w = await s.writeTuples(tid, { writes: [{ resource: { type: 'core/role', id: roleId }, relation: 'assignee', subject: { type: 'core/user', id: assignee } }] });
    return { ok: w.status === 200 };
  };
  const fA = ds.folders.find((f) => f.tid === T1.id);
  const adminT1 = ds.tuples.find((t) => t.resource.type === 'core/tenant' && t.resource.id === T1.id && t.relation === 'admin').subject.id;
  const ownerA = fA.owner;
  const q = ds.users.filter((u) => u.memberships.some((m) => m.tid === T1.id)).map((u) => u.id);
  const rr = refEvaluate({ tuples: ds.tuples, queries: q.map((u) => ({ user: u, type: 'files/folder', id: fA.id, permission: 'write' })), now: new Date() });
  const viewerOnly = q.find((u, i) => rr[i] === false && u !== ownerA);
  const esc = {};
  esc.reserved_permission = (await createRole(T1.id, adminT1, ['read', 'manage'], fA.id)).ok;
  esc.creator_lacks_permission = (await createRole(T1.id, viewerOnly, ['write'], fA.id)).ok;
  const roleT2 = await createRole(T2.id, ds.folders.find((f) => f.tid === T2.id).owner, ['read'], ds.folders.find((f) => f.tid === T2.id).id);
  esc.other_tenant_role_assign_service = (await assignRole(T1.id, roleT2.id, ownerA)).ok;
  const fsTls = clientTls(s.topo, 'file-service');
  const crossWrite = await request(`${s.topo.urls.pdp}/v1/tenants/${T1.id}/relationships/write`, { tls: fsTls, body: { writes: [{ resource: { type: 'files/folder', id: fA.id }, relation: 'viewer', subject: { type: 'core/role', id: roleT2.id, relation: 'assignee' } }] } });
  esc.other_tenant_role_tuple_via_facade = crossWrite.status === 200;
  const okRole = await createRole(T1.id, ownerA, ['read', 'write'], fA.id);
  const ext = outsiders[0];
  roles.set('platform-tenant-admin-role', { tid: T1.id, perms: ['manage', 'manage_roles'], folder: null, platform: true });
  esc.external_gets_admin_role = (await assignRole(T1.id, 'platform-tenant-admin-role', ext, { external: true })).ok;
  const extAdmin = await request(`${s.topo.urls.pdp}/v1/tenants/${T1.id}/relationships/write`, { tls: fsTls, body: { writes: [{ resource: { type: 'core/tenant', id: T1.id }, relation: 'admin', subject: { type: 'core/user', id: ext } }] } });
  esc.external_tenant_admin_via_domain_writer = extAdmin.status === 200;
  const controls = { valid_role_created: okRole.ok, internal_assignment: (await assignRole(T1.id, okRole.id, viewerOnly)).ok };
  // paging during revocation
  const paging = [];
  for (let t = 0; t < params.paging.trials; t++) {
    const pool = q.filter((x) => x !== viewerOnly && x !== ownerA && x !== adminT1);
    const u = pool[(t * 7 + 3) % pool.length];
    const victimFiles = ds.files.filter((f) => f.tid === T1.id).slice(0, params.paging.files).map((f) => f.id);
    const grants = victimFiles.map((id) => ({ resource: { type: 'files/file', id }, relation: 'viewer', subject: { type: 'core/user', id: u } }));
    for (let i = 0; i < grants.length; i += 100) await s.writeTuples(T1.id, { writes: grants.slice(i, i + 100), on_duplicate: 'ignore' });
    const ses = await s.login({ sub: u, tid: T1.id });
    const p1 = await ses.call('GET', `/t/${T1.id}/files?limit=${params.paging.page_limit}`);
    const first = new Set((p1.body?.items || []).map((x) => x.id));
    const toRevoke = grants.filter((g) => !first.has(g.resource.id));
    for (let i = 0; i < toRevoke.length; i += 100) await s.deleteTuples(T1.id, toRevoke.slice(i, i + 100));
    const revokedIds = new Set(toRevoke.map((g) => g.resource.id));
    const refAfter = refEvaluate({ tuples: [...ds.tuples.filter((x) => x.tid === T1.id || true), ...grants.filter((g) => first.has(g.resource.id))], queries: [...revokedIds].map((id) => ({ user: u, type: 'files/file', id, permission: 'read' })), now: new Date() });
    const stillLegit = new Set([...revokedIds].filter((id, i) => refAfter[i] === true));
    let cur = p1.body?.next_cursor; const later = [];
    for (let i = 0; i < 20 && cur; i++) { const r = await ses.call('GET', `/t/${T1.id}/files?limit=${params.paging.page_limit}&cursor=${encodeURIComponent(cur)}`); later.push(...(r.body?.items || []).map((x) => x.id)); cur = r.body?.next_cursor; }
    paging.push({ trial: t, first_page: first.size, revoked: revokedIds.size, still_readable_otherwise: stillLegit.size, returned_after: later.length, revoked_returned: later.filter((id) => revokedIds.has(id) && !stillLegit.has(id)).length });
  }
  await s.stop(); s = null;
  run.writeJson('escalation-paging.json', { escalation: esc, controls, paging });
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  const diffsAll = seqResults.reduce((a, x) => a + x.diffs, 0);
  const allDiffs = (await import('node:fs')).default.existsSync(run.file('diffs.jsonl')) ? (await import('node:fs')).default.readFileSync(run.file('diffs.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const allowExp = allDiffs.filter((d) => d.kind === 'allow_expansion').length;
  const denyExp = allDiffs.filter((d) => d.kind === 'deny_expansion');
  const errors = allDiffs.filter((d) => d.kind === 'error').length;
  const escSucc = Object.values(esc).filter(Boolean).length;
  const pagingRet = paging.reduce((a, x) => a + x.revoked_returned, 0);
  Object.assign(evalOut, {
    verdict: '判定保留',
    note: '計画 §3.4 で「待（KP-4）」。p_max が決まらず n を凍結できないため、合否判定のための実行ではない（要旨 4）。暫定 n で値を記録した',
    values: {
      sequences: seqResults.length, checks: seqResults.reduce((a, x) => a + x.checks, 0), ref_allows: seqResults.reduce((a, x) => a + x.allows, 0),
      allow_expansion_diffs: allowExp, deny_expansion_diffs: denyExp.length, engine_errors: errors, diffs_total: diffsAll,
      residual_rate_upper_95_if_zero: allowExp === 0 ? 3 / seqResults.length : null,
      escalation_success: escSucc, escalation: esc, escalation_controls: controls,
      revoked_returned_in_paging: pagingRet, paging,
    },
    reference_against_criteria: { allow_expansion_0: allowExp === 0, escalation_0: escSucc === 0 && controls.valid_role_created && controls.internal_assignment, revoked_returned_0: pagingRet === 0, deny_expansion_explained: denyExp.length === 0 ? 'なし' : '要説明（diffs.jsonl）' },
  });
  log(`values ${JSON.stringify({ allowExp, denyExp: denyExp.length, errors, escSucc, pagingRet })}`);
} catch (e) {
  if (e.harnessCheck) status = 'harness-check';
  else { status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error'; evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack }; evalOut.verdict = '中止'; console.error(e.stack); }
} finally {
  await pg.stopAll();
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, ['property-sequences.json', 'escalation-paging.json', 'diffs.jsonl']); else run.writeJson('harness-check.json', { abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
