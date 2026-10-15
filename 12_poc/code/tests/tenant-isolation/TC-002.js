// TC-002 cross-tenant property test (test plan §4.2, frozen commit 151940a).
//
//   node tests/tenant-isolation/TC-002.js [--config C1-openfga-correct|all] [--mutants all|<id>] [--prefreeze --n <n>]
//
// Steps (§4.2 手順):
//  (1) synthetic tenants / resources / relations (data/gen-synthetic.js); expected values from the Python reference
//      evaluator (ref/ref_eval.py via ref_server.py) on a mirror of every accepted relationship write.
//  (2) fast-check generated sequences of operations (grant, revoke, folder move, external share, group nesting) and
//      probes that mix other tenants' resource IDs, subject IDs and tids, including a lying tid and another tenant's
//      genuine token, sent to every entry point: services A (tool) / B (file) / C (label) through the edge (BFF
//      sessions), the same services directly with STS-signed tokens carrying a rewritten tid, the façade evaluation /
//      evaluations, and the lists (folder.list, file.search, façade search). Both engines (OpenFGA, Cedar).
//  (3) the same with a deliberately wrong "全域 permit" domain model (TC-002.params.json permit_all_model).
//  (4) mutants (mutants.js): k = 3 each of PEP call removed / tenant scope removed / DB row condition removed.
// Raw data: 12_poc/data/tenant-isolation/TC-002/<run-id>/ ; evaluation: TC-002.eval.js (eval.json).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fc from 'fast-check';
import { startStack } from '../../harness/stack.js';
import { generate, nonSyntheticIds } from '../../data/gen-synthetic.js';
import { request } from '../../lib/http.js';
import { clientTls, CODE_DIR } from '../../lib/topology.js';
import { x5tS256 } from '../../lib/pki.js';
import { seededRng, opaqueId } from '../../lib/ids.js';
import { loadIssuerKeys, signRaw, atPayload } from '../../harness/forge.js';
import { args } from '../../lib/runtime.js';
import { HERE, newRun, RefOracle, materialiseMutant, MUTANT_ROOT, checkManifest, freezeSnapshot } from './common.js';
import { MUTANTS } from './mutants.js';

const P = JSON.parse(fs.readFileSync(path.join(HERE, 'TC-002.params.json'), 'utf8'));
const CAM_FILE = path.join(CODE_DIR, 'model', 'cam.json');
const DOMAIN_TYPES = ['files/folder', 'files/file', 'proj/project', 'proj/tool_instance'];
const PROBE_TYPES = { 'files/file': ['read', 'write', 'delete', 'share'], 'files/folder': ['read', 'write', 'share'], 'proj/project': ['view', 'admin'], 'proj/tool_instance': ['use', 'view', 'config'], 'core/unit': ['manage', 'view_directory'], 'core/tenant': ['belongs', 'manage', 'view_audit'] };
const SEARCH_TYPES = [['files/file', 'read'], ['files/folder', 'read'], ['proj/project', 'view'], ['proj/tool_instance', 'view']];

// ------------------------------------------------------------------------------------------------
// wrong "全域 permit" model (step 3)
// ------------------------------------------------------------------------------------------------
export function permitAllCam() {
  const cam = JSON.parse(fs.readFileSync(CAM_FILE, 'utf8'));
  cam.$comment = 'TC-002 deliberately wrong domain model (全域 permit). Test-only.';
  cam.cam_version = '0.1.0-tc002-permit-all';
  cam.types.push({ name: 'dom/everyone', relations: [{ name: 'member', directly_related: ['core/user'] }] });
  for (const t of cam.types) {
    if (!DOMAIN_TYPES.includes(t.name)) continue;
    t.relations.push({ name: 'everyone', directly_related: ['dom/everyone'] });
    for (const p of t.permissions || []) p.expression = `everyone->member | (${p.expression})`;
  }
  return cam;
}

const weighted = (w) => fc.oneof(...Object.entries(w).map(([k, weight]) => ({ arbitrary: fc.constant(k), weight })));
const stepArb = fc.record({
  kind: weighted(P.step_weights),
  cross: fc.oneof({ arbitrary: fc.constant(true), weight: Math.round(P.cross_ratio * 100) }, { arbitrary: fc.constant(false), weight: Math.round((1 - P.cross_ratio) * 100) }),
  op: weighted(P.op_weights),
  ep: weighted(P.edge_entry_point_weights),
  pathVariant: weighted(P.edge_cross_path_variant_weights),
  fVariant: weighted(P.facade_tid_variant_weights),
  dVariant: weighted(P.direct_tid_variant_weights),
  rs: fc.integer({ min: 1, max: 2 ** 31 - 1 }),
});
function* steps(seed) {
  for (let chunk = 0; ; chunk++) for (const s of fc.sample(stepArb, { seed: seed + chunk, numRuns: 500 })) yield s;
}

