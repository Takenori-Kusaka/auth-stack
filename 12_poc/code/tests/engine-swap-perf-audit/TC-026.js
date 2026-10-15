// TC-026 契約試験・モック一致・CI ガード（preregistered-test-plan.md §4.26）
//   node tests/engine-swap-perf-audit/TC-026.js [--harness-check]
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import YAML from 'yaml';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { ProcGroup } from '../../harness/proc.js';
import { request } from '../../lib/http.js';
import { loadTopology, CODE_DIR } from '../../lib/topology.js';
import { CONTRACTS_DIR } from '../../lib/jwt.js';
import { x5tS256 } from '../../lib/pki.js';
import { opaqueId } from '../../lib/ids.js';
import { loadIssuerKeys, signRaw, foreignKey, atPayload } from '../../harness/forge.js';
import { openRun, groupPortBase, writeEval, sleep, HARNESS_CHECK } from './common.js';
import { refEvaluate } from './lib/helpers.js';
import { MockPlatform } from './lib/kit.js';
import { contractDiff, codeGuard } from './lib/ci-guard.js';

const TC = 'TC-026';
const { run, params } = openRun(TC, { seed: 26 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const base = groupPortBase(TC);
let status = 'completed';
const evalOut = { tc: TC };
let s = null, mock = null;
const pg = new ProcGroup({ logDir: path.join(run.dir, 'logs-mock-env') });

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: base, faultAdmin: true });
  const topo = loadTopology(s.topoFile);
  // ---- mock environment: MK-02/03/07 and a second instance of the same consumer code pointed at them ----
  mock = await new MockPlatform({ topo, dataset: ds, stsPort: base + 14, pdpPort: base + 15 }).start();
  const mtopo = JSON.parse(JSON.stringify(topo));
  mtopo.urls.sts = `https://127.0.0.1:${base + 14}`; mtopo.urls.pdp = `https://127.0.0.1:${base + 15}`; mtopo.urls.journal = `https://127.0.0.1:${base + 15}`;
  mtopo.ports.file = base + 18; mtopo.urls.file = `https://127.0.0.1:${base + 18}`;
  mtopo.dataDir = path.join(run.dir, 'mock-env'); fs.mkdirSync(mtopo.dataDir, { recursive: true });
  const mtopoFile = path.join(topo.secretsDir, 'topology-mock.json');
  fs.writeFileSync(mtopoFile, JSON.stringify(mtopo, null, 2));
  await pg.start('file-service-mock-env', process.execPath, [path.join(CODE_DIR, 'services', 'file-service.js'), '--topology', mtopoFile, '--name', 'file-service'], { ready: { line: /READY / }, env: { POC_TOPOLOGY: mtopoFile }, cwd: CODE_DIR });
  const harnessX5t = x5tS256(fs.readFileSync(topo.workloads.harness.cert, 'utf8'));
  const [T1, T2] = ds.tenants;
  const f = ds.files.find((x) => x.tid === T1.id);
  const owner = f.owner;
  const fOther = ds.files.find((x) => x.tid === T2.id);
  const members = ds.users.filter((u) => u.memberships.some((m) => m.tid === T1.id && m.kind === 'member'));
  const rq = refEvaluate({ tuples: ds.tuples, queries: members.map((u) => ({ user: u.id, type: 'files/file', id: f.id, permission: 'read' })), now: new Date() });
  const stranger = members.find((u, i) => rq[i] === false).id;
  mock.allow.add(`${owner}|files/file:${f.id}|read`);
  const realKeys = { at: (await loadIssuerKeys(topo, 'at')).find((k) => k.state === 'active'), txn: (await loadIssuerKeys(topo, 'txn')).find((k) => k.state === 'active') };
  const env = {
    platform: { url: topo.urls.file, keyAt: () => realKeys.at, keyTxn: () => realKeys.txn },
    mock: { url: mtopo.urls.file, keyAt: () => ({ kid: mock.atKeys[0].kid, privateKey: mock.atKeys[0].privateKey }), keyTxn: () => ({ kid: mock.txnKeys[0].kid, privateKey: mock.txnKeys[0].privateKey }) },
  };
  const pay = (over = {}) => atPayload(topo, { sub: owner, tid: T1.id, aud: topo.audiences.file, cnfX5t: harnessX5t, ...over });
  // raw ES256 JWS without library checks (jose refuses unknown crit on the signing side)
  const rawSign = (header, payload, key) => { const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'); const input = `${enc(header)}.${enc(payload)}`; const ko = key instanceof crypto.KeyObject ? key : crypto.KeyObject.from(key); return `${input}.${crypto.sign('sha256', Buffer.from(input), { key: ko, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`; };
  const sign = (e, header, payload, which = 'at') => { const k = which === 'txn' ? env[e].keyTxn() : env[e].keyAt(); return signRaw({ alg: 'ES256', kid: k.kid, ...header }, payload, k.privateKey); };
  const call = async (e, tok, p = `/t/${T1.id}/files/${f.id}`) => { const r = await request(`${env[e].url}${p}`, { tls: s.tls, headers: { authorization: `Bearer ${tok}` }, timeoutMs: 10_000 }); return { status: r.status, body: r.text }; };
  const foreign384 = await foreignKey('ES384');
  const sandboxKey = await foreignKey('ES256');
  // vector -> async (e) => [{ sub, status, body }]
  const V = {
    POS: async (e) => [await call(e, await sign(e, { typ: 'at+jwt' }, pay()))],
    'CV-001': async (e) => [await call(e, await sign(e, { typ: 'at+jwt' }, pay({ aud: topo.audiences.tool })))],
    'CV-002': async (e) => [await call(e, await sign(e, { typ: 'txntoken+jwt' }, pay())), await call(e, await sign(e, { typ: 'secevent+jwt' }, pay())), await call(e, await sign(e, { typ: 'JWT' }, pay()))],
    'CV-003': async (e) => [await call(e, await sign(e, { typ: 'at+jwt' }, pay({ iss: 'https://sts.other-cell.poc.test' })))],
    'CV-004': async (e) => [await call(e, await signRaw({ alg: 'none', typ: 'at+jwt' }, pay())), await call(e, await signRaw({ alg: 'ES384', typ: 'at+jwt', kid: env[e].keyAt().kid }, pay(), foreign384.privateKey)), await call(e, await (async () => { try { return await signRaw({ alg: 'ES256', typ: 'at+jwt', kid: env[e].keyAt().kid }, pay(), foreign384.privateKey); } catch { return 'invalid.alg.mismatch'; } })())],
    'CV-005': async (e) => {
      let k;
      if (e === 'platform') { const r = await s.keys('at', 'prepublish', { alg: 'ES256' }); const all = await loadIssuerKeys(topo, 'at'); k = all.find((x) => x.kid === r.json().kid); }
      else k = await mock.addAtKey();
      await sleep(600); // past the unknown-kid re-fetch interval
      return [await call(e, await signRaw({ alg: 'ES256', typ: 'at+jwt', kid: k.kid }, pay(), k.privateKey)), await call(e, await signRaw({ alg: 'ES256', typ: 'at+jwt', kid: `unknown-${opaqueId(6)}` }, pay(), env[e].keyAt().privateKey))];
    },
    'CV-006': async (e) => [await call(e, rawSign({ alg: 'ES256', kid: env[e].keyAt().kid, typ: 'at+jwt', crit: ['x-unknown-ext'], 'x-unknown-ext': true }, pay(), env[e].keyAt().privateKey))],
    'CV-007': async (e) => { const now = Math.floor(Date.now() / 1000); return [await call(e, await sign(e, { typ: 'at+jwt' }, pay({ iat: now - 600, exp: now - 300, auth_time: now - 700 })))]; },
    'CV-008': async (e) => { const t = await sign(e, { typ: 'at+jwt' }, pay()); return [await call(e, t, `/t/${T1.id}/files/${fOther.id}`), await call(e, t, `/t/${T1.id}/files/synzzzzzzzzzzzzzzzzzzzzzzz`)]; },
    'CV-010': async (e) => { const now = Math.floor(Date.now() / 1000); return [await call(e, await sign(e, { typ: 'txntoken+jwt' }, { iss: topo.issuers.tts, aud: topo.txnAudience, iat: now, exp: now + 60, txn: opaqueId(), sub: owner, scope: 'op.file.read', req_wl: topo.workloads.edge.spiffeId, tctx: { tid: T1.id, root_jti: opaqueId(), tier: 'read-sensitive', ver: '1.0' } }, 'txn'))]; },
    'CV-011': async (e) => [await call(e, await signRaw({ alg: 'ES256', typ: 'at+jwt', kid: sandboxKey.publicJwk.kid }, pay({ iss: 'https://sts.sandbox.poc.test' }), sandboxKey.privateKey))],
    'CV-013': async (e) => [await call(e, await sign(e, { typ: 'at+jwt' }, pay({ x_unknown_claim: 'ignored', 'https://example.test/claim': 1 })))],
    'CV-014': async (e) => [await call(e, await sign(e, { typ: 'at+jwt' }, pay({ ver: '0.9' })))],
    'CV-012': async (e) => {
      const out = [];
      const tok = await sign(e, { typ: 'at+jwt' }, pay());
      const setFault = async (mode) => { if (e === 'platform') await s.facadeFault(mode === 'timeout' ? { mode: 'delay', ms: 3000 } : mode === 'status503' ? { mode: 'unavailable' } : { mode }); else mock.inject = { mode }; };
      for (const mode of ['timeout', 'status503', 'drop_decision_id', 'wrong_request_id']) { await setFault(mode); out.push({ sub: mode, ...(await call(e, tok)) }); await setFault('none'); }
      out.push({ sub: 'deny', ...(await call(e, await sign(e, { typ: 'at+jwt' }, pay({ sub: stranger })))) });
      // revocation: grant then revoke, next request must be denied
      const g = await sign(e, { typ: 'at+jwt' }, pay({ sub: stranger }));
      const fx = ds.files.find((x) => x.tid === T1.id && x.id !== f.id);
      const t = { resource: { type: 'files/file', id: fx.id }, relation: 'viewer', subject: { type: 'core/user', id: stranger } };
      if (e === 'platform') await s.writeTuples(T1.id, { writes: [t], on_duplicate: 'ignore' }); else mock.allow.add(`${stranger}|files/file:${fx.id}|read`);
      out.push({ sub: 'granted', ...(await call(e, g, `/t/${T1.id}/files/${fx.id}`)) });
      if (e === 'platform') await s.deleteTuples(T1.id, [t]); else mock.allow.delete(`${stranger}|files/file:${fx.id}|read`);
      out.push({ sub: 'revoked', ...(await call(e, g, `/t/${T1.id}/files/${fx.id}`)) });
      return out;
    },
  };
  const expected = { POS: ['accept'], 'CV-001': ['reject'], 'CV-002': ['reject', 'reject', 'reject'], 'CV-003': ['reject'], 'CV-004': ['reject', 'reject', 'reject'], 'CV-005': ['accept', 'reject'], 'CV-006': ['reject'], 'CV-007': ['reject'], 'CV-008': ['reject', 'reject'], 'CV-010': ['reject'], 'CV-011': ['reject'], 'CV-013': ['accept'], 'CV-014': ['reject'], 'CV-012': ['unavailable', 'unavailable', 'unavailable', 'unavailable', 'reject', 'accept', 'reject'] };
  const cls = (st) => (st >= 200 && st < 300 ? 'accept' : st === 503 ? 'unavailable' : st >= 400 && st < 500 ? 'reject' : `other_${st}`);
  const results = {};
  for (const e of ['platform', 'mock']) for (const [id, fn] of Object.entries(V)) { const r = await fn(e); (results[id] ||= {})[e] = r.map((x) => ({ ...x, class: cls(x.status) })); run.append('vectors.jsonl', { env: e, id, results: results[id][e] }); }
  log('vectors done');
  if (results.POS.platform[0].class !== 'accept' || results.POS.mock[0].class !== 'accept') { const er = new Error(`positive vector ${JSON.stringify(results.POS)}`); er.abort = 'C-3'; throw er; }
  // ---- contract PRs ----
  const oas = YAML.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'authorization-api.openapi.yaml'), 'utf8'));
  const claims = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, 'schemas', 'access-token-claims.schema.json'), 'utf8'));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const S = (d) => d.components.schemas;
  const prs = {
    D1: ['oas', (d) => { S(d).EvaluationsRequest.properties.options.properties.evaluations_semantic.default = 'permit_on_first_permit'; }],
    D2: ['claims', (d) => { d.$defs.internalAccessTokenClaims.properties.ver.default = '1.0'; }],
    E1: ['oas', (d) => { S(d).Completeness.properties.status.enum.push('partial'); }],
    E2: ['oas', (d) => { S(d).ConsistencyMode.enum.push('eventual'); }],
    M1: ['claims', (d) => { d.$defs.internalAccessTokenClaims.properties.tid.description = 'home tenant of the subject (meaning changed: was the active tenant)'; }],
    M2: ['oas', (d) => { S(d).Reason.description = 'reason codes; allow now also covers known-good cached decisions (meaning changed)'; }],
    C1: ['claims', (d) => { d.$defs.internalAccessTokenClaims.properties.device_id = { type: 'string' }; d.$defs.internalAccessTokenClaims.required.push('device_id'); }],
    C2: ['oas', (d) => { S(d).ProfileDecision.required.push('obligations'); }],
    F1: ['oas', (d) => { delete S(d).ProfileDecision.properties.decision_id; S(d).ProfileDecision.required = S(d).ProfileDecision.required.filter((x) => x !== 'decision_id'); }],
    F2: ['oas', (d) => { delete S(d).PageResponse.properties.count; }],
  };
  const contractRes = {};
  for (const [id, [which, mut]] of Object.entries(prs)) { const before = which === 'oas' ? oas : claims; const after = clone(before); mut(after); const d = contractDiff(before, after); contractRes[id] = { blocked: d.block, kinds: [...new Set(d.breaking.map((b) => b.kind))] }; }
  const cleanContract = { oas: contractDiff(oas, clone(oas)).block, claims: contractDiff(claims, clone(claims)).block };
  // ---- code guard PRs ----
  const svc = (n) => ({ path: `services/${n}`, kind: 'service', text: fs.readFileSync(path.join(CODE_DIR, 'services', n), 'utf8') });
  const camBase = JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'model', 'cam.json'), 'utf8'));
  const baseTypes = new Set(camBase.types.map((t) => t.name));
  const clean = ['file-service.js', 'tool-service.js', 'label-service.js', 'edge.js', 'bff.js'].map(svc);
  const cleanRes = codeGuard([...clean, { path: 'model/cam.json', kind: 'cam', text: JSON.stringify({ ...camBase, owner: 'platform' }) }], baseTypes);
  const addLine = (fileObj, line) => ({ ...fileObj, text: `${line}\n${fileObj.text}` });
  const codePrs = {
    G1a: [addLine(svc('file-service.js'), "import { OpenFgaAdapter } from '../pdp/adapters/openfga.js';")],
    G1b: [addLine(svc('tool-service.js'), 'const chk = await request(`${topo.urls.openfga}/stores/${storeId}/check`, { body: q });')],
    G2a: [addLine(svc('file-service.js'), "const all = await request(`${topo.urls.pdp}/access/v1/search/resource`, { tls, body });")],
    G2b: [addLine(svc('label-service.js'), "const objs = await fga.call(`/stores/${sid}/list-objects`, body);")],
    G3a: [addLine(svc('file-service.js'), 'const acct = accountsByEmail.get(principal.email);')],
    G3b: [addLine(svc('file-service.js'), "const ownerTenant = params.id.split('-')[0];")],
    G4a: [{ path: 'domains/proj-ext.cam.json', kind: 'cam', text: JSON.stringify({ owner: 'proj', types: [{ name: 'core/project' }] }) }],
    G4b: [{ path: 'domains/files-ext.cam.json', kind: 'cam', text: JSON.stringify({ owner: 'docs', types: [{ name: 'files/file' }] }) }],
  };
  const codeRes = Object.fromEntries(Object.entries(codePrs).map(([id, files]) => { const r = codeGuard(files, baseTypes); return [id, { blocked: r.block, rules: [...new Set(r.findings.map((x) => x.rule))] }]; }));
  await s.facadeFault({ mode: 'none' });
  await pg.stopAll();
  await mock.stop(); mock = null;
  await s.stop(); s = null;
  run.writeJson('results.json', { vectors: results, contract_prs: contractRes, contract_clean_blocked: cleanContract, code_prs: codeRes, code_clean_findings: cleanRes.findings });
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  // ---------------- evaluation ----------------
  const mism = [], expMiss = [];
  for (const [id, r] of Object.entries(results)) {
    r.platform.forEach((p, i) => {
      const m = r.mock[i];
      // observable shape (kit §9.1 P-5): status, error code, and the set of response fields (values such as decision_id are per-call)
      const shape = (x) => { let j; try { j = JSON.parse(x.body); } catch { return { status: x.status, raw: x.body.length ? 'non-json' : '' }; } return { status: x.status, error: j?.error ?? null, fields: j && typeof j === 'object' ? Object.keys(j).sort() : [] }; };
      if (p.class !== m.class || JSON.stringify(shape(p)) !== JSON.stringify(shape(m))) mism.push({ id, i, sub: p.sub, platform: shape(p), mock: shape(m) });
      if (p.class !== expected[id][i]) expMiss.push({ id, i, env: 'platform', got: p.class, want: expected[id][i] });
      if (m.class !== expected[id][i]) expMiss.push({ id, i, env: 'mock', got: m.class, want: expected[id][i] });
    });
  }
  const decl = params.contract_prs.declarable, sem = params.contract_prs.semantic_only;
  const declStopped = decl.filter((id) => contractRes[id].blocked).length;
  const crit = {
    mock_platform_mismatches: { value: mism.length, pass: mism.length === 0, vectors_run: Object.keys(V).length, expected_misses: expMiss, note: '補助: 期待結果との不一致（expected_misses）は 0 件であること' },
    declarable_violation_stop_rate: { value: declStopped / decl.length, pass: declStopped === decl.length && !cleanContract.oas && !cleanContract.claims },
    semantic_misses: { value: sem.filter((id) => !contractRes[id].blocked).length, kinds: sem.filter((id) => !contractRes[id].blocked), pass: null, note: '記録のみ（許容値 TBD）' },
    ci_guard_reject_rate: { value: Object.values(codeRes).filter((x) => x.blocked).length / Object.keys(codeRes).length, pass: Object.values(codeRes).every((x) => x.blocked) && cleanRes.findings.length === 0, clean_tree_false_positives: cleanRes.findings.length },
  };
  crit.mock_platform_mismatches.pass = crit.mock_platform_mismatches.pass && expMiss.length === 0;
  Object.assign(evalOut, { criteria: crit, mismatches: mism, verdict: Object.values(crit).every((c) => c.pass !== false) ? '合格' : '不合格', na: { 'CV-009': params.vectors['CV-009'] } });
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  if (e.harnessCheck) status = 'harness-check';
  else { status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error'; evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack }; evalOut.verdict = '中止'; console.error(e.stack); }
} finally {
  await pg.stopAll();
  if (mock) await mock.stop();
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, ['vectors.jsonl', 'results.json']); else run.writeJson('harness-check.json', { abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
