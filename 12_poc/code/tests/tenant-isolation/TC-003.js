// TC-003 BOLA・機能単位・プロパティ単位の認可負例 (test plan §4.3, frozen commit 151940a).
//
//   node tests/tenant-isolation/TC-003.js [--engine openfga|cedar|all] [--prefreeze] [--freeze]
//
// Every operation of the reference services is enumerated from the entry-point ledger (config/ledger.json) and
// receives (a) another user's object ID (BOLA; via the edge and directly with a valid internal token),
// (b) a function the caller holds no permission for (incl. HTTP method changes and method-override headers),
// (c) mass assignment of attributes the caller may not set, (d) an excessive-data-exposure check of every 2xx body,
// (e) no token / expired token / token in the query. Positive controls (legit caller) guard against a broken
// harness (C-3). Abort: ledger operations != implemented operations.
// Raw data: 12_poc/data/tenant-isolation/TC-003/<run-id>/ ; evaluation: TC-003.eval.js (eval.json).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { startStack } from '../../harness/stack.js';
import { generate, nonSyntheticIds } from '../../data/gen-synthetic.js';
import { request } from '../../lib/http.js';
import { clientTls, CODE_DIR } from '../../lib/topology.js';
import { x5tS256 } from '../../lib/pki.js';
import { opaqueId } from '../../lib/ids.js';
import { loadIssuerKeys, signRaw, atPayload } from '../../harness/forge.js';
import { args } from '../../lib/runtime.js';
import { HERE, newRun, RefOracle, checkManifest, freezeSnapshot } from './common.js';