// ------------------------------------------------------------------------------------------------
// one configuration (engine x model [x mutant])
// ------------------------------------------------------------------------------------------------
async function runConfig(run, cfg, { nCross, stepSeed, dsSeed, mutant }) {
  const t0 = Date.now();
  const log = (m) => console.log(`[${cfg.id}${mutant ? ' ' + mutant.id : ''}] ${m}`);
  const ds = generate({ seed: dsSeed, profile: P.dataset.profile });
  const bad = nonSyntheticIds(ds);
  if (bad.length) return { status: 'aborted:C-1 non-synthetic ids', bad: bad.slice(0, 5) };
  const ref = new RefOracle();
  let s;
  const cfgDir = path.join(run.dir, 'configs', mutant ? `mutant-${mutant.id}` : cfg.id);
  fs.mkdirSync(cfgDir, { recursive: true });
  const rec = (name, r) => fs.appendFileSync(path.join(cfgDir, name), JSON.stringify({ t: new Date().toISOString(), ...r }) + '\n');
  try {
    let scripts;
    if (mutant) {
      const m = materialiseMutant(mutant, path.join(MUTANT_ROOT, run.runId, mutant.id));
      scripts = m.scripts;
      rec('inject.jsonl', { inject: 'mutant', id: mutant.id, class: mutant.class, components: Object.keys(scripts), files: mutant.files.map((f) => f.path) });
    }
    // per-configuration view of the run: components write into configs/<id>/, secrets go to .run/TC-002-<run-id>-<cfg>/
    const runView = Object.create(run);
    runView.runId = `${run.runId}-${mutant ? 'm' + mutant.index : 'c' + cfg.index}`;
    runView.dir = cfgDir;
    s = await startStack({ tc: 'TC-002', run: runView, engine: cfg.engine, dataset: ds, settings: P.settings, scripts, purpose: cfg.id });
    log(`stack up in ${Date.now() - t0} ms (engine=${cfg.engine}, model=${cfg.model})`);
    const tuplesFile = path.join(s.topo.secretsDir, 'ref-tuples.json');
    fs.writeFileSync(tuplesFile, JSON.stringify(ds.tuples));
    const wrongCamFile = path.join(s.topo.secretsDir, 'cam-permit-all.json');
    fs.writeFileSync(wrongCamFile, JSON.stringify(permitAllCam()));
    await ref.init({ correct: CAM_FILE, wrong: wrongCamFile }, tuplesFile);
    const activeModel = cfg.model === 'permit_all' ? 'wrong' : 'correct';

    // ---- index of the synthetic world --------------------------------------------------------------
    const trueTenant = new Map();
    const reg = (type, id, tid) => trueTenant.set(`${type}:${id}`, tid);
    ds.tenants.forEach((t) => reg('core/tenant', t.id, t.id));
    ds.files.forEach((f) => reg('files/file', f.id, f.tid));
    ds.folders.forEach((f) => reg('files/folder', f.id, f.tid));
    ds.projects.forEach((p) => reg('proj/project', p.id, p.tid));
    ds.tools.forEach((t) => reg('proj/tool_instance', t.id, t.tid));
    ds.units.forEach((u) => reg('core/unit', u.id, u.tid));
    ds.groups.forEach((g) => reg('core/group', g.id, g.tid));
    const tids = ds.tenants.map((t) => t.id);
    const internal = new Map(ds.users.map((u) => [u.id, new Set(u.memberships.filter((m) => m.kind === 'member').map((m) => m.tid))]));
    const external = new Map(ds.users.map((u) => [u.id, new Set(u.memberships.filter((m) => m.kind === 'external').map((m) => m.tid))]));
    const pool = Object.fromEntries(tids.map((t) => [t, {
      files: ds.files.filter((f) => f.tid === t).map((f) => f.id), folders: ds.folders.filter((f) => f.tid === t).map((f) => f.id),
      tools: ds.tools.filter((x) => x.tid === t).map((x) => x.id), projects: ds.projects.filter((x) => x.tid === t).map((x) => x.id),
      units: ds.units.filter((x) => x.tid === t).map((x) => x.id), groups: ds.groups.filter((x) => x.tid === t).map((x) => x.id),
      users: ds.users.filter((u) => internal.get(u.id).has(t)).map((u) => u.id),
    }]));
    const fileParent = new Map(ds.files.map((f) => [f.id, f.folder]));
    const granted = []; // tuples written by grant ops (for revoke)
    // group nesting graph (child group -> parent groups), used when params.group_nesting_respects_cam is set (v1.1)
    const groupParents = new Map();
    for (const g of ds.groups) if (g.nested_in) groupParents.set(g.id, new Set([g.nested_in]));
    const groupChainOk = (parent, child, maxDepth) => {
      // would "child is a member of parent" create a cycle or a nesting chain longer than maxDepth groups?
      const up = (g, seen = new Set()) => { if (seen.has(g)) return Infinity; seen.add(g); let d = 1; for (const p of groupParents.get(g) || []) d = Math.max(d, 1 + up(p, new Set(seen))); return d; };
      const downDepth = (g, seen = new Set()) => { if (seen.has(g)) return Infinity; seen.add(g); let d = 1; for (const [c, ps] of groupParents) if (ps.has(g)) d = Math.max(d, 1 + downDepth(c, new Set(seen))); return d; };
      if (parent === child) return false;
      const reach = (from, to, seen = new Set()) => { if (from === to) return true; if (seen.has(from)) return false; seen.add(from); return [...(groupParents.get(from) || [])].some((p) => reach(p, to, seen)); };
      if (reach(parent, child)) return false; // parent already (transitively) inside child -> cycle
      return up(parent) + downDepth(child) <= maxDepth;
    };

    // ---- permit-all model (step 3) ---------------------------------------------------------------------
    if (cfg.model === 'permit_all') {
      const cam = permitAllCam();
      const r = await s.req(`${s.topo.urls.pdp}/v1/models?activate=true`, { body: { cam } });
      if (r.status !== 201) throw new Error(`permit-all model registration failed ${r.status} ${r.text}`);
      rec('inject.jsonl', { inject: 'model', model: 'permit_all', model_revision: r.json().model_revision });
      const evTuples = [];
      for (const t of tids) {
        const ev = `syneveryone${t.slice(3, 18)}`;
        const w = ds.users.map((u) => ({ resource: { type: 'dom/everyone', id: ev }, relation: 'member', subject: { type: 'core/user', id: u.id } }));
        for (const type of DOMAIN_TYPES) {
          const ids = type === 'files/file' ? pool[t].files : type === 'files/folder' ? pool[t].folders : type === 'proj/project' ? pool[t].projects : pool[t].tools;
          for (const id of ids) w.push({ resource: { type, id }, relation: 'everyone', subject: { type: 'dom/everyone', id: ev } });
        }
        // dom/everyone object first (registers its tenant), then the rest
        for (let i = 0; i < w.length; i += 100) {
          const wr = await s.writeTuples(t, { writes: w.slice(i, i + 100), on_duplicate: 'ignore' });
          if (wr.status !== 200) throw new Error(`everyone tuples ${wr.status} ${wr.text}`);
        }
        evTuples.push(...w);
      }
      await ref.write(evTuples);
      rec('inject.jsonl', { inject: 'model_tuples', count: evTuples.length });
    }

    // ---- sessions (BFF; another tenant's genuine token = a session of another tenant) -------------------
    const sessions = [];
    const rngS = seededRng(`tc002-sessions:${dsSeed}`);
    const pickS = (a) => a[Math.floor(rngS() * a.length)];
    const want = [];
    for (const t of tids) {
      const us = [...pool[t].users];
      const owners = new Set(ds.folders.filter((f) => f.tid === t).map((f) => f.owner));
      const chosen = new Set([...owners].slice(0, 3));
      while (chosen.size < Math.min(P.sessions.home_users_per_tenant, us.length)) chosen.add(pickS(us));
      for (const u of chosen) want.push({ sub: u, tid: t, kind: 'home' });
    }
    for (const u of ds.users) {
      const ints = [...internal.get(u.id)];
      if (P.sessions.include_multi_tenant_contexts && ints.length > 1) for (const t of ints) if (!want.some((w) => w.sub === u.id && w.tid === t)) want.push({ sub: u.id, tid: t, kind: 'multi' });
      if (P.sessions.include_external_guests) for (const t of external.get(u.id)) want.push({ sub: u.id, tid: t, kind: 'guest' });
    }
    for (const w of want) {
      const u = await s.login({ sub: w.sub, tid: w.tid, amr: P.sessions.amr });
      if (!u.ok) throw new Error(`login failed ${w.sub}@${w.tid}: ${u.status}`);
      sessions.push({ ...w, call: u.call });
    }
    rec('sessions.jsonl', { sessions: sessions.map(({ call, ...x }) => x) });
    log(`${sessions.length} sessions in ${Date.now() - t0} ms`);

    // ---- forging (direct channel: tid rewritten in an STS-signed token) ------------------------------
    const atKey = (await loadIssuerKeys(s.topo, 'at')).find((k) => k.state === 'active');
    const txnKey = (await loadIssuerKeys(s.topo, 'txn')).find((k) => k.state === 'active');
    const htls = clientTls(s.topo, 'harness');
    const harnessX5t = x5tS256(fs.readFileSync(s.topo.workloads.harness.cert, 'utf8'));

    // ---- oracles ------------------------------------------------------------------------------------------
    const now = () => new Date();
    const belongs = (sub, tid) => ref.check('correct', sub, 'core/tenant', tid, 'belongs', now());
    async function oracle(model, sub, sTid, rTid, type, id, perm) {
      if (sTid !== rTid) return false;
      if (trueTenant.get(`${type}:${id}`) !== rTid) return false;
      if (!(await belongs(sub, rTid))) return false;
      return (await ref.check(model, sub, type, id, perm, now())) === true;
    }
    const both = async (sub, sTid, rTid, type, id, perm) => ({ sys: await oracle(activeModel, sub, sTid, rTid, type, id, perm), cor: await oracle('correct', sub, sTid, rTid, type, id, perm) });
    const isInternal = (sub, tid) => internal.get(sub)?.has(tid) || false;
    const isExternal = (sub, tid) => external.get(sub)?.has(tid) || false;
    function crossClass(sub, ctxTid, resTenants) {
      const cross = resTenants.some((rt) => rt !== ctxTid || !isInternal(sub, rt));
      if (!cross) return null;
      if (resTenants.every((rt) => rt === ctxTid) && isExternal(sub, ctxTid) && !isInternal(sub, ctxTid)) return 'X2';
      return 'X1';
    }

    // ---- counters -------------------------------------------------------------------------------------
    const C = { probes: 0, cross: 0, crossX1: 0, crossX2: 0, same: 0, violations: 0, itemViolations: 0, positives: 0, positiveFail: 0, sameMismatch: 0, sameDecided: 0, errors: 0, ops: 0, opsRejected: 0, byKind: {}, byVariant: {} };
    const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
    let probeNo = 0;
    function account(r) {
      C.probes++;
      if (r.cross) { C.cross++; if (r.cross === 'X2') C.crossX2++; else C.crossX1++; } else C.same++;
      if (r.observed === 'error') C.errors++;
      if (r.violation) C.violations++;
      if (!r.cross && r.observed !== 'error') {
        C.sameDecided++;
        if ((r.observed === 'allow') !== r.expected_sys) C.sameMismatch++;
      }
      if (!r.cross && r.expected_sys) { C.positives++; if (r.observed !== 'allow') C.positiveFail++; }
      rec('requests.jsonl', r);
    }
    const statusClass = (st) => (st >= 200 && st < 300 ? 'allow' : st === 400 ? 'allow' : [401, 403, 404].includes(st) ? 'deny' : 'error');

    // ---- ops --------------------------------------------------------------------------------------------
    const T = (type, id, relation, st, sid, srel, condition) => ({ resource: { type, id }, relation, subject: srel ? { type: st, id: sid, relation: srel } : { type: st, id: sid }, ...(condition ? { condition } : {}) });
    async function doOp(step, rng) {
      const pick = (a) => a[Math.floor(rng() * a.length)];
      const t = pick(tids);
      const other = pick(tids.filter((x) => x !== t));
      let writes = [], deletes = [], tidW = t, expectReject = false;
      switch (step.op) {
        case 'grant_same': writes = [T(rng() < 0.5 ? 'files/file' : 'files/folder', null, pick(['viewer', 'editor']), 'core/user', pick(pool[t].users))]; break;
        case 'grant_foreign_user': writes = [T(rng() < 0.5 ? 'files/file' : 'files/folder', null, 'viewer', 'core/user', pick(pool[other].users))]; break;
        case 'revoke': {
          if (granted.length && rng() < 0.6) { const g = granted.splice(Math.floor(rng() * granted.length), 1)[0]; deletes = [g.tuple]; tidW = g.tid; } else {
            const cand = ds.tuples.filter((x) => x.relation === 'viewer' && x.subject.type === 'core/user');
            const c = pick(cand); const { tid, ...tu } = c; deletes = [tu]; tidW = tid;
          }
          break;
        }
        case 'move_same': case 'move_cross': {
          const f = pick(pool[t].files);
          const to = step.op === 'move_same' ? pick(pool[t].folders) : pick(pool[other].folders);
          expectReject = step.op === 'move_cross';
          deletes = [T('files/file', f, 'parent', 'files/folder', fileParent.get(f))];
          writes = [T('files/file', f, 'parent', 'files/folder', to)];
          break;
        }
        case 'external_share': {
          const g = pick(pool[other].users);
          const gid = `synxg${crypto.randomBytes(11).toString('hex').slice(0, 21)}`;
          const expired = rng() < 0.3;
          const expires_at = new Date(Date.now() + (expired ? -3600_000 : 7 * 86400_000)).toISOString();
          const target = rng() < 0.5 ? ['files/folder', pick(pool[t].folders)] : ['files/file', pick(pool[t].files)];
          writes = [T('core/external_grant', gid, 'grantee', 'core/user', g, null, { name: 'c.not_expired', context: { expires_at } }), T(target[0], target[1], 'viewer', 'core/external_grant', gid, 'grantee'), T('core/tenant', t, 'external_member', 'core/user', g)];
          break;
        }
        case 'group_nest_same': {
          const [a, b] = [pick(pool[t].groups), pick(pool[t].groups)];
          if (a === b) return null;
          if (P.group_nesting_respects_cam && !groupChainOk(a, b, P.group_nesting_respects_cam.max_depth)) { rec('ops.jsonl', { op: step.op, tid: t, skipped: 'would create a group cycle or exceed the CAM max_depth (no request sent)', parent: a, child: b }); C.opsSkipped = (C.opsSkipped || 0) + 1; return null; }
          writes = [T('core/group', a, 'member', 'core/group', b, 'member')];
          break;
        }
        case 'group_nest_cross': writes = [T('core/group', pick(pool[t].groups), 'member', 'core/group', pick(pool[other].groups), 'member')]; expectReject = true; break;
        case 'grant_foreign_group': writes = [T(rng() < 0.5 ? 'files/file' : 'files/folder', null, 'viewer', 'core/group', pick(pool[other].groups), 'member')]; expectReject = true; break;
        default: return null;
      }
      for (const w of writes) if (w.resource.id === null) w.resource.id = w.resource.type === 'files/file' ? pick(pool[t].files) : pick(pool[t].folders);
      let r;
      if (deletes.length && writes.length) {
        const d = await s.deleteTuples(tidW, deletes);
        const w = d.status === 200 ? await s.writeTuples(tidW, { writes, on_duplicate: 'ignore' }) : d;
        r = w;
        if (d.status === 200) await ref.delete(deletes);
        if (d.status === 200 && w.status !== 200) { await s.writeTuples(tidW, { writes: deletes, on_duplicate: 'ignore' }); await ref.write(deletes); } // restore old parent
      } else if (deletes.length) {
        r = await s.req(`${s.topo.urls.pdp}/v1/tenants/${tidW}/relationships/delete`, { body: { deletes, on_missing: 'ignore' } });
        if (r.status === 200) await ref.delete(deletes);
      } else {
        r = await s.writeTuples(tidW, { writes, on_duplicate: 'ignore' });
      }
      const accepted = r.status === 200;
      if (accepted && writes.length) {
        await ref.write(writes);
        for (const w of writes) {
          if (w.resource.type === 'files/file' && w.relation === 'parent') fileParent.set(w.resource.id, w.subject.id);
          if (w.resource.type === 'core/external_grant') trueTenant.set(`core/external_grant:${w.resource.id}`, tidW);
          if (w.relation === 'external_member') external.get(w.subject.id)?.add(tidW);
          if (['viewer', 'editor'].includes(w.relation) && w.subject.type === 'core/user') granted.push({ tid: tidW, tuple: w });
          if (w.resource.type === 'core/group' && w.relation === 'member' && w.subject.type === 'core/group') { if (!groupParents.has(w.subject.id)) groupParents.set(w.subject.id, new Set()); groupParents.get(w.subject.id).add(w.resource.id); }
        }
      }
      C.ops++;
      if (!accepted) C.opsRejected++;
      rec('ops.jsonl', { op: step.op, tid: tidW, writes, deletes, status: r.status, accepted, expect_reject: expectReject, detail: accepted ? undefined : String(r.text || '').slice(0, 200) });
      return { accepted, expectReject };
    }

    // ---- probes: edge (BFF session) ----------------------------------------------------------------------
    const EP_RES = { 'file.read': 'files/file', 'file.write': 'files/file', 'file.share': 'files/file', 'file.move': 'files/file', 'file.signed_url': 'files/file', 'folder.list': 'files/folder', 'file.search': null, 'label.read': 'files/file', 'tool.view': 'proj/tool_instance', 'tool.run': 'proj/tool_instance', 'tool.config': 'proj/tool_instance', 'file.delete': 'files/file', 'file.create': 'files/folder' };
    const EP_PERM = { 'file.read': 'read', 'file.write': 'write', 'file.share': 'share', 'file.move': 'write', 'file.signed_url': 'read', 'folder.list': 'read', 'label.read': 'read', 'tool.view': 'view', 'tool.run': 'use', 'tool.config': 'config', 'file.delete': 'delete', 'file.create': 'write' };
    const poolKey = { 'files/file': 'files', 'files/folder': 'folders', 'proj/tool_instance': 'tools' };
    async function chooseSameResource(sub, tid, type, perm, rng) {
      let id;
      for (let i = 0; i < 4; i++) {
        id = pool[tid][poolKey[type]][Math.floor(rng() * pool[tid][poolKey[type]].length)];
        if (await oracle(activeModel, sub, tid, tid, type, id, perm)) break;
      }
      return id;
    }
    async function edgeProbe(step, rng) {
      let ep = step.ep;
      const pick = (a) => a[Math.floor(rng() * a.length)];
      if (!step.cross && ['file.delete', 'file.create'].includes(ep)) ep = 'file.read'; // positives never mutate the service store
      const sess = pick(sessions);
      const t = sess.tid;
      const type = EP_RES[ep];
      const foreignTenant = pick(tids.filter((x) => x !== t));
      // involved resources
      let id, resTenant = t, extra = null;
      if (type) {
        if (step.cross && !(ep === 'tool.run' && rng() < 0.5) && !(ep === 'file.move' && rng() < 0.5)) { resTenant = foreignTenant; id = pick(pool[resTenant][poolKey[type]]); }
        else id = await chooseSameResource(sess.sub, t, type, EP_PERM[ep], rng);
      }
      let pathTid = t;
      if (step.cross && type && resTenant !== t && step.pathVariant === 'resource_tid_path') pathTid = resTenant;
      let method = 'GET', p, body;
      switch (ep) {
        case 'file.read': p = `/t/${pathTid}/files/${id}`; break;
        case 'file.write': method = 'PUT'; p = `/t/${pathTid}/files/${id}`; body = { content: `tc002 ${opaqueId(8)}` }; break;
        case 'file.delete': method = 'DELETE'; p = `/t/${pathTid}/files/${id}`; break;
        case 'file.share': { method = 'POST'; p = `/t/${pathTid}/files/${id}/share`; const g = pick(pool[t].users); body = { grantee_sub: g }; extra = { grantee: g }; break; }
        case 'file.move': {
          method = 'POST'; p = `/t/${pathTid}/files/${id}/move`;
          const toTenant = step.cross && resTenant === t ? foreignTenant : t;
          const to = pick(pool[toTenant].folders);
          body = { to_folder: to }; extra = { to_folder: to, to_tenant: toTenant }; break;
        }
        case 'file.signed_url': method = 'POST'; p = `/t/${pathTid}/files/${id}/url`; break;
        case 'folder.list': p = `/t/${pathTid}/folders/${id}/files`; break;
        case 'file.search': p = `/t/${step.cross ? (step.pathVariant === 'resource_tid_path' ? foreignTenant : t) : t}/files?limit=50`; if (step.cross && step.pathVariant === 'resource_tid_path') pathTid = foreignTenant; break;
        case 'label.read': p = `/t/${pathTid}/labels/${id}`; break;
        case 'tool.view': p = `/t/${pathTid}/tools/${id}`; break;
        case 'tool.run': {
          method = 'POST'; p = `/t/${pathTid}/tools/${id}/run`;
          const fTenant = step.cross && resTenant === t ? foreignTenant : t;
          const fid = fTenant === t ? await chooseSameResource(sess.sub, t, 'files/file', 'read', rng) : pick(pool[fTenant].files);
          body = { file_id: fid, with_labels: rng() < 0.5 }; extra = { file_id: fid, file_tenant: fTenant }; break;
        }
        case 'tool.config': method = 'PUT'; p = `/t/${pathTid}/tools/${id}/config`; body = { config: { tc002: opaqueId(6) } }; break;
        case 'file.create': method = 'POST'; p = `/t/${pathTid}/folders/${id}/files`; body = { content: 'tc002 create' }; break;
        default: throw new Error(ep);
      }
      // expected values
      const checks = [];
      if (type) checks.push([type, id, EP_PERM[ep]]);
      if (ep === 'file.move') checks.push(['files/folder', extra.to_folder, 'write']);
      if (ep === 'tool.run') checks.push(['files/file', extra.file_id, 'read']);
      let sys = pathTid === t, cor = pathTid === t;
      for (const [ct, cid, cp] of checks) { const o = await both(sess.sub, t, t, ct, cid, cp); sys = sys && o.sys; cor = cor && o.cor; }
      const resTenants = [...checks.map(([ct, cid]) => trueTenant.get(`${ct}:${cid}`)), pathTid];
      const cross = crossClass(sess.sub, t, resTenants);
      const sent = new Date().toISOString();
      const res = await sess.call(method, p, body);
      const observed = statusClass(res.status);
      const r = { i: ++probeNo, ch: 'edge', ep, method, path_tid: pathTid, token_tid: t, session_kind: sess.kind, sub: sess.sub, res: type ? { type, id, tid: trueTenant.get(`${type}:${id}`) } : null, extra, cross, path_variant: step.cross ? step.pathVariant : null, sent, recv: new Date().toISOString(), status: res.status, observed, expected_sys: sys, expected_correct: cor, trace_id: res.headers['x-edge-trace-id'] };
      // list items
      if (observed === 'allow' && (ep === 'folder.list' || ep === 'file.search') && res.body && Array.isArray(res.body.items)) {
        r.items = [];
        for (const it of res.body.items) {
          const itT = trueTenant.get(`files/file:${it.id}`);
          const okCor = await oracle('correct', sess.sub, t, t, 'files/file', it.id, 'read');
          const itCross = crossClass(sess.sub, t, [itT]);
          const v = itT !== t || (itCross && !okCor);
          r.items.push({ id: it.id, tid: itT, cross: itCross, expected_correct: okCor, violation: v });
          if (v) C.itemViolations++;
        }
        r.completeness = res.body.completeness;
      }
      r.violation = !!(cross && observed === 'allow' && !cor && ep !== 'file.search') || !!(r.items || []).some((x) => x.violation);
      if (ep === 'file.search' && !cross) r.expected_sys = true; // collection read: always permitted, items are post-checked
      if (ep === 'file.search' && cross) r.violation = r.violation || (observed === 'allow' && pathTid !== t);
      // mirror state changes made by successful positives
      if (observed === 'allow' && res.status < 300) {
        if (ep === 'file.share') { const w = T('files/file', id, 'viewer', 'core/user', extra.grantee); await ref.write([w]); granted.push({ tid: t, tuple: w }); }
        if (ep === 'file.move') { await ref.delete([T('files/file', id, 'parent', 'files/folder', fileParent.get(id))]); await ref.write([T('files/file', id, 'parent', 'files/folder', extra.to_folder)]); fileParent.set(id, extra.to_folder); }
      }
      return r;
    }

    // ---- probes: direct to a service with an STS-signed token whose tid is rewritten -----------------------
    const SVC = { 'file.read': ['file', 'GET', (t, id) => `/t/${t}/files/${id}`, 'files/file', 'read', 'files.read'], 'label.read': ['label', 'GET', (t, id) => `/t/${t}/labels/${id}`, 'files/file', 'read', 'files.read'], 'tool.view': ['tool', 'GET', (t, id) => `/t/${t}/tools/${id}`, 'proj/tool_instance', 'view', 'tools.use'], 'folder.list': ['file', 'GET', (t, id) => `/t/${t}/folders/${id}/files`, 'files/folder', 'read', 'files.read'], 'file.write': ['file', 'PUT', (t, id) => `/t/${t}/files/${id}`, 'files/file', 'write', 'files.write'] };
    async function directProbe(step, rng) {
      const pick = (a) => a[Math.floor(rng() * a.length)];
      const ep = pick(P.direct_entry_points);
      const [svc, method, mk, type, perm, scope] = SVC[ep];
      const u = pick(ds.users);
      const home = [...internal.get(u.id)][0];
      let ft, resT;
      if (step.cross) {
        resT = pick(tids.filter((x) => x !== home));
        ft = step.dVariant === 'forged_tid_resource_tenant' ? resT : home;
      } else { resT = home; ft = home; }
      const id = step.cross ? pick(pool[resT][poolKey[type]]) : await chooseSameResource(u.id, home, type, perm, rng);
      const payload = atPayload(s.topo, { sub: u.id, tid: ft, aud: s.topo.audiences[svc], scope, cnfX5t: harnessX5t, acr: 'L2-PR', amr: ['pwd', 'fido'] });
      const tok = await signRaw({ alg: atKey.alg, typ: 'at+jwt', kid: atKey.kid }, payload, atKey.privateKey);
      const traceId = crypto.randomBytes(16).toString('hex');
      const headers = { authorization: `Bearer ${tok}`, traceparent: `00-${traceId}-${crypto.randomBytes(8).toString('hex')}-01` };
      let body;
      if (method === 'PUT') {
        const nowS = Math.floor(Date.now() / 1000);
        const txn = { iss: s.topo.issuers.tts, aud: s.topo.txnAudience, iat: nowS, exp: nowS + 60, txn: opaqueId(), sub: u.id, scope: 'op.file.write', req_wl: s.topo.workloads.harness.spiffeId, tctx: { tid: ft, root_jti: payload.jti, tier: 'write', ver: '1.0', sid: payload.sid, gref: payload.gref } };
        headers['txn-token'] = await signRaw({ alg: txnKey.alg, typ: 'txntoken+jwt', kid: txnKey.kid }, txn, txnKey.privateKey);
        body = { content: `tc002 direct ${opaqueId(6)}` };
      }
      const o = await both(u.id, ft, ft, type, id, perm);
      const cross = crossClass(u.id, ft, [trueTenant.get(`${type}:${id}`)]);
      const sent = new Date().toISOString();
      let res;
      try { res = await request(`${s.topo.urls[svc]}${mk(ft, id)}`, { method, headers, body, tls: htls, timeoutMs: 10_000 }); } catch (e) { res = { status: 599, json: () => null }; }
      const observed = statusClass(res.status);
      const r = { i: ++probeNo, ch: 'direct', ep, method, token_tid: ft, path_tid: ft, sub: u.id, res: { type, id, tid: trueTenant.get(`${type}:${id}`) }, cross, d_variant: step.cross ? step.dVariant : null, sent, recv: new Date().toISOString(), status: res.status, observed, expected_sys: o.sys, expected_correct: o.cor, trace_id: traceId };
      if (observed === 'allow' && ep === 'folder.list' && Array.isArray(res.json()?.items)) {
        r.items = [];
        for (const it of res.json().items) {
          const itT = trueTenant.get(`files/file:${it.id}`);
          const okCor = await oracle('correct', u.id, ft, ft, 'files/file', it.id, 'read');
          const v = itT !== ft || (crossClass(u.id, ft, [itT]) && !okCor);
          r.items.push({ id: it.id, tid: itT, expected_correct: okCor, violation: v });
          if (v) C.itemViolations++;
        }
      }
      r.violation = !!(cross && observed === 'allow' && !o.cor) || !!(r.items || []).some((x) => x.violation);
      return r;
    }

    // ---- probes: façade evaluation / evaluations / search ------------------------------------------------
    function facadeItem(step, rng) {
      const pick = (a) => a[Math.floor(rng() * a.length)];
      const type = pick(Object.keys(PROBE_TYPES));
      const perm = pick(PROBE_TYPES[type]);
      const u = pick(ds.users);
      const ints = [...internal.get(u.id)];
      const home = pick(ints);
      let resT = step.cross ? pick(tids.filter((x) => !ints.includes(x)).concat(rng() < 0.15 && ints.length > 1 ? ints.filter((x) => x !== home) : [])) : home;
      if (!resT) resT = pick(tids.filter((x) => x !== home));
      if (step.cross && rng() < 0.1 && external.get(u.id).size) resT = pick([...external.get(u.id)]); // guest probing inside the resource tenant (X2)
      const ids = type === 'core/tenant' ? [resT] : pool[resT][{ 'files/file': 'files', 'files/folder': 'folders', 'proj/project': 'projects', 'proj/tool_instance': 'tools', 'core/unit': 'units' }[type]];
      const id = pick(ids);
      let sTid = home, rTid = resT;
      if (step.cross) {
        switch (step.fVariant) {
          case 'honest': sTid = resT !== home && isExternal(u.id, resT) && rng() < 0.5 ? resT : home; rTid = resT; break;
          case 'resource_tid_lie': sTid = home; rTid = home; break;
          case 'subject_tid_lie': sTid = resT; rTid = resT; break;
          case 'random_tids': sTid = pick(tids); rTid = pick(tids); break;
          default: break;
        }
      }
      return { u: u.id, type, id, perm, sTid, rTid, variant: step.cross ? step.fVariant : 'same' };
    }
    const acrProps = (tid) => ({ tid, principal_type: 'human', acr: 'L2-PR', auth_time: Math.floor(Date.now() / 1000) - 5 });
    async function facadeProbe(step, rng) {
      let it = facadeItem(step, rng);
      if (!step.cross) { // positives: try to land on an allowed same-tenant pair
        for (let i = 0; i < 3 && !(await oracle(activeModel, it.u, it.sTid, it.rTid, it.type, it.id, it.perm)); i++) it = facadeItem(step, rng);
      }
      const o = await both(it.u, it.sTid, it.rTid, it.type, it.id, it.perm);
      const cross = crossClass(it.u, it.sTid, [trueTenant.get(`${it.type}:${it.id}`)]);
      const sent = new Date().toISOString();
      const res = await s.evaluate({ subject: { type: 'core/user', id: it.u, properties: acrProps(it.sTid) }, action: { name: it.perm }, resource: { type: it.type, id: it.id, properties: { tid: it.rTid } }, context: { 'x-authz-profile': { profile_version: '1.0' } } });
      const j = res.json();
      const prof = j?.context?.['x-authz-profile'] || {};
      const observed = res.status !== 200 ? 'error' : j.decision === true ? 'allow' : ['deny_unavailable', 'deny_indeterminate'].includes(prof.reason) && o.sys ? 'error' : 'deny';
      return { i: ++probeNo, ch: 'facade_eval', sub: it.u, s_tid: it.sTid, r_tid: it.rTid, res: { type: it.type, id: it.id, tid: trueTenant.get(`${it.type}:${it.id}`) }, perm: it.perm, variant: it.variant, cross, sent, recv: new Date().toISOString(), status: res.status, observed, reason: prof.reason, decision_id: prof.decision_id, expected_sys: o.sys, expected_correct: o.cor, violation: !!(cross && observed === 'allow' && !o.cor) };
    }
    async function batchProbe(step, rng) {
      const pick = (a) => a[Math.floor(rng() * a.length)];
      const first = facadeItem(step, rng);
      const items = [first];
      for (let k = 1; k < P.batch_size; k++) {
        const sub = facadeItem({ ...step, cross: rng() < P.cross_ratio }, rng);
        // same subject + same subject tid for the whole batch (top-level subject)
        const resT = trueTenant.get(`${sub.type}:${sub.id}`);
        items.push({ ...sub, u: first.u, sTid: first.sTid, rTid: rng() < 0.3 ? first.sTid : resT });
      }
      const sem = pick(['execute_all', 'deny_on_first_deny', 'permit_on_first_permit']);
      const usable = sem === 'permit_on_first_permit' ? items.filter((x) => !['config', 'admin', 'manage', 'view_audit'].includes(x.perm)) : items;
      if (!usable.length) return [];
      const body = { subject: { type: 'core/user', id: first.u, properties: acrProps(first.sTid) }, context: { 'x-authz-profile': { profile_version: '1.0' } }, evaluations: usable.map((x) => ({ action: { name: x.perm }, resource: { type: x.type, id: x.id, properties: { tid: x.rTid } } })), options: { evaluations_semantic: sem } };
      const sent = new Date().toISOString();
      const res = await s.req(`${s.topo.urls.pdp}/access/v1/evaluations`, { body, headers: { 'x-request-id': crypto.randomBytes(13).toString('hex') } });
      const j = res.json();
      const out = [];
      const batchId = j?.context?.['x-authz-profile']?.batch_decision_id;
      for (let k = 0; k < usable.length; k++) {
        const x = usable[k];
        const d = j?.evaluations?.[k];
        if (res.status === 200 && !d) break; // short-circuited by the semantic
        const prof = d?.context?.['x-authz-profile'] || {};
        const o = await both(x.u, x.sTid, x.rTid, x.type, x.id, x.perm);
        const cross = crossClass(x.u, x.sTid, [trueTenant.get(`${x.type}:${x.id}`)]);
        const observed = res.status !== 200 ? 'error' : d.decision === true ? 'allow' : ['deny_unavailable', 'deny_indeterminate'].includes(prof.reason) && o.sys ? 'error' : 'deny';
        out.push({ i: ++probeNo, ch: 'facade_batch', semantic: sem, batch_decision_id: batchId, item: k, sub: x.u, s_tid: x.sTid, r_tid: x.rTid, res: { type: x.type, id: x.id, tid: trueTenant.get(`${x.type}:${x.id}`) }, perm: x.perm, variant: k === 0 ? first.variant : 'batch_item', cross, sent, recv: new Date().toISOString(), status: res.status, observed, reason: prof.reason, decision_id: prof.decision_id, expected_sys: o.sys, expected_correct: o.cor, violation: !!(cross && observed === 'allow' && !o.cor) });
      }
      return out;
    }
    async function searchProbe(step, rng) {
      const pick = (a) => a[Math.floor(rng() * a.length)];
      const [type, action] = pick(SEARCH_TYPES);
      const u = pick(ds.users);
      const ints = [...internal.get(u.id)];
      const sTid = step.cross && rng() < 0.5 ? pick(tids) : pick(ints);
      const items = [];
      let token, pages = 0, status = 0, complete;
      const sent = new Date().toISOString();
      do {
        const res = await s.req(`${s.topo.urls.pdp}/access/v1/search/resource`, { body: { subject: { type: 'core/user', id: u.id, properties: acrProps(sTid) }, action: { name: action }, resource: { type }, page: { limit: 100, ...(token ? { token } : {}) } }, headers: { 'x-request-id': crypto.randomBytes(13).toString('hex') } });
        status = res.status;
        if (status !== 200) break;
        const j = res.json();
        for (const it of j.results || []) items.push(it.id);
        token = j.page?.next_token || '';
        complete = j.context?.['x-authz-profile']?.completeness;
        pages++;
      } while (token && pages < 20);
      const leaks = items.filter((id) => trueTenant.get(`${type}:${id}`) !== sTid);
      return { i: ++probeNo, ch: 'facade_search', sub: u.id, s_tid: sTid, member_of_s_tid: isInternal(u.id, sTid) || isExternal(u.id, sTid), type, action, cross: 'X1', sent, recv: new Date().toISOString(), status, observed: status === 200 ? (leaks.length ? 'allow' : 'deny') : 'error', returned: items.length, leaks, completeness: complete, expected_sys: false, expected_correct: false, violation: leaks.length > 0 };
    }

    // ---- main loop ------------------------------------------------------------------------------------
    const gen = steps(stepSeed);
    const kindCount = {};
    let lastLog = Date.now();
    while (C.cross < nCross) {
      const step = gen.next().value;
      const rng = seededRng(`tc002:${step.rs}`);
      bump(kindCount, step.kind);
      bump(C.byKind, step.kind);
      if (step.kind === 'op') { await doOp(step, rng); continue; }
      let rs = [];
      if (step.kind === 'probe_edge') rs = [await edgeProbe(step, rng)];
      else if (step.kind === 'probe_direct') rs = [await directProbe(step, rng)];
      else if (step.kind === 'probe_facade_eval') rs = [await facadeProbe(step, rng)];
      else if (step.kind === 'probe_facade_batch') rs = await batchProbe(step, rng);
      else if (step.kind === 'probe_facade_search') rs = [await searchProbe(step, rng)];
      for (const r of rs) {
        account(r);
        if (r.violation && !PREFREEZE) {
          // replay the single probe immediately (reproducibility; minimisation by isolation, see eval)
          rec('counterexamples.jsonl', { probe: r, step });
        }
      }
      if (Date.now() - lastLog > 15_000) { lastLog = Date.now(); log(`cross=${C.cross}/${nCross} probes=${C.probes} errors=${C.errors} positiveFail=${C.positiveFail}/${C.positives}${PREFREEZE ? '' : ` violations=${C.violations} sameMismatch=${C.sameMismatch}/${C.sameDecided}`}`); }
    }
    if (PREFREEZE) { delete C.violations; delete C.itemViolations; delete C.sameMismatch; } // §2.5: no pass/fail metrics before the freeze
    const summary = { config: cfg.id, mutant: mutant?.id || null, engine: cfg.engine, model: cfg.model, dataset_seed: dsSeed, step_seed: stepSeed, dataset_stats: ds.stats, dataset_sha256: crypto.createHash('sha256').update(JSON.stringify(ds)).digest('hex'), sessions: sessions.length, counters: C, step_kind_counts: kindCount, elapsed_ms: Date.now() - t0 };
    fs.writeFileSync(path.join(cfgDir, 'summary.json'), JSON.stringify(summary, null, 2));
    log(`done: ${JSON.stringify({ cross: C.cross, X1: C.crossX1, X2: C.crossX2, violations: C.violations, itemViolations: C.itemViolations, positives: C.positives, positiveFail: C.positiveFail, sameMismatch: C.sameMismatch, errors: C.errors, ms: summary.elapsed_ms })}`);
    return { status: 'completed', summary };
  } catch (e) {
    fs.appendFileSync(path.join(cfgDir, 'error.txt'), `${new Date().toISOString()} ${e.stack}\n`);
    log(`ERROR ${e.message}`);
    return { status: 'aborted:harness_error', error: e.message };
  } finally {
    ref.close();
    if (s) await s.stop();
  }
}

