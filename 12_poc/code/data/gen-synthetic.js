// Synthetic data generator (DEC-4: synthetic only; every ID starts with "syn" so real data is detectable, C-1).
// Produces tenants (size tiers, NA-POC-3), unit trees (depth ≤ 5, RS-18), nested groups (≤ 3), users with
// multi-tenant memberships, folders (depth ≤ 5) / files, projects with `ancestor` closure tuples, tool
// instances, external grants (cross-tenant guests, ADR-024) and the CAM tuples for all of it.
//   node data/gen-synthetic.js --seed 1 --out <file> [--profile smoke|small|medium] [--large-files N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syntheticId, seededRng } from '../lib/ids.js';
import { args } from '../lib/runtime.js';
import { sha256hex } from '../lib/canon.js';

export const PROFILES = {
  smoke: { tenants: [['L', 1], ['S', 1]], users: { L: 12, M: 8, S: 6 }, unitDepth: { L: 3, M: 2, S: 1 }, foldersPerTenant: { L: 6, M: 4, S: 3 }, filesPerFolder: 3, projects: { L: 2, M: 1, S: 1 } },
  small: { tenants: [['L', 1], ['M', 2], ['S', 4]], users: { L: 60, M: 25, S: 8 }, unitDepth: { L: 4, M: 3, S: 1 }, foldersPerTenant: { L: 20, M: 8, S: 3 }, filesPerFolder: 5, projects: { L: 4, M: 2, S: 1 } },
  medium: { tenants: [['L', 1], ['M', 4], ['S', 12]], users: { L: 300, M: 60, S: 10 }, unitDepth: { L: 5, M: 3, S: 2 }, foldersPerTenant: { L: 60, M: 15, S: 4 }, filesPerFolder: 8, projects: { L: 8, M: 3, S: 1 } },
};

