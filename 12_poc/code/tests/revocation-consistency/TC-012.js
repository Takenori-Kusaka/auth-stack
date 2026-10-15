// TC-012 model migration differential・shadow・rollback (test plan §4.12, frozen commit 151940ac).
// Raw data only; pass/fail by eval-TC-012.js (§2.6).
//   node tests/revocation-consistency/TC-012.js [--prefreeze] [--freeze "<reason>"] [--property N]
// (1) v1 (model/cam.json), v2 (approved change), v2w (unapproved widening copy), v2n (deny-direction copy) and a
//     rule-generated set of widening mutants of v2 (params mutant_rule)
// (4) CI: model/diff.js on every candidate, then the façade registration gate (PDP_MODEL_GATE=1) without approvals
// (2) shadow: recorded PEP workload + property-generated requests, evaluated through the façade with model pins;
//     reference evaluator (Python) for the expected decisions; Cedar generator for the 2-generator comparison
// (5) Cedar analysis of candidate differences on bounded universes (what the CI could not see)
// (3) switch to v2, revoke, roll back to v1, check that no revoked relation is allowed again; re-presented requests
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fc from 'fast-check';
import { startStack } from '../../harness/stack.js';
import { args } from '../../lib/runtime.js';
import { CODE_DIR } from '../../lib/topology.js';
import { compileCam } from '../../model/cam.js';
import { diffModels, randomUniverse, CamEvaluator } from '../../model/diff.js';
import { CedarAdapter } from '../../pdp/adapters/cedar.js';
import { seededRng } from '../../lib/ids.js';
import { openRun, loadParams, datasetWithProbeUsers, monoMs, sleep, freeze, hardenReq } from './common.js';

const a = args();
const P = loadParams('TC-012');
const clone = (x) => JSON.parse(JSON.stringify(x));
function setPerm(raw, type, perm, expr) {
  const r = clone(raw);
  const p = r.types.find((t) => t.name === type).permissions.find((x) => x.name === perm);
  p.expression = expr;
  return r;
}
const revOf = (raw) => compileCam(raw).revision;

/** params mutant_rule */
function genMutants(v2) {
  const out = [];
  for (const tn of ['files/folder', 'files/file', 'proj/project', 'proj/tool_instance', 'core/unit']) {
    const t = v2.types.find((x) => x.name === tn);
    for (const p of t.permissions || []) {
      let expr;
      if (p.expression.includes(' - ')) { const parts = p.expression.split(' - '); expr = parts.slice(0, -1).join(' - '); }
      else {
        const toks = new Set(p.expression.match(/[a-z][a-z0-9_]*/g));
        const rel = (t.relations || []).find((r) => !toks.has(r.name));
        if (!rel) continue;
        expr = `${p.expression} | ${rel.name}`;
      }
      const m = setPerm(v2, tn, p.name, expr);
      try { compileCam(m); } catch (e) { out.push({ id: `${tn}#${p.name}`, skipped: `compile: ${e.message}` }); continue; }
      if (revOf(m) === revOf(v2)) continue;
      out.push({ id: `${tn}#${p.name}`, type: tn, permission: p.name, from: p.expression, to: expr, raw: m });
    }
  }
  return out;
}

