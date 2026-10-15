// TC-013 AuthZEN adapter による 2 エンジン差替え（preregistered-test-plan.md §4.13）
//   node tests/engine-swap-perf-audit/TC-013.js
// Steps (plan): (1) reference services through the contract suite on OpenFGA, (2) switch only the façade
// configuration to Cedar and replay the same suite / request sequence (and back to OpenFGA), (3) count the
// consumer code diff with git, (4) inject request-ID missing / mismatch and a PDP metadata mix-up,
// (5) evaluate the requirement catalog (G-108) on both engines.
import fs from 'node:fs';
import path from 'node:path';
import { startStack, seed } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { seededRng, opaqueId } from '../../lib/ids.js';
import { ProcGroup } from '../../harness/proc.js';
import { OPENFGA_BIN } from '../../lib/topology.js';
import { openRun, groupPortBase, writeEval, readJsonl, sleep, sha256File, HERE } from './common.js';
import { oasValidator, refEvaluate, snapshotConsumer, diffConsumer, pick } from './lib/helpers.js';
import { evaluateCatalog } from './lib/catalog.js';

const TC = 'TC-013';
const { run, params } = openRun(TC, { seed: 13 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const portBase = groupPortBase(TC);
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const rng = seededRng(`TC-013:${params.seed}`);
const oas = oasValidator();
let status = 'completed';
const abort = (code, reason) => { const e = new Error(reason); e.abort = code; throw e; };
let s;
const stackOpts = { tc: TC, run, engine: 'openfga', dataset: ds, seed: params.dataset.seed, portBase, faultAdmin: true, env: {} };

// ------------------------------------------------------------------------------------------------
// suite construction (deterministic from the dataset and the seed; expected values from the reference evaluator)
// ------------------------------------------------------------------------------------------------
const tenants = ds.tenants.slice(0, params.suite.tenants_used);
const members = (tid) => ds.users.filter((u) => u.status === 'active' && u.memberships.some((m) => m.tid === tid && m.kind === 'member'));
const NONEXISTENT = 'synzzzzzzzzzzzzzzzzzzzzzzz';
const cases = [];
const add = (c) => cases.push({ id: `S${String(cases.length + 1).padStart(3, '0')}`, ...c });
const refQ = [];
const q = (user, type, id, permission) => { refQ.push({ user, type, id, permission }); return refQ.length - 1; };
for (const t of tenants) {
  const mem = members(t.id);
  const other = tenants.find((x) => x.id !== t.id);
  const otherUser = members(other.id).find((u) => !u.memberships.some((m) => m.tid === t.id));
  const files = ds.files.filter((f) => f.tid === t.id);
  const chosen = [];
  for (let i = 0; i < params.suite.files_per_tenant; i++) chosen.push(pick(rng, files));
  for (const f of chosen) {
    const owner = f.owner;
    const u = pick(rng, mem.filter((x) => x.id !== owner)).id;
    add({ ep: 'file.read', user: owner, tid: t.id, method: 'GET', path: `/t/${t.id}/files/${f.id}`, kind: 'positive-control', expectQ: q(owner, 'files/file', f.id, 'read') });
    add({ ep: 'file.read', user: u, tid: t.id, method: 'GET', path: `/t/${t.id}/files/${f.id}`, kind: 'same-tenant', expectQ: q(u, 'files/file', f.id, 'read') });
    add({ ep: 'file.read', user: otherUser.id, tid: other.id, method: 'GET', path: `/t/${other.id}/files/${f.id}`, kind: 'cross-tenant', expect: 'deny' });
    add({ ep: 'file.read', user: owner, tid: t.id, method: 'GET', path: `/t/${t.id}/files/${NONEXISTENT}`, kind: 'nonexistent', expect: 'deny' });
    add({ ep: 'file.read+labels', user: owner, tid: t.id, method: 'GET', path: `/t/${t.id}/files/${f.id}?labels=1`, kind: 'positive', expectQ: q(owner, 'files/file', f.id, 'read') });
    add({ ep: 'label.read', user: owner, tid: t.id, method: 'GET', path: `/t/${t.id}/labels/${f.id}`, kind: 'positive', expectQ: q(owner, 'files/file', f.id, 'read') });
    add({ ep: 'label.read', user: u, tid: t.id, method: 'GET', path: `/t/${t.id}/labels/${f.id}`, kind: 'same-tenant', expectQ: q(u, 'files/file', f.id, 'read') });
    add({ ep: 'file.signed_url', user: owner, tid: t.id, method: 'POST', path: `/t/${t.id}/files/${f.id}/url`, body: {}, kind: 'positive', expectQ: q(owner, 'files/file', f.id, 'read'), followDownload: true });
    const u2 = pick(rng, mem).id;
    add({ ep: 'file.write', user: u2, tid: t.id, method: 'PUT', path: `/t/${t.id}/files/${f.id}`, body: { content: `tc013 ${f.id}` }, kind: 'same-tenant', expectQ: q(u2, 'files/file', f.id, 'write') });
    add({ ep: 'file.write', user: otherUser.id, tid: other.id, method: 'PUT', path: `/t/${other.id}/files/${f.id}`, body: { content: 'x' }, kind: 'cross-tenant', expect: 'deny' });
  }
  const folders = ds.folders.filter((f) => f.tid === t.id);
  for (let i = 0; i < params.suite.folders_per_tenant; i++) {
    const fo = pick(rng, folders);
    const u = pick(rng, mem).id;
    add({ ep: 'folder.list', user: fo.owner, tid: t.id, method: 'GET', path: `/t/${t.id}/folders/${fo.id}/files`, kind: 'positive', expectQ: q(fo.owner, 'files/folder', fo.id, 'read'), listCheck: true });
    add({ ep: 'folder.list', user: u, tid: t.id, method: 'GET', path: `/t/${t.id}/folders/${fo.id}/files`, kind: 'same-tenant', expectQ: q(u, 'files/folder', fo.id, 'read'), listCheck: true });
  }
  const su = pick(rng, mem).id;
  add({ ep: 'file.search', user: su, tid: t.id, method: 'GET', path: `/t/${t.id}/files?limit=20`, kind: 'positive', expect: 'allow', searchCheck: true });
  add({ ep: 'file.search', user: otherUser.id, tid: other.id, method: 'GET', path: `/t/${t.id}/files?limit=20`, kind: 'cross-tenant', expect: 'deny' });
  const tool = ds.tools.find((x) => x.tid === t.id);
  const proj = ds.projects.find((p) => p.id === tool.project);
  const opTuple = ds.tuples.find((x) => x.resource.type === 'proj/tool_instance' && x.resource.id === tool.id && x.relation === 'operator');
  const operator = opTuple.subject.id;
  const tv = pick(rng, mem).id;
  add({ ep: 'tool.view', user: proj.owner, tid: t.id, method: 'GET', path: `/t/${t.id}/tools/${tool.id}`, kind: 'positive', expectQ: q(proj.owner, 'proj/tool_instance', tool.id, 'view') });
  add({ ep: 'tool.view', user: tv, tid: t.id, method: 'GET', path: `/t/${t.id}/tools/${tool.id}`, kind: 'same-tenant', expectQ: q(tv, 'proj/tool_instance', tool.id, 'view') });
  // tool.run: input file readable by the operator per the reference evaluator (chosen below after ref run)
  add({ ep: 'tool.run', user: operator, tid: t.id, method: 'POST', path: `/t/${t.id}/tools/${tool.id}/run`, toolRun: { tool: tool.id, operator }, kind: 'positive', expectQ: q(operator, 'proj/tool_instance', tool.id, 'use') });
  add({ ep: 'tool.config', user: proj.owner, tid: t.id, amr: params.suite.privileged_login_amr, method: 'PUT', path: `/t/${t.id}/tools/${tool.id}/config`, body: { config: { tc: 13 } }, kind: 'positive', expectQ: q(proj.owner, 'proj/tool_instance', tool.id, 'config') });
  add({ ep: 'tool.config', user: operator, tid: t.id, amr: params.suite.privileged_login_amr, method: 'PUT', path: `/t/${t.id}/tools/${tool.id}/config`, body: { config: { tc: 13 } }, kind: 'same-tenant', expectQ: q(operator, 'proj/tool_instance', tool.id, 'config') });
  add({ ep: 'tool.config', user: proj.owner, tid: t.id, method: 'PUT', path: `/t/${t.id}/tools/${tool.id}/config`, body: { config: { tc: 13 } }, kind: 'acr-below-floor', expect: 'deny401' });
}
// tool.run inputs: for each tool.run case pick a file of the tenant that the operator can read (ref)
const runInputs = {};
for (const c of cases.filter((x) => x.toolRun)) {
  const files = ds.files.filter((f) => f.tid === c.tid);
  runInputs[c.id] = files.map((f) => ({ f, qi: q(c.toolRun.operator, 'files/file', f.id, 'read') }));
}
// lifecycle (per phase, fresh resources): owner of a folder with editor rights on two folders
const lcTenant = tenants[0];
const lcOwner = (() => {
  const fs0 = ds.folders.filter((f) => f.tid === lcTenant.id);
  const byOwner = new Map();
  for (const f of fs0) byOwner.set(f.owner, [...(byOwner.get(f.owner) || []), f]);
  for (const [o, l] of byOwner) if (l.length >= 2) return { owner: o, from: l[0], to: l[1] };
  return { owner: fs0[0].owner, from: fs0[0], to: fs0.find((x) => x.owner === fs0[0].owner && x.id !== fs0[0].id) || fs0[1] };
})();
const lcGrantee = members(lcTenant.id).find((u) => u.id !== lcOwner.owner).id;

const now = new Date();
const refOut = refEvaluate({ tuples: ds.tuples, queries: refQ, now });
for (const c of cases) if (c.expectQ !== undefined) c.expect = refOut[c.expectQ] === true ? 'allow' : refOut[c.expectQ] === false ? 'deny' : 'indeterminate';
for (const c of cases.filter((x) => x.toolRun)) {
  const ok = runInputs[c.id].find((x) => refOut[x.qi] === true);
  c.body = { file_id: (ok ? ok.f : runInputs[c.id][0].f).id, with_labels: true };
  if (!ok) c.expect = 'deny';
}
run.writeJson('suite.json', { generated_at: new Date().toISOString(), ref_now: now.toISOString(), cases: cases.map(({ expectQ, toolRun, ...c }) => c), lifecycle: { tenant: lcTenant.id, owner: lcOwner.owner, from: lcOwner.from.id, to: lcOwner.to.id, grantee: lcGrantee } });
log(`suite: ${cases.length} cases`, JSON.stringify(cases.reduce((m, c) => ((m[c.expect] = (m[c.expect] || 0) + 1), m), {})));

// ------------------------------------------------------------------------------------------------
// execution helpers
// ------------------------------------------------------------------------------------------------
const sessions = new Map();
async function sessionFor(user, tid, amr = params.suite.login_amr) {
  const k = `${user}|${tid}|${amr}`;
  if (!sessions.has(k)) {
    const u = await s.login({ sub: user, tid, amr });
    if (!u.ok) throw new Error(`login failed for ${k}: ${u.status}`);
    sessions.set(k, u);
  }
  return sessions.get(k);
}
const NOT_FOUND_BODY = JSON.stringify({ error: 'not_found' });
function classify(c, r) {
  if (c.expect === 'allow') return r.status >= 200 && r.status < 300;
  if (c.expect === 'deny') return r.status === 404 && JSON.stringify(r.body) === NOT_FOUND_BODY;
  if (c.expect === 'deny401') return r.status === 401;
  return false;
}
async function runSuite(phase) {
  const results = [];
  for (const c of cases) {
    const u = await sessionFor(c.user, c.tid, c.amr);
    const t0 = Date.now();
    const r = await u.call(c.method, c.path, c.body);
    const rec = { phase, case: c.id, ep: c.ep, kind: c.kind, expect: c.expect, status: r.status, ms: Date.now() - t0, decision_id: r.body?.decision_id, downstream_decision_id: r.body?.downstream_decision_id, label_decision_id: r.body?.label_decision_id };
    rec.contract_ok = classify(c, r);
    if (c.followDownload && r.status === 200 && r.body?.url) {
      const d = await u.call('GET', r.body.url);
      rec.download_status = d.status;
      rec.contract_ok = rec.contract_ok && d.status === 200;
    }
    if (c.listCheck && r.status === 200) {
      // every returned item must be readable per the reference evaluator (post-check correctness)
      rec.list_items = (r.body.items || []).map((x) => x.id);
    }
    if (c.searchCheck && r.status === 200) {
      rec.search_items = (r.body.items || []).map((x) => x.id);
      rec.search_completeness = r.body.completeness;
    }
    results.push(rec);
    run.append('requests.jsonl', rec);
  }
  // lifecycle with fresh resources
  const lc = [];
  const ou = await sessionFor(lcOwner.owner, lcTenant.id);
  const gu = await sessionFor(lcGrantee, lcTenant.id);
  const T = lcTenant.id;
  const step = async (name, p, expectFn) => { const r = await p; const rec = { phase, case: `LC-${name}`, ep: name, kind: 'lifecycle', status: r.status, contract_ok: expectFn(r) }; lc.push(rec); run.append('requests.jsonl', rec); return r; };
  const cr = await step('file.create', ou.call('POST', `/t/${T}/folders/${lcOwner.from.id}/files`, { content: `lc ${phase}` }), (r) => r.status === 201);
  const nid = cr.body?.id || NONEXISTENT;
  await sleep(300);
  await step('file.read(new)', ou.call('GET', `/t/${T}/files/${nid}`), (r) => r.status === 200);
  await step('file.share', ou.call('POST', `/t/${T}/files/${nid}/share`, { grantee_sub: lcGrantee }), (r) => r.status === 200);
  await sleep(300);
  await step('shared read', gu.call('GET', `/t/${T}/files/${nid}`), (r) => r.status === 200);
  await step('file.move', ou.call('POST', `/t/${T}/files/${nid}/move`, { to_folder: lcOwner.to.id }), (r) => r.status === 200);
  await sleep(300);
  await step('file.delete', ou.call('DELETE', `/t/${T}/files/${nid}`), (r) => r.status === 204);
  await sleep(300);
  await step('read after delete', ou.call('GET', `/t/${T}/files/${nid}`), (r) => r.status === 404);
  return [...results, ...lc];
}

// façade direct contract cases (harness as PEP caller)
async function facadeCases(phase) {
  const out = [];
  const t = tenants[0];
  const f = cases.find((c) => c.kind === 'positive-control');
  const fileId = f.path.split('/').pop();
  const owner = f.user;
  const tool = ds.tools.find((x) => x.tid === t.id);
  const subj = (id, tid = t.id, extra = {}) => ({ type: 'core/user', id, properties: { tid, principal_type: 'human', acr: 'L2', ...extra } });
  const res = (type, id, tid = t.id) => ({ type, id, properties: { tid } });
  const ctx = (extra = {}) => ({ 'x-authz-profile': { profile_version: '1.0', ...extra } });
  const call = async (p, body, method = 'POST') => {
    const rid = opaqueId();
    const r = await s.req(`${s.topo.urls.pdp}${p}`, { method, body, headers: { 'x-request-id': rid } });
    return { r, rid, echo: r.headers['x-request-id'] === rid, j: r.json() };
  };
  const rec = (id, ok, extra) => { const o = { phase, case: id, ok, ...extra }; out.push(o); run.append('facade-contract.jsonl', o); };
  // F01
  { const { r, rid, echo, j } = await call('/.well-known/authzen-configuration', undefined, 'GET'); const errs = oas.validate('PdpMetadata', j); rec('F01', r.status === 200 && !errs && j.policy_decision_point === s.topo.issuers.pdp, { status: r.status, schema_errors: errs, echo, pdp: j?.policy_decision_point }); }
  const dec = async (id, body, expectFn, schema = 'Decision', p = '/access/v1/evaluation') => {
    const { r, echo, j } = await call(p, body);
    const errs = r.status === 200 ? oas.validate(schema, j) : null;
    const prof = j?.context?.['x-authz-profile'];
    rec(id, r.status !== 200 ? expectFn(r, j) : (!errs && echo && expectFn(r, j)), { status: r.status, schema_errors: errs, echo, decision: j?.decision, reason: prof?.reason, mode: prof?.consistency?.mode, n: j?.evaluations?.length, reasons: j?.evaluations?.map((e) => e.context?.['x-authz-profile']?.reason) });
  };
  await dec('F02', { subject: subj(owner), action: { name: 'read' }, resource: res('files/file', fileId), context: ctx() }, (r, j) => j.decision === true && j.context['x-authz-profile'].reason === 'allow');
  const stranger = members(t.id).find((u) => u.id !== owner).id;
  const strangerQ = refEvaluate({ tuples: ds.tuples, queries: [{ user: stranger, type: 'files/file', id: fileId, permission: 'read' }], now });
  await dec('F03', { subject: subj(stranger), action: { name: 'read' }, resource: res('files/file', fileId), context: ctx() }, (r, j) => j.decision === strangerQ[0] && j.context['x-authz-profile'].reason === (strangerQ[0] ? 'allow' : 'deny_no_relation'));
  await dec('F04', { subject: subj(owner), action: { name: 'read' }, resource: res('files/file', fileId, tenants[1].id), context: ctx() }, (r, j) => j.decision === false && j.context['x-authz-profile'].reason.startsWith('deny_guardrail:'));
  await dec('F05', { subject: subj(owner), action: { name: 'read' }, resource: res('files/file', fileId), context: ctx({ profile_version: '2.0' }) }, (r, j) => j.decision === false && j.context['x-authz-profile'].reason === 'unsupported_profile');
  await dec('F06', { subject: { type: 'core/user', id: owner, properties: { principal_type: 'human', acr: 'L2' } }, action: { name: 'read' }, resource: { type: 'files/file', id: fileId }, context: ctx() }, (r, j) => j.decision === false && j.context['x-authz-profile'].reason === 'deny_indeterminate');
  const items = [{ action: { name: 'read' }, resource: res('files/file', fileId) }, { action: { name: 'read' }, resource: res('files/file', NONEXISTENT) }, { action: { name: 'write' }, resource: res('files/file', fileId) }];
  await dec('F07', { subject: subj(owner), context: ctx(), evaluations: items, options: { evaluations_semantic: 'execute_all' } }, (r, j) => j.evaluations.length === 3 && j.evaluations[0].decision === true && j.evaluations[1].decision === false, 'EvaluationsResponse', '/access/v1/evaluations');
  await dec('F08', { subject: subj(owner), context: ctx(), evaluations: [items[1], items[0]], options: { evaluations_semantic: 'deny_on_first_deny' } }, (r, j) => j.evaluations.length === 1 && j.evaluations[0].decision === false, 'EvaluationsResponse', '/access/v1/evaluations');
  await dec('F09', { subject: subj(owner, t.id, { acr: 'L2-PR' }), context: ctx(), evaluations: [{ action: { name: 'config' }, resource: res('proj/tool_instance', tool.id) }], options: { evaluations_semantic: 'permit_on_first_permit' } }, (r) => r.status === 400, 'EvaluationsResponse', '/access/v1/evaluations');
  await dec('F10', { subject: subj(owner), action: { name: 'write' }, resource: res('files/file', fileId), context: ctx({ consistency: { mode: 'minimize_latency' } }) }, (r, j) => j.context['x-authz-profile'].consistency.mode === 'fully_consistent');
  { // F11 search
    const sb = (sub, token, limit = 5) => ({ subject: subj(sub), action: { name: 'read' }, resource: { type: 'files/file' }, context: ctx(), page: { limit, ...(token ? { token } : {}) } });
    const a = await call('/access/v1/search/resource', sb(owner));
    const errs = a.r.status === 200 ? oas.validate('ResourceSearchResponse', a.j) : ['status ' + a.r.status];
    const tok = a.j?.page?.next_token;
    let bound = null;
    if (tok) { const b = await call('/access/v1/search/resource', sb(stranger, tok)); bound = b.r.status; }
    const lim = await call('/access/v1/search/resource', sb(owner, undefined, 101));
    rec('F11', !errs && a.echo && (bound === null || bound === 403) && lim.r.status === 400, { status: a.r.status, schema_errors: errs, echo: a.echo, next_token: !!tok, other_subject_token_status: bound, limit101_status: lim.r.status, results: a.j?.results?.length, completeness: a.j?.context?.['x-authz-profile']?.completeness });
  }
  { const { r, echo } = await call('/access/v1/evaluation', { subject: { type: 'core/user' } }); rec('F12', r.status === 400 && echo, { status: r.status, echo }); }
  return out;
}

async function setEngine(engine) {
  stackOpts.env.pdp = { ...(stackOpts.env.pdp || {}), PDP_ENGINE: engine };
  if (engine === 'openfga' && !s.procs.running('openfga')) await s.start('openfga');
  await s.restart('pdp');
  if (engine === 'cedar') {
    await s.procs.stop('openfga'); // the Cedar configuration does not depend on OpenFGA
  }
}
const pids = () => Object.fromEntries(['tool-service', 'file-service', 'label-service', 'edge', 'bff', 'sts', 'as-a'].map((n) => [n, s.procs.procs.get(n)?.child.pid ?? null]));

// ------------------------------------------------------------------------------------------------
const evalOut = { tc: TC, phases: {}, injections: {}, abort: null };
try {
  s = await startStack(stackOpts);
  log('stack up (openfga)');
  const snapDir = path.join(run.dir, 'consumer-snapshot-before');
  snapshotConsumer(snapDir);
  const pidsA = pids();
  // ---- phase A: OpenFGA ----
  const A = await runSuite('A:openfga');
  const FA = await facadeCases('A:openfga');
  const posFail = A.filter((r) => r.kind === 'positive-control' && !r.contract_ok).length + FA.filter((r) => ['F01', 'F02'].includes(r.case) && !r.ok).length;
  if (posFail > params.abort['C-3_positive_control_max_failure_rate']) abort('C-3', `positive control failures in phase A: ${posFail}`);
  log(`phase A done: contract fails ${A.filter((r) => !r.contract_ok).length}, facade fails ${FA.filter((r) => !r.ok).length}`);
  // ---- phase B: Cedar (only the façade configuration changes) ----
  const tSwitch = Date.now();
  await setEngine('cedar');
  await seed(s);
  const switchMs = Date.now() - tSwitch;
  const pidsB = pids();
  const B = await runSuite('B:cedar');
  const FB = await facadeCases('B:cedar');
  log(`phase B done: contract fails ${B.filter((r) => !r.contract_ok).length}, facade fails ${FB.filter((r) => !r.ok).length}`);
  // request-ID injections on Cedar
  const injectReads = cases.filter((c) => c.kind === 'positive-control' || (c.ep === 'file.read' && c.expect === 'allow')).slice(0, params.injections.per_injection_requests);
  const injRun = async (label, mode) => {
    run.append('inject.jsonl', { label, mode, event: 'inject_start' }); // window boundary before the fault is set (v2 fix)
    await s.facadeFault({ mode });
    const out = [];
    for (const c of injectReads) { const u = await sessionFor(c.user, c.tid); const r = await u.call(c.method, c.path); out.push({ case: c.id, status: r.status }); run.append('inject.jsonl', { label, mode, case: c.id, status: r.status }); }
    await s.facadeFault({ mode: 'none' });
    return { mode, n: out.length, status: out.reduce((m, x) => ((m[x.status] = (m[x.status] || 0) + 1), m), {}), used: out.filter((x) => x.status >= 200 && x.status < 300).length };
  };
  evalOut.injections.cedar = { wrong_request_id: await injRun('B', 'wrong_request_id'), drop_request_id: await injRun('B', 'drop_request_id'), drop_decision_id: await injRun('B', 'drop_decision_id') };
  // ---- phase C: back to OpenFGA ----
  await setEngine('openfga');
  const pidsC = pids();
  const C = await runSuite('C:openfga');
  const FC = await facadeCases('C:openfga');
  log(`phase C done: contract fails ${C.filter((r) => !r.contract_ok).length}, facade fails ${FC.filter((r) => !r.ok).length}`);
  evalOut.injections.openfga = { wrong_request_id: await injRun('C', 'wrong_request_id'), drop_request_id: await injRun('C', 'drop_request_id'), drop_decision_id: await injRun('C', 'drop_decision_id') };
  // ---- (3) consumer code diff (before the metadata test, which restarts file-service but changes no code) ----
  const diff = diffConsumer(snapDir);
  run.writeJson('code-diff.json', { method: 'git diff --no-index --numstat <snapshot before phase A> <live tree after phase C>', paths: ['services', 'pep', 'config/ledger.json'], ...diff });
  // ---- (4) metadata mix-up ----
  const decFile = path.join(run.dir, 'pdp', 'decisions.jsonl');
  run.append('inject.jsonl', { label: 'metadata', mode: 'metadata_mixup', event: 'inject_start' });
  await s.facadeFault({ mode: 'metadata_mixup' });
  await s.restart('file-service');
  const mStart = new Date().toISOString();
  const mOut = [];
  for (const c of injectReads) { const u = await sessionFor(c.user, c.tid); const r = await u.call(c.method, c.path); mOut.push(r.status); run.append('inject.jsonl', { label: 'metadata', mode: 'metadata_mixup', case: c.id, status: r.status }); }
  const mEnd = new Date().toISOString();
  await s.facadeFault({ mode: 'none' });
  const usedDuring = readJsonl(decFile).filter((d) => d.t >= mStart && d.t <= mEnd && d.caller === 'file-service').length;
  await s.restart('file-service');
  await sleep(300);
  const rec0 = injectReads[0];
  const recov = await (await sessionFor(rec0.user, rec0.tid)).call(rec0.method, rec0.path);
  evalOut.injections.metadata_mixup = { n: mOut.length, status: mOut.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {}), served_2xx: mOut.filter((x) => x >= 200 && x < 300).length, facade_decisions_from_file_service_during_mixup: usedDuring, recovery_status_after_clear: recov.status };
  await sleep(1500);
  // ---- metrics ----
  const all = { A, B, C };
  const contractFailures = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.filter((r) => !r.contract_ok).map((r) => ({ case: r.case, ep: r.ep, expect: r.expect, status: r.status }))]));
  const facadeFailures = { A: FA.filter((r) => !r.ok), B: FB.filter((r) => !r.ok), C: FC.filter((r) => !r.ok) };
  // engine decision diffs: per case status (and façade direct decision/reason)
  const byCase = (rs) => new Map(rs.map((r) => [r.case, r.status]));
  const mA = byCase(A), mB = byCase(B), mC = byCase(C);
  const diffs = [];
  for (const [k, v] of mA) { if (mB.get(k) !== v) diffs.push({ case: k, A: v, B: mB.get(k) }); if (mC.get(k) !== v) diffs.push({ case: k, A: v, C: mC.get(k) }); }
  const fkey = (r) => JSON.stringify([r.status, r.decision, r.reason, r.n, r.reasons]);
  for (const [i, fa] of FA.entries()) { if (fkey(fa) !== fkey(FB[i])) diffs.push({ case: fa.case, A: fkey(fa), B: fkey(FB[i]) }); if (fkey(fa) !== fkey(FC[i])) diffs.push({ case: fa.case, A: fkey(fa), C: fkey(FC[i]) }); }
  // list/search outputs must also be identical across engines
  for (const r of A.filter((x) => x.list_items || x.search_items)) {
    for (const [lab, other] of [['B', B], ['C', C]]) {
      const o = other.find((x) => x.case === r.case);
      if (JSON.stringify(r.list_items || r.search_items) !== JSON.stringify(o?.list_items || o?.search_items)) diffs.push({ case: r.case, kind: 'list_items', A: (r.list_items || r.search_items || []).length, [lab]: (o?.list_items || o?.search_items || []).length });
    }
  }
  // request-ID echo: PEP-side echo failures in normal phases + harness direct calls
  const pepLogs = fs.readdirSync(path.join(run.dir, 'pep')).filter((f) => f.endsWith('-enforce.jsonl')).flatMap((f) => readJsonl(path.join(run.dir, 'pep', f)));
  const injWindows = readJsonl(run.file('inject.jsonl'));
  const starts = injWindows.filter((x) => x.event === 'inject_start').map((x) => x.t).sort();
  const firstInj = starts.length ? starts[0] : '9999'; // v2: boundary = first inject_start (v1 used the first per-request record, which is written after the response)
  const pepCalls = pepLogs.filter((l) => l.request_id);
  const echoFailNormal = pepLogs.filter((l) => /request_id_echo/.test(l.internal_reason || '') && l.t < firstInj).length;
  const directCalls = [...FA, ...FB, ...FC].filter((r) => r.echo !== undefined);
  const directEchoOk = directCalls.filter((r) => r.echo).length;
  // decision=false must never proceed: every 'permitted' enforcement has a façade decision=true
  const decisions = new Map(readJsonl(decFile).filter((d) => d.decision_id).map((d) => [d.decision_id, d]));
  const proceededOnFalse = pepLogs.filter((l) => l.result === 'permitted' && l.decision_id && decisions.get(l.decision_id)?.decision !== true).length;
  // list items post-check vs reference
  const listQ = [];
  for (const r of [...A, ...B, ...C].filter((x) => x.list_items || x.search_items)) for (const id of (r.list_items || r.search_items)) listQ.push({ r, id, user: cases.find((c) => c.id === r.case).user });
  const listRef = listQ.length ? refEvaluate({ tuples: ds.tuples, queries: listQ.map((x) => ({ user: x.user, type: 'files/file', id: x.id, permission: 'read' })), now }) : [];
  const listViolations = listQ.filter((x, i) => listRef[i] !== true).map((x) => ({ case: x.r.case, phase: x.r.phase, id: x.id }));
  // catalog
  await s.stop();
  s = null;
  log('stack stopped; evaluating catalog');
  const pg = new ProcGroup({ logDir: path.join(run.dir, 'logs-catalog') });
  await pg.start('openfga-catalog', OPENFGA_BIN, ['run', '--datastore-engine', 'memory', '--http-addr', `127.0.0.1:${portBase + 14}`, '--grpc-addr', `127.0.0.1:${portBase + 15}`, '--playground-enabled=false', '--metrics-enabled=false', '--log-level', 'warn'], { ready: { url: `http://127.0.0.1:${portBase + 14}/healthz` } });
  let catalog;
  try { catalog = await evaluateCatalog(JSON.parse(fs.readFileSync(path.join(HERE, 'params', 'TC-013-catalog.json'), 'utf8')), `http://127.0.0.1:${portBase + 14}`); } finally { await pg.stopAll(); }
  run.writeJson('catalog-results.json', catalog);
  // ---- evaluation ----
  const totalContract = A.length + B.length + C.length + FA.length + FB.length + FC.length;
  const failedContract = Object.values(contractFailures).flat().length + Object.values(facadeFailures).flat().length;
  const metaUses = evalOut.injections.metadata_mixup.facade_decisions_from_file_service_during_mixup + evalOut.injections.metadata_mixup.served_2xx;
  const injUsed = [...Object.values(evalOut.injections.cedar), ...Object.values(evalOut.injections.openfga)].reduce((n, x) => n + x.used, 0);
  const echoRate = (pepCalls.filter((l) => l.t < firstInj).length - echoFailNormal + directEchoOk) / (pepCalls.filter((l) => l.t < firstInj).length + directCalls.length);
  const crit = {
    consumer_code_diff_lines: { value: diff.lines, pass: diff.lines === 0 },
    contract_tests_all_pass: { value: { total: totalContract, failed: failedContract }, pass: failedContract === 0 },
    request_id_echo_rate: { value: echoRate, pass: echoRate === 1 && injUsed === 0, detail: { pep_calls_normal: pepCalls.filter((l) => l.t < firstInj).length, pep_echo_failures_normal: echoFailNormal, direct_calls: directCalls.length, direct_echo_ok: directEchoOk, injected_mismatch_or_missing_used: injUsed } },
    metadata_mismatch_uses: { value: metaUses, pass: metaUses === 0 },
    engine_decision_diffs: { value: diffs.length, pass: diffs.length === 0, intended: params.criteria.intended_diffs },
    representability: { value: catalog.representability_rate, pass: null, note: '記録のみ（目標値 TBD）' },
  };
  const verdict = Object.values(crit).every((c) => c.pass !== false) ? '合格' : '不合格';
  Object.assign(evalOut, {
    verdict, criteria: crit,
    measures: {
      suite_cases_per_phase: A.length, facade_cases_per_phase: FA.length, switch_ms: switchMs,
      service_pids: { A: pidsA, B: pidsB, C: pidsC, unchanged_across_switch: JSON.stringify(pidsA) === JSON.stringify(pidsB) && JSON.stringify(pidsB) === JSON.stringify(pidsC) },
      proceeded_on_false_decision: proceededOnFalse, list_items_not_permitted_by_ref: listViolations.length,
      catalog: { entries: catalog.entries, representable_verified: catalog.representable_verified, partial_verified: catalog.partial_verified, not_representable: catalog.not_representable, verification_failed: catalog.verification_failed, engine_disagreements: catalog.engine_disagreements.length, alternatives_for_non_representable: catalog.alternatives_for_non_representable },
    },
    failures: { contract: contractFailures, facade: facadeFailures, diffs, list_violations: listViolations },
    observations: ['façade（adapter）経由の評価では request context として current_time だけが渡る。AC-09・AC-17・AC-18・AC-24 の条件は engine 単体では評価できるが、AuthZEN profile の現行 adapter からは request context を渡せない（PoC の実装範囲）'],
  });
  writeEval(run, evalOut, ['requests.jsonl', 'facade-contract.jsonl', 'inject.jsonl', 'code-diff.json', 'catalog-results.json', 'suite.json', 'pdp/decisions.jsonl']);
  log(`verdict ${verdict}`, JSON.stringify(crit));
} catch (e) {
  status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack };
  writeEval(run, { ...evalOut, verdict: '中止' });
  console.error(e.stack);
} finally {
  if (s) await s.stop();
  const meta = run.finish(status, { verdict: evalOut.verdict || '中止' });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