export function generate({ seed = 1, profile = 'small', largeFiles = 0, externalGrantRatio = 0.05, multiTenantRatio = 0.08, now = Date.now() } = {}) {
  const P = PROFILES[profile];
  if (!P) throw new Error(`unknown profile ${profile}`);
  const rng = seededRng(`syn:${seed}:${profile}`);
  const id = () => syntheticId(rng);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const ds = { seed, profile, generatedAt: new Date(now).toISOString(), tenants: [], users: [], units: [], groups: [], folders: [], files: [], projects: [], tools: [], externalGrants: [], tuples: [] };
  const T = (tid, rt, rid, rel, st, sid, srel, condition) => {
    const t = { tid, resource: { type: rt, id: rid }, relation: rel, subject: srel ? { type: st, id: sid, relation: srel } : { type: st, id: sid } };
    if (condition) t.condition = condition;
    ds.tuples.push(t);
  };
  const byTenant = new Map();
  for (const [size, n] of P.tenants) {
    for (let i = 0; i < n; i++) {
      const tid = id();
      ds.tenants.push({ id: tid, cell: 'pc01', size, status: 'active' });
      const tu = [];
      for (let u = 0; u < P.users[size]; u++) {
        const uid = id();
        ds.users.push({ id: uid, status: 'active', memberships: [{ tid, kind: 'member', status: 'active' }] });
        tu.push(uid);
        T(tid, 'core/tenant', tid, 'member', 'core/user', uid);
      }
      byTenant.set(tid, { tid, size, users: tu, units: [], groups: [], folders: [], files: [], projects: [] });
      T(tid, 'core/tenant', tid, 'admin', 'core/user', tu[0]);
      T(tid, 'core/tenant', tid, 'security_admin', 'core/user', tu[1 % tu.length]);
    }
  }
  const userById = new Map(ds.users.map((u) => [u.id, u]));
  // multi-tenant members (same person in two tenants, TC-018)
  const tids = [...byTenant.keys()];
  for (const u of ds.users) {
    if (tids.length > 1 && rng() < multiTenantRatio) {
      const other = pick(tids.filter((t) => t !== u.memberships[0].tid));
      u.memberships.push({ tid: other, kind: 'member', status: 'active' });
      byTenant.get(other).users.push(u.id);
      T(other, 'core/tenant', other, 'member', 'core/user', u.id);
    }
  }
  for (const t of byTenant.values()) {
    // unit tree (containment: parent = core/unit | core/tenant; depth ≤ unitDepth)
    const depth = P.unitDepth[t.size];
    const ancestorsOf = new Map(); // unit -> [ancestor refs]
    let frontier = [{ type: 'core/tenant', id: t.tid, anc: [] }];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const par of frontier) {
        const kids = d === 0 ? 2 : 1 + Math.floor(rng() * 2);
        for (let k = 0; k < kids; k++) {
          const uid = id();
          const anc = [...par.anc, { type: par.type, id: par.id }];
          ds.units.push({ id: uid, tid: t.tid, parent: { type: par.type, id: par.id }, depth: d + 1 });
          t.units.push(uid);
          ancestorsOf.set(uid, anc);
          T(t.tid, 'core/unit', uid, 'parent', par.type, par.id);
          const head = pick(t.users);
          T(t.tid, 'core/unit', uid, 'admin', 'core/user', head);
          for (let m = 0; m < 2; m++) T(t.tid, 'core/unit', uid, 'member', 'core/user', pick(t.users));
          next.push({ type: 'core/unit', id: uid, anc });
        }
      }
      frontier = next;
    }
    // groups (nesting ≤ 3): g0 contains g1 contains g2
    const g = [id(), id(), id()];
    for (let i = 0; i < g.length; i++) {
      ds.groups.push({ id: g[i], tid: t.tid, nested_in: i > 0 ? g[i - 1] : null });
      t.groups.push(g[i]);
      T(t.tid, 'core/group', g[i], 'owner_unit', 'core/tenant', t.tid);
      if (i > 0) T(t.tid, 'core/group', g[i - 1], 'member', 'core/group', g[i], 'member');
      for (let m = 0; m < Math.max(2, Math.floor(t.users.length / 6)); m++) T(t.tid, 'core/group', g[i], 'member', 'core/user', pick(t.users));
    }
    // folders (depth ≤ 5) and files
    const nF = P.foldersPerTenant[t.size];
    for (let f = 0; f < nF; f++) {
      const fid = id();
      const parent = f > 0 && rng() < 0.6 ? pick(t.folders.filter((x) => x.depth < 5)) : null;
      const owner = pick(t.users);
      const folder = { id: fid, tid: t.tid, parent: parent ? parent.id : null, owner, depth: parent ? parent.depth + 1 : 1 };
      ds.folders.push(folder);
      t.folders.push(folder);
      if (parent) T(t.tid, 'files/folder', fid, 'parent', 'files/folder', parent.id);
      T(t.tid, 'files/folder', fid, 'owner', 'core/user', owner);
      if (rng() < 0.5) T(t.tid, 'files/folder', fid, 'editor', 'core/group', pick(t.groups), 'member');
      if (rng() < 0.6) T(t.tid, 'files/folder', fid, 'viewer', 'core/group', pick(t.groups), 'member');
      if (rng() < 0.4) T(t.tid, 'files/folder', fid, 'viewer', 'core/user', pick(t.users));
      for (let k = 0; k < P.filesPerFolder; k++) {
        const did = id();
        const fowner = rng() < 0.5 ? owner : pick(t.users);
        ds.files.push({ id: did, tid: t.tid, folder: fid, owner: fowner, content: `synthetic content ${did}`, labels: [pick(['INT', 'CUS']), ...(rng() < 0.2 ? ['PII'] : [])] });
        t.files.push(did);
        T(t.tid, 'files/file', did, 'parent', 'files/folder', fid);
        T(t.tid, 'files/file', did, 'owner', 'core/user', fowner);
        if (rng() < 0.3) T(t.tid, 'files/file', did, 'viewer', 'core/user', pick(t.users));
      }
    }
    // projects under units with ancestor closure (K05-8) and tool instances
    for (let p = 0; p < P.projects[t.size]; p++) {
      const pid = id();
      const unit = t.units.length ? pick(t.units) : null;
      const parent = unit ? { type: 'core/unit', id: unit } : { type: 'core/tenant', id: t.tid };
      const owner = pick(t.users);
      ds.projects.push({ id: pid, tid: t.tid, parent, owner });
      t.projects.push(pid);
      T(t.tid, 'proj/project', pid, 'parent', parent.type, parent.id);
      const anc = unit ? [...ancestorsOf.get(unit), parent] : [parent];
      for (const a of anc) T(t.tid, 'proj/project', pid, 'ancestor', a.type, a.id);
      T(t.tid, 'proj/project', pid, 'owner', 'core/user', owner);
      T(t.tid, 'proj/project', pid, 'member', 'core/group', pick(t.groups), 'member');
      const tool = id();
      ds.tools.push({ id: tool, tid: t.tid, project: pid });
      T(t.tid, 'proj/tool_instance', tool, 'parent', 'proj/project', pid);
      T(t.tid, 'proj/tool_instance', tool, 'operator', 'core/user', pick(t.users));
    }
  }
  // external grants (cross-tenant guests, ADR-024): guest authenticates in the resource tenant
  for (const t of byTenant.values()) {
    const others = ds.users.filter((u) => !u.memberships.some((m) => m.tid === t.tid));
    const n = Math.max(1, Math.round(t.folders.length * externalGrantRatio));
    for (let i = 0; i < n && others.length; i++) {
      const guest = pick(others);
      const folder = pick(t.folders);
      const gid = id();
      const expired = i % 3 === 2; // a third of the grants are already expired (negative cases)
      const expires_at = new Date(now + (expired ? -3600_000 : 30 * 86400_000)).toISOString();
      ds.externalGrants.push({ id: gid, tid: t.tid, grantee: guest.id, target: { type: 'files/folder', id: folder.id }, expires_at, expired });
      userById.get(guest.id).memberships.push({ tid: t.tid, kind: 'external', status: 'active' });
      T(t.tid, 'core/tenant', t.tid, 'external_member', 'core/user', guest.id);
      T(t.tid, 'core/external_grant', gid, 'grantee', 'core/user', guest.id, null, { name: 'c.not_expired', context: { expires_at } });
      T(t.tid, 'files/folder', folder.id, 'viewer', 'core/external_grant', gid, 'grantee');
    }
  }
  // optional large flat folder for list tests (TC-027): one folder with N files readable by one user
  if (largeFiles > 0) {
    const t = [...byTenant.values()][0];
    const fid = id();
    const reader = t.users[2 % t.users.length];
    ds.folders.push({ id: fid, tid: t.tid, parent: null, owner: t.users[0], depth: 1, large: true });
    T(t.tid, 'files/folder', fid, 'owner', 'core/user', t.users[0]);
    T(t.tid, 'files/folder', fid, 'viewer', 'core/user', reader);
    for (let k = 0; k < largeFiles; k++) {
      const did = id();
      ds.files.push({ id: did, tid: t.tid, folder: fid, owner: t.users[0], content: `bulk ${k}` });
      T(t.tid, 'files/file', did, 'parent', 'files/folder', fid);
    }
    ds.largeFolder = { id: fid, tid: t.tid, reader, files: largeFiles };
  }
  // de-duplicate tuples (random picks can repeat a member)
  const seen = new Set();
  ds.tuples = ds.tuples.filter((t) => {
    const k = `${t.resource.type}:${t.resource.id}#${t.relation}@${t.subject.type}:${t.subject.id}${t.subject.relation ? '#' + t.subject.relation : ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  ds.stats = Object.fromEntries(Object.entries(ds).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));
  return ds;
}

/** C-1 helper: every identifier in the dataset must be synthetic. Returns offending values. */
export function nonSyntheticIds(ds) {
  const bad = [];
  const chk = (v) => { if (typeof v === 'string' && !v.startsWith('syn')) bad.push(v); };
  for (const t of ds.tenants) chk(t.id);
  for (const u of ds.users) { chk(u.id); u.memberships.forEach((m) => chk(m.tid)); }
  for (const t of ds.tuples) { chk(t.tid); chk(t.resource.id); chk(t.subject.id); }
  return bad;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args();
  const ds = generate({ seed: Number(a.seed || 1), profile: a.profile || 'small', largeFiles: Number(a['large-files'] || 0), now: a.now ? Date.parse(a.now) : Date.now() });
  const out = a.out || 'dataset.json';
  const txt = JSON.stringify(ds);
  fs.writeFileSync(out, txt);
  console.log(JSON.stringify({ out, sha256: sha256hex(txt), stats: ds.stats, nonSynthetic: nonSyntheticIds(ds).length }));
}