if (!a.prefreeze && a.freeze) { const m = freeze('TC-012', String(a.freeze)); console.log('frozen manifest', m.ver, m.manifest_sha256); }
const { run } = openRun('TC-012', { seed: P.seed, prefreeze: !!a.prefreeze, purpose: 'TC-012' });
const { ds, tenant, users: probeUsers } = datasetWithProbeUsers({ seed: P.seed, profile: P.profile, n: 10, tag: 'tc012' });
const tid = tenant.id;
const v1 = JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'model', 'cam.json'), 'utf8'));
const v2 = setPerm(v1, P.models.v2_intended.type, P.models.v2_intended.permission, P.models.v2_intended.expression);
const v2w = setPerm(v2, P.models.v2w_unapproved_widening.type, P.models.v2w_unapproved_widening.permission, P.models.v2w_unapproved_widening.expression);
const v2n = setPerm(v2, P.models.v2n_deny_direction.type, P.models.v2n_deny_direction.permission, P.models.v2n_deny_direction.expression);
const mutants = genMutants(v2);
const models = { v1, v2, v2w, v2n, ...Object.fromEntries(mutants.filter((m) => m.raw).map((m, i) => [`m${String(i).padStart(2, '0')}`, m.raw])) };
const mutantMeta = mutants.map((m, i) => ({ ...m, raw: undefined, key: m.raw ? `m${String(mutants.filter((x, j) => x.raw && j < i).length).padStart(2, '0')}` : null }));
fs.mkdirSync(run.file('models'), { recursive: true });
const modelInfo = {};
for (const [k, raw] of Object.entries(models)) {
  fs.writeFileSync(run.file(`models/${k}.json`), JSON.stringify(raw, null, 2));
  modelInfo[k] = { revision: revOf(raw), sha256: crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex') };
}
run.writeJson('models.json', { models: modelInfo, mutants: mutantMeta, widening_candidates: ['v2w', ...mutantMeta.filter((m) => m.key).map((m) => m.key)] });

const s = await startStack({ tc: 'TC-012', run, engine: 'openfga', dataset: ds, env: { pdp: { PDP_MODEL_GATE: '1', PDP_MODEL_GATE_UNIVERSES: String(P.ci.universes) } }, settings: { accessTokenTtlSec: 7200 } });
let status = 'completed';
hardenReq(s); // retry harness requests on keep-alive resets (common.js)
try {
  const pdp = s.topo.urls.pdp;
  const approvals = (rev) => [{ approval_id: `apr-tc012-${rev}-1`, approver_role: 'domain_owner', model_revision: rev }, { approval_id: `apr-tc012-${rev}-2`, approver_role: 'platform_reviewer', model_revision: rev }];
  let latest = modelInfo.v1.revision;
  const reg = async (key, raw, { withApprovals = false, base = latest, approvalsFor, note } = {}) => {
    const rev = revOf(raw);
    const body = { cam: raw, base_revision: base, ...(withApprovals ? { approvals: approvals(approvalsFor || rev) } : {}) };
    const t0 = monoMs();
    const r = await s.req(`${pdp}/v1/models`, { body });
    const j = r.json();
    if (r.status === 201) latest = rev;
    run.append('registrations.jsonl', { key, revision: rev, base_revision: base, with_approvals: withApprovals, approvals_bound_to: withApprovals ? (approvalsFor || rev) : null, note, status: r.status, problem: j?.problem, report: j?.report, ms: +(monoMs() - t0).toFixed(1) });
    return r.status;
  };

  // ---------------------------------------------------------------- (4) CI on every candidate (stage 2 dry-run)
  const ciBase = { v2: v1, v2w: v2, v2n: v2, ...Object.fromEntries(Object.keys(models).filter((k) => /^m\d+$/.test(k)).map((k) => [k, v2])) };
  for (const [k, base] of Object.entries(ciBase)) {
    const t0 = monoMs();
    const rep = diffModels(base, models[k], { seed: modelInfo[k].revision, universes: P.ci.universes });
    run.append('ci-reports.jsonl', { candidate: k, base: k === 'v2' ? 'v1' : 'v2', revision: modelInfo[k].revision, requires_approval: rep.requires_approval, widening: rep.widening.map((w) => ({ key: `${w.type}#${w.permission}`, witness: w.witnesses[0] })), narrowing: rep.narrowing.map((w) => `${w.type}#${w.permission}`), unproven: rep.unproven, approval_reasons: rep.approval_reasons, changed: rep.changed_definitions, ms: +(monoMs() - t0).toFixed(1) });
  }
  // ---------------------------------------------------------------- (4) registration gate
  await reg('v2', v2, { note: 'intended change without approvals' });
  await reg('v2', v2, { withApprovals: true, note: 'intended change with approvals' });
  const candKeys = ['v2w', ...Object.keys(models).filter((k) => /^m\d+$/.test(k))];
  for (const k of candKeys) await reg(k, models[k], { note: 'widening candidate without approvals (must be refused)' });
  // register the candidates with approvals for the shadow stage (approval given in error for the unapproved copy)
  for (const k of [...candKeys, 'v2n']) await reg(k, models[k], { withApprovals: true, note: 'registered for shadow (stage 3)' });
  // re-presented requests
  const extra = setPerm(v2, 'proj/tool_instance', 'config', 'parent->admin | parent->members'); // v2 (supplementary): distinct from every mutant (v1 used 'parent->admin | operator' = mutant, already registered)
  const extraRev = revOf(extra);
  fs.writeFileSync(run.file('models/re_present_widening.json'), JSON.stringify(extra, null, 2));
  await reg('replay_v2_original_request', v2, { withApprovals: true, base: modelInfo.v1.revision, note: 're-presented original v2 registration (old base, already registered)' });
  await reg('re_present_widening_with_v2_approvals', extra, { withApprovals: true, approvalsFor: modelInfo.v2.revision, note: 'approvals bound to another revision' });
  await reg('re_present_widening_old_base', extra, { withApprovals: true, base: modelInfo.v1.revision, note: 'valid approvals, stale base_revision' });
  await reg('re_present_v1_as_new', v1, { withApprovals: true, base: modelInfo.v1.revision, note: 'old known-good model re-presented as a new registration' });
  const cur = (await s.req(`${pdp}/v1/models`, { method: 'GET' })).json();
  run.writeJson('registry-after-gate.json', cur);

  // ---------------------------------------------------------------- (2) recorded workload through the PEPs
  const rng = seededRng(`tc012:${P.seed}`);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const members = ds.users.filter((u) => !u.probe && u.memberships.some((m) => m.tid === tid && m.kind === 'member'));
  const wlUsers = Array.from({ length: P.requests.recorded_users }, () => pick(members).id);
  const sessions = [];
  for (const u of wlUsers) { const l = await s.login({ sub: u, tid, amr: 'pwd,fido' }); if (l.ok) sessions.push(l); }
  const lFiles = ds.files.filter((f) => f.tid === tid), lTools = ds.tools.filter((t) => t.tid === tid), lFolders = ds.folders.filter((f) => f.tid === tid);
  const decFile = path.join(run.dir, 'pdp', 'decisions.jsonl');
  const decStart = fs.existsSync(decFile) ? fs.readFileSync(decFile, 'utf8').split('\n').filter(Boolean).length : 0;
  for (let i = 0; i < P.requests.recorded_workload_calls; i++) {
    const se = pick(sessions);
    const op = pick(['read', 'read', 'write', 'tool_view', 'tool_config', 'list']);
    let r;
    if (op === 'read') r = await se.call('GET', `/t/${tid}/files/${pick(lFiles).id}`);
    else if (op === 'write') r = await se.call('PUT', `/t/${tid}/files/${pick(lFiles).id}`, { content: `tc012 workload ${i}` });
    else if (op === 'tool_view') r = await se.call('GET', `/t/${tid}/tools/${pick(lTools).id}`);
    else if (op === 'tool_config') r = await se.call('PUT', `/t/${tid}/tools/${pick(lTools).id}/config`, { config: { i } });
    else r = await se.call('GET', `/t/${tid}/folders/${pick(lFolders).id}/files`);
    run.append('workload.jsonl', { i, op, status: r.status });
  }
  const recorded = fs.readFileSync(decFile, 'utf8').split('\n').filter(Boolean).slice(decStart).map((l) => JSON.parse(l))
    .filter((d) => ['file-service', 'tool-service', 'label-service'].includes(d.caller) && d.resource?.id && d.subject?.id)
    .map((d) => ({ src: 'recorded', user: d.subject.id, type: d.resource.type, id: d.resource.id, permission: d.action }));
  // ---------------------------------------------------------------- (2) property-generated requests
  const v2c = compileCam(v2);
  const objects = [
    ...lFiles.map((f) => ['files/file', f.id]), ...lFolders.map((f) => ['files/folder', f.id]),
    ...ds.projects.filter((p) => p.tid === tid).map((p) => ['proj/project', p.id]), ...lTools.map((t) => ['proj/tool_instance', t.id]),
    ...ds.units.filter((u) => u.tid === tid).map((u) => ['core/unit', u.id]), ['core/tenant', tid],
  ];
  const related = new Map();
  for (const t of ds.tuples) if (t.subject.type === 'core/user') { const k = `${t.resource.type}:${t.resource.id}`; if (!related.has(k)) related.set(k, []); related.get(k).push(t.subject.id); }
  const allUsers = ds.users.map((u) => u.id);
  const arb = fc.record({ o: fc.nat({ max: objects.length - 1 }), p: fc.nat({ max: 50 }), rel: fc.double({ min: 0, max: 1, noNaN: true }), u: fc.nat({ max: 100000 }) }).map((x) => {
    const [type, id] = objects[x.o];
    const perms = [...v2c.types.get(type).perms.keys()];
    const rel = related.get(`${type}:${id}`) || [];
    const user = x.rel < P.requests.property_related_bias && rel.length ? rel[x.u % rel.length] : allUsers[x.u % allUsers.length];
    return { src: 'property', user, type, id, permission: perms[x.p % perms.length] };
  });
  const property = fc.sample(arb, { seed: P.seed, numRuns: Number(a.property || P.requests.property_requests) });
  const requests = [...recorded, ...property];
  run.writeJson('requests-set.json', { recorded: recorded.length, property: property.length, requests });

  // ---------------------------------------------------------------- (2) shadow through the façade (model pins)
  const keys = Object.keys(models);
  const now = Date.now();
  const tShadow = monoMs();
  for (let i = 0; i < requests.length; i++) {
    const q = requests[i];
    const body = {
      subject: { type: 'core/user', id: q.user, properties: { tid, principal_type: 'human', acr: P.requests.acr_for_replay } },
      action: { name: q.permission }, resource: { type: q.type, id: q.id, properties: { tid } },
      evaluations: keys.map((k) => ({ context: { 'x-authz-profile': { profile_version: '1.0', model: { pin: modelInfo[k].revision } } } })),
      options: { evaluations_semantic: 'execute_all' },
    };
    const r = await s.req(`${pdp}/access/v1/evaluations`, { body, headers: { 'x-request-id': crypto.randomBytes(13).toString('hex') } });
    const ev = r.json()?.evaluations || [];
    run.append('shadow.jsonl', { i, ...q, status: r.status, d: Object.fromEntries(keys.map((k, j) => [k, ev[j] ? ev[j].decision : null])), reason: Object.fromEntries(keys.map((k, j) => [k, ev[j]?.context?.['x-authz-profile']?.reason ?? null])), mr: Object.fromEntries(keys.map((k, j) => [k, ev[j]?.context?.['x-authz-profile']?.model_revision?.model_revision ?? null])) });
  }
  run.append('timing.jsonl', { stage: 'shadow', requests: requests.length, models: keys.length, ms: +(monoMs() - tShadow).toFixed(1) });

  // ---------------------------------------------------------------- reference evaluator (expected decisions)
  const tuplesFile = run.file('ref-tuples.json');
  fs.writeFileSync(tuplesFile, JSON.stringify(ds.tuples.map(({ tid: _t, ...t }) => t)));
  const qFile = run.file('ref-queries.jsonl');
  const belongsQ = [...new Set(requests.map((q) => q.user))];
  fs.writeFileSync(qFile, [...requests.map((q) => JSON.stringify({ user: q.user, type: q.type, id: q.id, permission: q.permission })), ...belongsQ.map((u) => JSON.stringify({ user: u, type: 'core/tenant', id: tid, permission: 'belongs' }))].join('\n') + '\n');
  for (const k of keys) {
    const out = execFileSync('python', ['-I', path.join(CODE_DIR, 'ref', 'ref_eval.py'), '--cam', run.file(`models/${k}.json`), '--tuples', tuplesFile, '--queries', qFile, '--now', new Date(now).toISOString()], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    fs.writeFileSync(run.file(`ref-${k}.jsonl`), out);
  }
  run.writeJson('ref-meta.json', { now: new Date(now).toISOString(), requests: requests.length, belongs_queries: belongsQ.length, belongs_users: belongsQ });

  // ---------------------------------------------------------------- 2 generators: Cedar (in-process) for v1 and v2
  const ced = new CedarAdapter({ storeFile: null });
  for (const k of ['v1', 'v2']) await ced.registerModel(compileCam(models[k]));
  const tup = ds.tuples.map(({ tid: _t, ...t }) => t);
  for (let i = 0; i < tup.length; i += 100) { const w = await ced.write({ writes: tup.slice(i, i + 100) }); if (!w.ok) throw new Error(`cedar write ${JSON.stringify(w)}`); }
  for (let i = 0; i < requests.length; i++) {
    const q = requests[i];
    const d = {};
    for (const k of ['v1', 'v2']) {
      const args2 = { subject: { type: 'core/user', id: q.user }, modelRevision: modelInfo[k].revision, mode: 'fully_consistent', now: Date.now() };
      const b = await ced.check({ ...args2, relation: 'belongs', resource: { type: 'core/tenant', id: tid } });
      const c = await ced.check({ ...args2, relation: q.permission, resource: { type: q.type, id: q.id } });
      d[k] = (b.error || c.error) ? { error: b.error || c.error, detail: b.detail || c.detail } : (b.allowed && c.allowed);
    }
    run.append('cedar.jsonl', { i, d });
  }

  // ---------------------------------------------------------------- (5) Cedar analysis on bounded universes
  const urng = seededRng(`tc012-cedar:${P.seed}`);
  for (const k of candKeys) {
    const base = v2, cand = models[k];
    const bc = compileCam(base), cc = compileCam(cand);
    const W = new Set();
    for (let u = 0; u < P.ci.cedar_analysis_universes; u++) {
      const uni = randomUniverse(base, cand, urng, { now });
      const eB = new CamEvaluator(base, [], now), eC = new CamEvaluator(cand, [], now);
      const A = new CedarAdapter({ storeFile: null }), B = new CedarAdapter({ storeFile: null });
      await A.registerModel(bc); await B.registerModel(cc);
      await A.write({ writes: uni.tuples.filter((t) => eB.valid(t)), onDuplicate: 'ignore' });
      await B.write({ writes: uni.tuples.filter((t) => eC.valid(t)), onDuplicate: 'ignore' });
      for (const t of cand.types) for (const p of t.permissions || []) {
        if (!(base.types.find((x) => x.name === t.name)?.permissions || []).some((x) => x.name === p.name)) continue;
        for (const oid of uni.objs[t.name] || []) for (const user of uni.users) {
          const ar = { subject: { type: 'core/user', id: user }, relation: p.name, resource: { type: t.name, id: oid }, mode: 'fully_consistent', now };
          const x = await A.check({ ...ar, modelRevision: bc.revision }), y = await B.check({ ...ar, modelRevision: cc.revision });
          if (y.allowed && x.allowed === false) W.add(`${t.name}#${p.name}`);
        }
      }
    }
    run.append('cedar-analysis.jsonl', { candidate: k, universes: P.ci.cedar_analysis_universes, widening_keys: [...W] });
  }

  // ---------------------------------------------------------------- (3) rollback
  const T = (type, id, rel, uid) => ({ resource: { type, id }, relation: rel, subject: { type: 'core/user', id: uid } });
  const pairFiles = lFiles.slice(0, 4);
  const pairs = [];
  for (const u of probeUsers) for (const f of pairFiles) pairs.push({ kind: 'file_viewer', user: u, type: 'files/file', id: f.id, perm: 'read', tuple: T('files/file', f.id, 'viewer', u) });
  for (const u of probeUsers) { const tool = lTools[probeUsers.indexOf(u) % lTools.length]; pairs.push({ kind: 'tool_operator', user: u, type: 'proj/tool_instance', id: tool.id, perm: 'view', tuple: T('proj/tool_instance', tool.id, 'operator', u) }); }
  const pairsUsed = pairs.slice(0, P.rollback.pairs);
  const evalP = async (p, { token, pin } = {}) => {
    const body = { subject: { type: 'core/user', id: p.user, properties: { tid, principal_type: 'human', acr: 'L3' } }, action: { name: p.perm }, resource: { type: p.type, id: p.id, properties: { tid } }, context: { 'x-authz-profile': { profile_version: '1.0', ...(token ? { consistency: { token } } : {}), ...(pin ? { model: { pin } } : {}) } } };
    const r = await s.evaluate(body);
    const j = r.json();
    return { decision: j?.decision, reason: j?.context?.['x-authz-profile']?.reason, model_revision: j?.context?.['x-authz-profile']?.model_revision?.model_revision };
  };
  const setCurrent = (rev) => s.req(`${pdp}/v1/models/current`, { body: { model_revision: rev } });
  const sc = await setCurrent(modelInfo.v2.revision);
  const wr = await s.req(`${pdp}/v1/tenants/${tid}/relationships/write`, { body: { writes: pairsUsed.map((p) => p.tuple), on_duplicate: 'ignore' } });
  const tg = wr.json()?.consistency_token;
  const beforeRevoke = []; for (const p of pairsUsed) beforeRevoke.push(await evalP(p, { token: tg }));
  const dr = await s.req(`${pdp}/v1/tenants/${tid}/relationships/delete`, { body: { deletes: pairsUsed.map((p) => p.tuple), on_missing: 'ignore' } });
  const td = dr.json()?.consistency_token;
  const afterRevokeV2 = []; for (const p of pairsUsed) afterRevokeV2.push(await evalP(p, { token: td }));
  const tRb = monoMs();
  const rb = await setCurrent(modelInfo.v1.revision);
  const tRbAck = monoMs();
  let tEff = null;
  while (monoMs() - tRb < P.rollback.effective_timeout_ms) { const e = await evalP(pairsUsed[0]); if (e.model_revision === modelInfo.v1.revision) { tEff = monoMs(); break; } await sleep(P.rollback.effective_poll_ms); }
  const afterRollback = [];
  for (const p of pairsUsed) afterRollback.push({ with_token: await evalP(p, { token: td }), no_token: await evalP(p), pin_v1: await evalP(p, { pin: modelInfo.v1.revision }), pin_v2: await evalP(p, { pin: modelInfo.v2.revision }) });
  const svc = [];
  for (const p of pairsUsed.filter((x) => x.kind === 'file_viewer').slice(0, P.rollback.service_checks)) {
    const l = await s.login({ sub: p.user, tid, amr: 'pwd,otp' });
    svc.push({ user: p.user, file: p.id, login: l.ok, status: l.ok ? (await l.call('GET', `/t/${tid}/files/${p.id}`)).status : null });
  }
  run.writeJson('rollback.json', {
    set_current_v2_status: sc.status, grant_status: wr.status, revoke_status: dr.status, grant_token: tg, revoke_token: td, rollback_status: rb.status,
    rollback_ack_ms: +(tRbAck - tRb).toFixed(3), rollback_effective_ms: tEff ? +(tEff - tRb).toFixed(3) : null,
    pairs: pairsUsed.map((p, i) => ({ kind: p.kind, user: p.user, type: p.type, id: p.id, perm: p.perm, before_revoke_v2: beforeRevoke[i], after_revoke_v2: afterRevokeV2[i], after_rollback: afterRollback[i] })),
    service_checks: svc,
  });
} catch (e) {
  status = 'aborted:harness_error';
  run.writeJson('error.json', { message: e.message, stack: e.stack });
  console.error(e);
} finally {
  await s.stop();
}
run.finish(status);
console.log(JSON.stringify({ run_dir: run.dir, status }));