const P = JSON.parse(fs.readFileSync(path.join(HERE, 'TC-003.params.json'), 'utf8'));
const CAM_FILE = path.join(CODE_DIR, 'model', 'cam.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abort criterion: operations in the ledger vs operations implemented by the service handlers. */
export function ledgerVsImplementation() {
  const ledger = JSON.parse(fs.readFileSync(path.join(CODE_DIR, P.ledger_file), 'utf8'));
  const ledgerOps = ledger.entry_points.map((e) => e.id).sort();
  const impl = new Set();
  for (const f of P.service_sources) {
    const src = fs.readFileSync(path.join(CODE_DIR, f), 'utf8');
    for (const m of src.matchAll(/case '([a-z_]+\.[a-z_]+)'/g)) impl.add(m[1]);
    for (const m of src.matchAll(/ep\.id === '([a-z_]+\.[a-z_]+)'/g)) impl.add(m[1]);
    for (const m of src.matchAll(/ep: '([a-z_]+\.[a-z_]+)'/g)) impl.add(m[1]);
  }
  const implOps = [...impl].sort();
  return { ledger_version: ledger.version, ledger_ops: ledgerOps, implemented_ops: implOps, missing_in_impl: ledgerOps.filter((x) => !impl.has(x)), missing_in_ledger: implOps.filter((x) => !ledgerOps.includes(x)), match: ledgerOps.length === implOps.length && ledgerOps.every((x) => impl.has(x)) };
}

async function runEngine(run, engine) {
  const t0 = Date.now();
  const log = (m) => console.log(`[TC-003 ${engine}] ${m}`);
  const cfgDir = path.join(run.dir, 'configs', engine);
  fs.mkdirSync(cfgDir, { recursive: true });
  const rec = (name, r) => fs.appendFileSync(path.join(cfgDir, name), JSON.stringify({ t: new Date().toISOString(), ...r }) + '\n');
  const ds = generate({ seed: P.dataset.seed, profile: P.dataset.profile });
  if (nonSyntheticIds(ds).length) return { status: 'aborted:C-1' };
  const runView = Object.create(run);
  runView.runId = `${run.runId}-${engine}`;
  runView.dir = cfgDir;
  const ref = new RefOracle();
  let s;
  try {
    s = await startStack({ tc: 'TC-003', run: runView, engine, dataset: ds, settings: P.settings, purpose: `TC-003 ${engine}` });
    const tuplesFile = path.join(s.topo.secretsDir, 'ref-tuples.json');
    fs.writeFileSync(tuplesFile, JSON.stringify(ds.tuples));
    await ref.init({ correct: CAM_FILE }, tuplesFile);
    const can = (u, type, id, perm) => ref.check('correct', u, type, id, perm);
    const htls = clientTls(s.topo, 'harness');
    const edgeTls = { ca: s.topo.pki.ca };

    // ---- actors (all in the largest tenant) ---------------------------------------------------------
    const T = ds.tenants[0].id;
    const otherT = ds.tenants[1].id;
    const members = ds.users.filter((u) => u.memberships.some((m) => m.tid === T && m.kind === 'member')).map((u) => u.id);
    // file X owned by the owner O of its folder F (owner has every file permission)
    let X, F, O;
    for (const f of ds.files.filter((x) => x.tid === T)) {
      const fo = ds.folders.find((y) => y.id === f.folder);
      if (fo.owner === f.owner && fo.parent === null) { X = f; F = fo; O = f.owner; break; }
    }
    // second folder on which O holds write (move target)
    let F2 = null;
    for (const y of ds.folders.filter((z) => z.tid === T && z.id !== F.id)) if (await can(O, 'files/folder', y.id, 'write')) { F2 = y; break; }
    const otherFolder = ds.folders.find((y) => y.tid === otherT);
    // stranger S: same tenant, no read on X / F, no view on the tool, not O
    const tool = ds.tools.find((x) => x.tid === T);
    const project = ds.projects.find((p) => p.id === tool.project);
    const PO = project.owner;
    const opTuple = ds.tuples.find((t) => t.resource.type === 'proj/tool_instance' && t.resource.id === tool.id && t.relation === 'operator');
    let Op = opTuple.subject.id;
    let S = null;
    for (const u of members) {
      if (u === O || u === PO || u === Op) continue;
      if (!(await can(u, 'files/file', X.id, 'read')) && !(await can(u, 'files/folder', F.id, 'read')) && !(await can(u, 'proj/tool_instance', tool.id, 'view')) && !(await can(u, 'proj/tool_instance', tool.id, 'use'))) { S = u; break; }
    }
    // viewer V: becomes a direct viewer of X in the setup; must hold no write / delete / share on X
    let V = null;
    for (const u of members) {
      if ([O, PO, Op, S].includes(u)) continue;
      if (!(await can(u, 'files/file', X.id, 'write')) && !(await can(u, 'files/file', X.id, 'delete')) && !(await can(u, 'files/file', X.id, 'share')) && !(await can(u, 'files/folder', F.id, 'write'))) { V = u; break; }
    }
    if (Op === PO || (await can(Op, 'proj/tool_instance', tool.id, 'config'))) Op = null;
    const setup = [
      { resource: { type: 'files/file', id: X.id }, relation: 'viewer', subject: { type: 'core/user', id: V } },
      ...(Op ? [{ resource: { type: 'files/file', id: X.id }, relation: 'viewer', subject: { type: 'core/user', id: Op } }] : []),
    ];
    const sw = await s.writeTuples(T, { writes: setup, on_duplicate: 'ignore' });
    if (sw.status !== 200) throw new Error(`setup write ${sw.status}`);
    await ref.write(setup);
    // a user who can view the tool but cannot use it (function-level negative for tool.run), if the data has one
    let viewOnly = null;
    for (const u of members) if ((await can(u, 'proj/tool_instance', tool.id, 'view')) && !(await can(u, 'proj/tool_instance', tool.id, 'use'))) { viewOnly = u; break; }
    // grantee of the positive share: a member outside every role above (the stranger S must stay a stranger)
    const G = members.find((u) => ![O, S, V, Op, PO, viewOnly].includes(u));
    const actors = { G, T, otherT, X: X.id, F: F.id, F2: F2?.id || null, otherFolder: otherFolder.id, O, S, V, Op, PO, viewOnly, tool: tool.id, project: project.id };
    rec('actors.jsonl', { actors });
    const userIds = new Set(ds.users.map((u) => u.id));
    log(`actors ready ${JSON.stringify({ S: !!S, V: !!V, Op: !!Op, viewOnly: !!viewOnly, F2: !!F2 })}`);

    // ---- sessions (re-login before each block: AT lifetime is short so that "expired" can be produced) ---
    const sessions = new Map();
    const sess = async (u) => { const x = await s.login({ sub: u, tid: T, amr: P.amr }); if (!x.ok) throw new Error(`login ${u} ${x.status}`); sessions.set(u, x); return x; };
    const atKey = (await loadIssuerKeys(s.topo, 'at')).find((k) => k.state === 'active');
    const txnKey = (await loadIssuerKeys(s.topo, 'txn')).find((k) => k.state === 'active');
    const hx5t = x5tS256(fs.readFileSync(s.topo.workloads.harness.cert, 'utf8'));
    const forged = async (sub, aud, scope, over = {}) => signRaw({ alg: atKey.alg, typ: 'at+jwt', kid: atKey.kid }, atPayload(s.topo, { sub, tid: T, aud, scope, cnfX5t: hx5t, acr: 'L2-PR', amr: ['pwd', 'fido'], ...over }), atKey.privateKey);
    const forgedTxn = async (sub, op, tier, root) => { const n = Math.floor(Date.now() / 1000); return signRaw({ alg: txnKey.alg, typ: 'txntoken+jwt', kid: txnKey.kid }, { iss: s.topo.issuers.tts, aud: s.topo.txnAudience, iat: n, exp: n + 60, txn: opaqueId(), sub, scope: op, req_wl: s.topo.workloads.harness.spiffeId, tctx: { tid: T, root_jti: root, tier, ver: '1.0' } }, txnKey.privateKey); };

    // ---- operation catalogue from the ledger -----------------------------------------------------------
    const ledger = JSON.parse(fs.readFileSync(path.join(CODE_DIR, P.ledger_file), 'utf8'));
    const eps = ledger.entry_points;
    const svcUrl = { 'file-service': s.topo.urls.file, 'tool-service': s.topo.urls.tool, 'label-service': s.topo.urls.label };
    const svcAud = { 'file-service': s.topo.audiences.file, 'tool-service': s.topo.audiences.tool, 'label-service': s.topo.audiences.label };
    const pathFor = (ep, id) => ep.path.replace(':tid', T).replace(':id', id).replace(':token', id);
    const defaultTarget = (ep) => (ep.resource_type === 'files/folder' ? F.id : ep.resource_type === 'proj/tool_instance' ? tool.id : X.id);
    const validBody = (ep, who) => ({
      'file.write': { content: `tc003 ${opaqueId(6)}` }, 'file.create': { content: 'tc003 create' }, 'file.share': { grantee_sub: G },
      'file.move': { to_folder: F2 ? F2.id : F.id }, 'tool.run': { file_id: X.id }, 'tool.config': { config: { tc003: opaqueId(4) } },
    }[ep.id]);

    let n = 0;
    const exposures = [];
    function exposureCheck(epId, body) {
      if (!body || typeof body !== 'object') return [];
      const allowed = new Set(P.allowed_response_properties[epId] || []);
      const bad = [];
      const walk = (o, prefix) => {
        for (const [k, v] of Object.entries(o)) {
          const keyPath = prefix ? `${prefix}.${k}` : k;
          const generic = keyPath.replace(/^items\.\d+\./, 'items[].').replace(/^items\.\d+$/, 'items');
          const parent = generic.split('.').slice(0, -1).join('.');
          const ok = allowed.has(generic) || allowed.has(`${parent}.*`) || (prefix === '' && allowed.has(k)) || allowed.has(generic.replace(/\.\d+$/, ''));
          if (!ok) bad.push({ property: generic, kind: 'property_not_allowed' });
          if (typeof v === 'string' && (v === T || v === otherT || (userIds.has(v)))) bad.push({ property: generic, kind: 'forbidden_value' });
          if (v && typeof v === 'object' && !Array.isArray(v) && !(allowed.has(`${generic}.*`))) walk(v, keyPath);
          if (Array.isArray(v)) v.forEach((x, i) => { if (x && typeof x === 'object') walk(x, `${keyPath}.${i}`); else if (typeof x === 'string' && (x === T || userIds.has(x))) bad.push({ property: generic, kind: 'forbidden_value' }); });
        }
      };
      walk(body, '');
      return bad;
    }
    async function probe(c) {
      // c: { case, cls, ep, via: 'bff'|'edge-raw'|'direct', who, method, path, body, headers, expect: 'deny'|'allow'|'auth_fail'|'reject_400', positive }
      const sent = new Date().toISOString();
      let res;
      try {
        if (c.via === 'bff') res = await (c.session || sessions.get(c.who)).call(c.method, c.path, c.body, c.headers || {});
        else if (c.via === 'edge-raw') { const r = await request(`${s.topo.urls.edge}${c.path}`, { method: c.method, body: c.body, headers: c.headers || {}, tls: edgeTls }); res = { status: r.status, body: r.json() ?? r.text, headers: r.headers }; }
        else { const r = await request(`${c.base}${c.path}`, { method: c.method, body: c.body, headers: c.headers || {}, tls: htls }); res = { status: r.status, body: r.json() ?? r.text, headers: r.headers }; }
      } catch (e) { res = { status: 599, body: String(e.message) }; }
      // effect-based cases (mass assignment, method override on a permitted read) are judged from the persisted effects
      const accepted = c.effectBased || c.cls === 'bola_list' ? undefined : (res.status >= 200 && res.status < 300) || (res.status === 400 && ['bola', 'function'].includes(c.cls));
      const exp = res.status >= 200 && res.status < 300 ? exposureCheck(c.ep, res.body) : [];
      if (exp.length) exposures.push(...exp.map((x) => ({ probe: n + 1, ep: c.ep, ...x })));
      const r = { i: ++n, case: c.case, cls: c.cls, effect_based: !!c.effectBased, ep: c.ep, via: c.via, who: c.whoRole, method: c.method, path: c.path.replace(T, '<T>'), body_keys: c.body ? Object.keys(c.body) : [], header_keys: Object.keys(c.headers || {}).filter((h) => h !== 'authorization' && h !== 'txn-token'), sent, recv: new Date().toISOString(), status: res.status, positive: !!c.positive, accepted, ok_positive: c.positive ? res.status >= 200 && res.status < 300 : undefined, exposure: exp, response_keys: res.body && typeof res.body === 'object' ? Object.keys(res.body) : null };
      rec('requests.jsonl', r);
      return { r, res };
    }

    // ---- (e) authentication: no token, garbage token, token in query, expired (edge + direct) ----------------
    const results = { coverage: {} };
    const cov = (ep, cls) => { (results.coverage[ep] ||= {})[cls] = ((results.coverage[ep] || {})[cls] || 0) + 1; };
    const cli = await s.loginCli({ sub: O, tid: T, amr: P.amr });
    for (const ep of eps) {
      if (ep.tier === 'public') continue;
      const p = pathFor(ep, defaultTarget(ep));
      const b = validBody(ep);
      await probe({ case: 'e1_no_token', cls: 'auth', ep: ep.id, via: 'edge-raw', method: ep.method, path: p, body: b }); cov(ep.id, 'e');
      await probe({ case: 'e2_garbage_token', cls: 'auth', ep: ep.id, via: 'edge-raw', method: ep.method, path: p, body: b, headers: { authorization: `Bearer ${opaqueId(43)}` } }); cov(ep.id, 'e');
      await probe({ case: 'e3_token_in_query', cls: 'auth', ep: ep.id, via: 'edge-raw', method: ep.method, path: `${p}${p.includes('?') ? '&' : '?'}access_token=${cli.tokens.access_token}`, body: b }); cov(ep.id, 'e');
      // expired internal token straight to the service (iat/exp in the past beyond the skew S)
      const nowS = Math.floor(Date.now() / 1000);
      const tok = await forged(O, svcAud[ep.service], ep.scope, { iat: nowS - 600, exp: nowS - 300, auth_time: nowS - 700 });
      const headers = { authorization: `Bearer ${tok}` };
      if (['write', 'privileged'].includes(ep.tier)) headers['txn-token'] = await forgedTxn(O, ep.op, ep.tier === 'privileged' ? 'privileged/T' : ep.tier, opaqueId());
      await probe({ case: 'e4_expired_internal_token_direct', cls: 'auth', ep: ep.id, via: 'direct', base: svcUrl[ep.service], method: ep.method, path: p, body: b, headers }); cov(ep.id, 'e');
    }
    // file.download (public, signed URL): no URL secret / garbage / tampered object id
    const dlEp = eps.find((e) => e.id === 'file.download');
    if (dlEp) {
      await probe({ case: 'e1_no_token', cls: 'auth', ep: 'file.download', via: 'edge-raw', method: 'GET', path: '/dl/' }); cov('file.download', 'e');
      await probe({ case: 'e2_garbage_token', cls: 'auth', ep: 'file.download', via: 'edge-raw', method: 'GET', path: `/dl/${opaqueId(40)}.${opaqueId(43)}` }); cov('file.download', 'e');
    }

    // ---- positive controls + (a) BOLA + (b) function level + (c) mass assignment, per operation ------------
    await sess(O); await sess(S); await sess(V); if (Op) await sess(Op); await sess(PO); if (viewOnly) await sess(viewOnly);
    const relogin = async () => { for (const u of sessions.keys()) await sess(u); };
    const legit = { 'tool.view': PO, 'tool.run': Op || PO, 'tool.config': PO };
    const roleOf = (u) => Object.entries({ O, S, V, Op, PO, viewOnly }).find(([, v]) => v === u)?.[0] || 'other';
    // positives first (the created file is used by the delete positive)
    let created = null;
    for (const ep of eps) {
      await relogin();
      if (ep.id === 'file.download') continue;
      const who = legit[ep.id] || O;
      let target = defaultTarget(ep);
      if (ep.id === 'file.delete') { if (!created) { const c = await sessions.get(O).call('POST', `/t/${T}/folders/${F.id}/files`, { content: 'tc003 delete target' }); created = c.body?.id; } target = created; }
      const body = ep.id === 'file.move' ? { to_folder: F2 ? F2.id : F.id } : validBody(ep);
      const { res } = await probe({ case: 'p0_positive', cls: 'positive', positive: true, ep: ep.id, via: 'bff', who, whoRole: roleOf(who), method: ep.method, path: pathFor(ep, target), body });
      if (ep.id === 'file.create' && res.status === 201) created = res.body.id;
      if (ep.id === 'file.move' && res.status === 200 && F2) await sessions.get(O).call('POST', `/t/${T}/files/${X.id}/move`, { to_folder: F.id }); // move back
      if (ep.id === 'file.signed_url' && res.status === 200) {
        const url = res.body.url;
        const { res: d } = await probe({ case: 'p0_positive', cls: 'positive', positive: true, ep: 'file.download', via: 'edge-raw', method: 'GET', path: url });
        // tampered object id inside the signed payload (BOLA on the public download)
        const [bodyPart, mac] = url.slice(4).split('.');
        const payload = JSON.parse(Buffer.from(bodyPart, 'base64url').toString('utf8'));
        const other = ds.files.find((f) => f.tid === T && f.id !== X.id);
        const tampered = Buffer.from(JSON.stringify({ ...payload, f: other.id })).toString('base64url');
        await probe({ case: 'a3_signed_url_object_swapped', cls: 'bola', ep: 'file.download', via: 'edge-raw', method: 'GET', path: `/dl/${tampered}.${mac}` }); cov('file.download', 'a');
        const tamperedOp = Buffer.from(JSON.stringify({ ...payload, op: 'write' })).toString('base64url');
        await probe({ case: 'b3_signed_url_operation_changed', cls: 'function', ep: 'file.download', via: 'edge-raw', method: 'GET', path: `/dl/${tamperedOp}.${mac}` }); cov('file.download', 'b');
        void d;
      }
    }
    for (const ep of eps) {
      if (ep.tier === 'public') continue;
      await relogin();
      const target = defaultTarget(ep);
      const p = pathFor(ep, target);
      // (a) BOLA: stranger S with another user's object ID, through the edge and directly with a valid internal token
      const bodyS = ep.id === 'tool.run' ? { file_id: X.id } : ep.id === 'file.share' ? { grantee_sub: S } : validBody(ep);
      if (ep.kind !== 'COLLECTION') {
        await probe({ case: 'a1_bola_other_users_object_edge', cls: 'bola', ep: ep.id, via: 'bff', who: S, whoRole: 'S', method: ep.method, path: p, body: bodyS }); cov(ep.id, 'a');
        const tok = await forged(S, svcAud[ep.service], ep.scope);
        const headers = { authorization: `Bearer ${tok}` };
        if (['write', 'privileged'].includes(ep.tier)) headers['txn-token'] = await forgedTxn(S, ep.op, ep.tier === 'privileged' ? 'privileged/T' : ep.tier, opaqueId());
        await probe({ case: 'a2_bola_other_users_object_direct', cls: 'bola', ep: ep.id, via: 'direct', base: svcUrl[ep.service], method: ep.method, path: p, body: bodyS, headers }); cov(ep.id, 'a');
      } else {
        // collection: the stranger's search must not return X (BOLA through the list)
        const { res } = await probe({ case: 'a4_collection_stranger', cls: 'bola_list', ep: ep.id, via: 'bff', who: S, whoRole: 'S', method: ep.method, path: `${pathFor(ep, '')}?limit=100`, body: undefined });
        const leaked = Array.isArray(res.body?.items) && res.body.items.some((it) => it.id === X.id);
        rec('requests.jsonl', { i: ++n, case: 'a4_collection_stranger_items', cls: 'bola', ep: ep.id, positive: false, accepted: leaked, note: 'stranger search result contains X' });
        cov(ep.id, 'a');
      }
      // (b) function level: viewer V on write / delete / share / move / create; operator on config; view-only on run
      const fnWho = { 'file.write': V, 'file.delete': V, 'file.share': V, 'file.move': V, 'file.create': V, 'tool.config': Op, 'tool.run': viewOnly };
      if (fnWho[ep.id]) { await probe({ case: 'b1_function_without_permission', cls: 'function', ep: ep.id, via: 'bff', who: fnWho[ep.id], whoRole: roleOf(fnWho[ep.id]), method: ep.method, path: p, body: ep.id === 'file.share' ? { grantee_sub: S } : validBody(ep) }); cov(ep.id, 'b'); }
      // (b) HTTP method change on the same path (methods not in the ledger for this path), by the legit owner
      const definedHere = new Set(eps.filter((e) => e.path === ep.path).map((e) => e.method));
      for (const m of P.methods_probed) {
        if (definedHere.has(m)) continue;
        const who = legit[ep.id] || O;
        await probe({ case: 'b2_http_method_change', cls: 'function', ep: ep.id, via: 'bff', who, whoRole: roleOf(who), method: m, path: p, body: ['POST', 'PUT', 'PATCH'].includes(m) ? { content: 'tc003 method' } : undefined });
        cov(ep.id, 'b');
      }
    }
    // (e) expired opaque access token at the edge: a BFF session whose AT lifetime has passed
    const expiredSess = await s.login({ sub: O, tid: T, amr: P.amr });
    await sleep(P.expired_wait_ms);
    for (const ep of eps) {
      if (ep.tier === 'public') continue;
      await probe({ case: 'e5_expired_access_token_edge', cls: 'auth', ep: ep.id, via: 'bff', session: expiredSess, whoRole: 'O-expired', method: ep.method, path: pathFor(ep, defaultTarget(ep)), body: validBody(ep) }); cov(ep.id, 'e');
    }
    // (b) method override (viewer V may read X; the override must not turn the read into a delete / write)
    await relogin();
    for (const [h, v] of P.method_override_headers) await probe({ case: 'b4_method_override_header', cls: 'function', effectBased: true, ep: 'file.read', via: 'bff', who: V, whoRole: 'V', method: 'GET', path: `/t/${T}/files/${X.id}`, headers: { [h]: v } });
    await probe({ case: 'b4_method_override_query', cls: 'function', effectBased: true, ep: 'file.read', via: 'bff', who: V, whoRole: 'V', method: 'GET', path: `/t/${T}/files/${X.id}?${P.method_override_query}` });
    await probe({ case: 'b4_method_override_header_post', cls: 'function', ep: 'file.read', via: 'bff', who: V, whoRole: 'V', method: 'POST', path: `/t/${T}/files/${X.id}`, headers: { 'x-http-method-override': 'PUT' }, body: { content: 'override' } });

    // (c) mass assignment by the legit caller; persisted effects are checked in the store / the PDP afterwards
    const ma = P.mass_assignment_fields;
    const subst = (v) => (v === '<stranger>' ? S : v === '<other tenant>' ? otherT : v === '<other folder>' ? otherFolder.id : v);
    const extra = Object.fromEntries(Object.entries(ma).map(([k, v]) => [k, subst(v)]));
    const maCases = [];
    await relogin();
    const before = { X: (await sessions.get(O).call('GET', `/t/${T}/files/${X.id}`)).body };
    let r1 = await probe({ case: 'c1_mass_assignment_write', cls: 'mass', effectBased: true, ep: 'file.write', via: 'bff', who: O, whoRole: 'O', method: 'PUT', path: `/t/${T}/files/${X.id}`, body: { content: 'tc003 ma', ...extra } }); maCases.push(['c1', r1.r.i]); cov('file.write', 'c');
    r1 = await probe({ case: 'c2_mass_assignment_create', cls: 'mass', effectBased: true, ep: 'file.create', via: 'bff', who: O, whoRole: 'O', method: 'POST', path: `/t/${T}/folders/${F.id}/files`, body: { content: 'tc003 ma create', ...extra } }); maCases.push(['c2', r1.r.i, r1.res.body?.id]); cov('file.create', 'c');
    const createdMa = r1.res.body?.id;
    r1 = await probe({ case: 'c3_mass_assignment_share_relation', cls: 'mass', effectBased: true, ep: 'file.share', via: 'bff', who: O, whoRole: 'O', method: 'POST', path: `/t/${T}/files/${X.id}/share`, body: { grantee_sub: S, ...extra } }); maCases.push(['c3', r1.r.i]); cov('file.share', 'c');
    if (F2) { r1 = await probe({ case: 'c4_mass_assignment_move', cls: 'mass', effectBased: true, ep: 'file.move', via: 'bff', who: O, whoRole: 'O', method: 'POST', path: `/t/${T}/files/${X.id}/move`, body: { to_folder: F2.id, ...extra } }); maCases.push(['c4', r1.r.i]); cov('file.move', 'c'); }
    r1 = await probe({ case: 'c5_mass_assignment_tool_config', cls: 'mass', effectBased: true, ep: 'tool.config', via: 'bff', who: PO, whoRole: 'PO', method: 'PUT', path: `/t/${T}/tools/${tool.id}/config`, body: { config: { k: 1 }, ...extra } }); maCases.push(['c5', r1.r.i]); cov('tool.config', 'c');
    r1 = await probe({ case: 'c6_mass_assignment_tool_run', cls: 'mass', effectBased: true, ep: 'tool.run', via: 'bff', who: Op || PO, whoRole: roleOf(Op || PO), method: 'POST', path: `/t/${T}/tools/${tool.id}/run`, body: { file_id: X.id, ...extra } }); maCases.push(['c6', r1.r.i]); cov('tool.run', 'c');
    await sleep(500);
    // effects: the share must have granted at most "viewer" (no owner / editor / share for S); the PDP view of S
    const sShare = await s.evaluate({ subject: { type: 'core/user', id: S, properties: { tid: T, principal_type: 'human', acr: 'L2-PR' } }, action: { name: 'share' }, resource: { type: 'files/file', id: X.id, properties: { tid: T } } });
    const sWrite = await s.evaluate({ subject: { type: 'core/user', id: S, properties: { tid: T, principal_type: 'human', acr: 'L2-PR' } }, action: { name: 'write' }, resource: { type: 'files/file', id: X.id, properties: { tid: T } } });
    const sCreatedWrite = createdMa ? await s.evaluate({ subject: { type: 'core/user', id: S, properties: { tid: T, principal_type: 'human', acr: 'L2-PR' } }, action: { name: 'write' }, resource: { type: 'files/file', id: createdMa, properties: { tid: T } } }) : null;

    // ---- method-override / mass-assignment effects in the service store ---------------------------------
    await relogin();
    const after = (await sessions.get(O).call('GET', `/t/${T}/files/${X.id}`)).body;
    const effects = { x_before: before.X, x_after_read: after, s_share_on_x: sShare.json()?.decision, s_write_on_x: sWrite.json()?.decision, s_write_on_created: sCreatedWrite?.json()?.decision ?? null };
    return { status: 'completed', ctx: { cfgDir, s, ref, actors, effects, createdMa, maCases, exposures, results, log, t0, rec } };
  } catch (e) {
    fs.appendFileSync(path.join(cfgDir, 'error.txt'), `${new Date().toISOString()} ${e.stack}\n`);
    console.log(`[TC-003 ${engine}] ERROR ${e.message}`);
    ref.close();
    if (s) await s.stop();
    return { status: 'aborted:harness_error', error: e.message };
  }
}

async function finishEngine(engine, out) {
  const { cfgDir, s, ref, actors, effects, createdMa, exposures, results, log, t0, rec } = out.ctx;
  ref.close();
  await s.stop();
  // store effects (read the stopped file-service store)
  const db = new DatabaseSync(path.join(cfgDir, 'file-service', 'files.sqlite'), { readOnly: true });
  const rowX = db.prepare('SELECT id, tid, folder, owner, version FROM files WHERE id = ?').get(actors.X);
  const rowC = createdMa ? db.prepare('SELECT id, tid, folder, owner FROM files WHERE id = ?').get(createdMa) : null;
  const forcedRow = db.prepare('SELECT id FROM files WHERE id = ?').get(P.mass_assignment_fields.id);
  db.close();
  const store = { x: rowX, created_by_mass_assignment: rowC, forced_id_row_exists: !!forcedRow };
  const effectFindings = [];
  if (!rowX) effectFindings.push({ case: 'b4_method_override', finding: 'X deleted' });
  if (rowX && rowX.owner !== actors.O) effectFindings.push({ case: 'c1/c4', finding: 'owner of X changed' });
  if (rowX && rowX.tid !== actors.T) effectFindings.push({ case: 'c1/c4', finding: 'tenant of X changed' });
  if (rowX && ![actors.F, actors.F2].includes(rowX.folder)) effectFindings.push({ case: 'c1/c4', finding: 'X moved to a folder outside the request' });
  if (rowC && (rowC.owner !== actors.O || rowC.tid !== actors.T || rowC.folder !== actors.F)) effectFindings.push({ case: 'c2', finding: 'created file took a mass-assigned owner / tid / folder', row: rowC });
  if (forcedRow) effectFindings.push({ case: 'c2', finding: 'client-chosen id persisted' });
  if (effects.s_share_on_x === true) effectFindings.push({ case: 'c3', finding: 'share granted more than viewer (S can share X)' });
  if (effects.s_write_on_x === true) effectFindings.push({ case: 'c3', finding: 'share granted more than viewer (S can write X)' });
  if (effects.s_write_on_created === true) effectFindings.push({ case: 'c2', finding: 'stranger can write the created file' });
  const xb = effects.x_before, xa = effects.x_after_read;
  rec('effects.jsonl', { store, effects: { s_share_on_x: effects.s_share_on_x, s_write_on_x: effects.s_write_on_x, s_write_on_created: effects.s_write_on_created, x_version_before: xb?.version, x_version_after: xa?.version }, effect_findings: effectFindings });
  rec('exposures.jsonl', { exposures });
  fs.writeFileSync(path.join(cfgDir, 'summary.json'), JSON.stringify({ engine, actors: Object.fromEntries(Object.entries(actors).map(([k, v]) => [k, v ? (k === 'T' || k === 'otherT' ? 'tenant' : 'set') : null])), coverage: results.coverage, effect_findings: effectFindings, exposures: exposures.length, elapsed_ms: Date.now() - t0 }, null, 2));
  log(`done in ${Date.now() - t0} ms`);
}

// ------------------------------------------------------------------------------------------------
const a = args();
const prefreeze = !!a.prefreeze;
if (a.freeze) { const f = freezeSnapshot('TC-003'); console.log(JSON.stringify({ manifest: f.file, snapshot: f.root, sha256: f.manifest.manifest_sha256 })); process.exit(0); }
let manifest = null;
if (!prefreeze) {
  const m = checkManifest('TC-003');
  if (!m.ok) { console.error(`C-2: ${m.reason} ${JSON.stringify(m.diff || [])}`); process.exit(2); }
  manifest = m.manifest;
}
const run = newRun('TC-003', { seed: P.dataset.seed, manifestHash: manifest?.manifest_sha256, prefreeze, purpose: prefreeze ? 'prefreeze harness check (§2.5)' : 'measurement' });
fs.copyFileSync(path.join(HERE, 'TC-003.params.json'), run.file('params.json'));
const lv = ledgerVsImplementation();
run.writeJson('ledger-check.json', lv);
console.log(`run dir ${run.dir}; ledger ${lv.ledger_ops.length} ops, implemented ${lv.implemented_ops.length}, match=${lv.match}`);
if (!lv.match) { run.finish('aborted:TC-003 ledger/implementation operation count mismatch', { ledger_check: lv }); process.exit(0); }
const engines = !a.engine || a.engine === 'all' ? P.engines : [a.engine];
const outs = [];
for (const e of engines) {
  const o = await runEngine(run, e);
  if (o.status === 'completed') await finishEngine(e, o);
  outs.push({ engine: e, status: o.status, error: o.error });
}
const status = outs.every((o) => o.status === 'completed') ? 'completed' : outs.find((o) => o.status !== 'completed').status;
run.finish(status, { engines: outs });
console.log(JSON.stringify({ run_dir: run.dir, status }, null, 2));
process.exit(0);