// ------------------------------------------------------------------------------------------------
const a = args();
const prefreeze = !!a.prefreeze;
const PREFREEZE = prefreeze;
let manifest = null;
if (a.freeze) { const f = freezeSnapshot('TC-002'); console.log(JSON.stringify({ manifest: f.file, snapshot: f.root, sha256: f.manifest.manifest_sha256 })); process.exit(0); }
if (!prefreeze) {
  const m = checkManifest('TC-002');
  if (!m.ok) { console.error(`C-2: ${m.reason} ${JSON.stringify(m.diff || [])}`); process.exit(2); }
  manifest = m.manifest;
}
const run = newRun('TC-002', { seed: P.seeds.dataset_base, manifestHash: manifest?.manifest_sha256, prefreeze, purpose: prefreeze ? 'prefreeze-timing (§2.5: duration only, no pass/fail metrics)' : 'measurement' });
fs.copyFileSync(path.join(HERE, 'TC-002.params.json'), run.file('params.json'));
console.log(`run dir ${run.dir}`);
const results = [];
const cfgSel = a.config || (a.mutants ? null : 'all');
if (cfgSel) {
  for (const cfg of P.configs) {
    if (cfgSel !== 'all' && cfgSel !== cfg.id) continue;
    const n = prefreeze ? Number(a.n || 200) : P.n_cross_per_config;
    results.push(await runConfig(run, cfg, { nCross: n, stepSeed: P.seeds.steps_base + cfg.index * 1000, dsSeed: P.seeds.dataset_base + cfg.index }));
  }
}
if (a.mutants) {
  for (const m of MUTANTS) {
    if (a.mutants !== 'all' && a.mutants !== m.id) continue;
    const cfg = { id: `M-${m.id}`, engine: P.mutants.engine, model: P.mutants.model };
    const n = prefreeze ? Number(a.n || 100) : P.mutants.n_cross_per_mutant;
    results.push(await runConfig(run, cfg, { nCross: n, stepSeed: P.seeds.mutant_steps_base + m.index * 1000, dsSeed: P.seeds.mutant_base + m.index, mutant: m }));
  }
}
const status = results.every((r) => r.status === 'completed') ? 'completed' : results.find((r) => r.status !== 'completed').status;
run.finish(status, { configs: results.map((r) => ({ status: r.status, config: r.summary?.config, mutant: r.summary?.mutant, error: r.error })) });
console.log(JSON.stringify({ run_dir: run.dir, status }, null, 2));
process.exit(0);
