// TC-017 load targets: stacks per configuration and the request function of each measured condition.
import { startStack } from '../../../harness/stack.js';
import { request } from '../../../lib/http.js';
import { generate } from '../../../data/gen-synthetic.js';
import { seededRng, opaqueId } from '../../../lib/ids.js';
import { loadCam } from '../../../model/cam.js';
import { CedarAdapter } from '../../../pdp/adapters/cedar.js';
import { CODE_DIR } from '../../../lib/topology.js';
import path from 'node:path';

export const CONDITIONS = {
  K1: { label: 'OpenFGA 直接 Check（façade なし、Check cache なし）', stack: 'S1', kind: 'fga' },
  K2: { label: 'façade → OpenFGA（Check cache なし）', stack: 'S1', kind: 'facade' },
  K3: { label: 'OpenFGA 直接 Check（Check cache あり）', stack: 'S2', kind: 'fga' },
  K4: { label: 'façade → OpenFGA（Check cache あり）', stack: 'S2', kind: 'facade' },
  K5: { label: 'Cedar 直接（façade なし、in-process adapter）', stack: null, kind: 'cedar-inproc' },
  K6: { label: 'façade → Cedar', stack: 'S3', kind: 'facade' },
  K7: { label: 'cold cache: OpenFGA と façade の再起動直後（façade → OpenFGA、Check cache あり）', stack: 'S2', kind: 'facade', cold: true, warm: 'K4' },
  K8: { label: 'cold cache: façade の再起動直後（façade → Cedar、PIP スナップショットの再読込み）', stack: 'S3', kind: 'facade', cold: true, warm: 'K6' },
  L1: { label: 'login（BFF: PAR＋PKCE＋private_key_jwt、証明書束縛 opaque AT）', stack: 'S1', kind: 'login' },
};

export const STACKS = {
  S1: { engine: 'openfga', openfgaFlags: [] },
  S2: { engine: 'openfga', openfgaFlags: ['--check-query-cache-enabled', '--check-query-cache-ttl', '10s'] },
  S3: { engine: 'cedar', openfgaFlags: [] },
};

export function dataset(params) { return generate({ seed: params.dataset.seed, profile: params.dataset.profile }); }

/** Pool of (user, file) read checks: file uniform, user uniform among members of the file's tenant. */
export function queryPool(ds, size, seed) {
  const rng = seededRng(`TC-017-pool:${seed}`);
  const mem = new Map();
  for (const u of ds.users) for (const m of u.memberships) if (m.kind === 'member') mem.set(m.tid, [...(mem.get(m.tid) || []), u.id]);
  const out = [];
  for (let i = 0; i < size; i++) {
    const f = ds.files[Math.floor(rng() * ds.files.length)];
    const us = mem.get(f.tid);
    out.push({ user: us[Math.floor(rng() * us.length)], tid: f.tid, file: f.id });
  }
  return out;
}

export async function openStack(name, { tc, run, ds, portBase, components, tag = '' }) {
  const cfg = STACKS[name];
  // each stack of the run gets its own data sub-directory and secrets directory (separate PKI / stores)
  const fs = await import('node:fs');
  const sub = { dir: path.join(run.dir, `stack-${name}${tag}`), runId: `${run.runId}-${name}${tag}` };
  fs.mkdirSync(sub.dir, { recursive: true });
  return startStack({ tc, run: sub, engine: cfg.engine, dataset: ds, portBase, openfgaFlags: cfg.openfgaFlags, components: components || ['openfga', 'state-store', 'journal', 'as-a', 'pdp', 'bff'] });
}

/** Direct OpenFGA check needs the store / model ids the façade created (persisted in pdp/openfga-store.json). */
export async function fgaTarget(s) {
  const fs = await import('node:fs');
  const st = JSON.parse(fs.readFileSync(path.join(s.topo.dataDir, 'pdp', 'openfga-store.json'), 'utf8'));
  const modelId = Object.values(st.models)[0];
  return { url: s.topo.urls.openfga, storeId: st.storeId, modelId };
}

export function makeFire(kind, ctx, pool) {
  if (kind === 'fga') {
    const { url, storeId, modelId } = ctx.fga;
    return async (i) => {
      const q = pool[i % pool.length];
      const r = await request(`${url}/stores/${storeId}/check`, { body: { tuple_key: { user: `core/user:${q.user}`, relation: 'read', object: `files/file:${q.file}` }, authorization_model_id: modelId, consistency: 'MINIMIZE_LATENCY', context: { current_time: new Date().toISOString() } }, timeoutMs: 10_000 });
      return { ok: r.status === 200 && typeof r.json()?.allowed === "boolean", status: r.status, err: r.status !== 200 ? r.text.slice(0, 120) : undefined };
    };
  }
  if (kind === 'facade') {
    const s = ctx.s;
    return async (i) => {
      const q = pool[i % pool.length];
      const r = await s.req(`${s.topo.urls.pdp}/access/v1/evaluation`, { headers: { 'x-request-id': opaqueId() }, timeoutMs: 10_000, body: { subject: { type: 'core/user', id: q.user, properties: { tid: q.tid, principal_type: 'human', acr: 'L2' } }, action: { name: 'read' }, resource: { type: 'files/file', id: q.file, properties: { tid: q.tid } }, context: { 'x-authz-profile': { profile_version: '1.0' } } } });
      const j = r.json();
      const reason = j?.context?.['x-authz-profile']?.reason;
      return { ok: r.status === 200 && (reason === 'allow' || reason === 'deny_no_relation' || /^deny_guardrail:/.test(reason || '')), status: r.status, err: r.status === 200 && !(reason === 'allow' || reason === 'deny_no_relation') ? reason : undefined };
    };
  }
  if (kind === 'cedar-inproc') {
    const { adapter, revision } = ctx.cedar;
    return async (i) => {
      const q = pool[i % pool.length];
      const r = await adapter.check({ subject: { type: 'core/user', id: q.user }, relation: 'read', resource: { type: 'files/file', id: q.file }, modelRevision: revision, now: Date.now() });
      return { ok: !r.error, err: r.error ? r.detail : undefined };
    };
  }
  if (kind === 'login') {
    const s = ctx.s;
    const users = ctx.loginUsers;
    return async (i) => {
      const u = users[i % users.length];
      const r = await s.login({ sub: u.user, tid: u.tid });
      return { ok: !!r.ok, status: r.status };
    };
  }
  throw new Error(kind);
}

export async function inprocCedar(ds) {
  const cam = loadCam(path.join(CODE_DIR, 'model', 'cam.json'));
  const adapter = new CedarAdapter({ storeFile: null });
  await adapter.registerModel(cam);
  const tuples = ds.tuples.map(({ tid, ...t }) => t);
  for (let i = 0; i < tuples.length; i += 500) { const r = await adapter.write({ writes: tuples.slice(i, i + 500) }); if (!r.ok) throw new Error(JSON.stringify(r)); }
  return { adapter, revision: cam.revision };
}
