// TC-016 txn・decision_id・trace_id による一貫リクエスト証跡の再構成（preregistered-test-plan.md §4.16）
//   node tests/engine-swap-perf-audit/TC-016.js
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { seededRng, opaqueId } from '../../lib/ids.js';
import { loadTopology, loadSecrets, clientTls } from '../../lib/topology.js';
import { AuditProducer } from '../../lib/audit.js';
import { verifyRun } from '../../audit/verify.js';
import { openRun, groupPortBase, writeEval, readJsonl, sleep } from './common.js';
import { refEvaluate, snapshotConsumer, diffConsumer, pick } from './lib/helpers.js';
import { makeCliCaller } from './lib/cli.js';

const TC = 'TC-016';
const { run, params } = openRun(TC, { seed: 16 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const rng = seededRng(`TC-016:${params.seed}`);
const MARKER = `bgmark${crypto.randomBytes(6).toString('hex')}`;
const COLLIDE = '4bf92f3577b34da6a3ce929d0e0e4736';
const hex = (n) => crypto.randomBytes(n).toString('hex');
let status = 'completed';
const evalOut = { tc: TC };
let s;

function traceHeaders(variant, ids) {
  switch (variant) {
    case 'V0': return { traceparent: `00-${hex(16)}-${hex(8)}-01` };
    case 'V1': return { traceparent: `00-${hex(16)}-${hex(8)}-00` };
    case 'V2': {
      const members = Array.from({ length: 32 }, (_, i) => `vendor${i}=${hex(4)}${i}`).join(',');
      return { traceparent: `00-${hex(16)}-${hex(8)}-01`, tracestate: members, baggage: `user.id=${ids.user},tenant.id=${ids.tid},file.id=${ids.file},marker=${MARKER}` };
    }
    case 'V3': return { traceparent: `00-${COLLIDE}-${hex(8)}-01` };
    default: throw new Error(variant);
  }
}

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, seed: params.dataset.seed, portBase: groupPortBase(TC) });
  log('stack up');
  // ---- setup: operators can read one input file of their tenant ----
  const tools = ds.tools;
  const toolInput = new Map();
  for (const t of tools) {
    const op = ds.tuples.find((x) => x.resource.type === 'proj/tool_instance' && x.resource.id === t.id && x.relation === 'operator').subject.id;
    const f = pick(rng, ds.files.filter((x) => x.tid === t.tid));
    const w = await s.writeTuples(t.tid, { writes: [{ resource: { type: 'files/file', id: f.id }, relation: 'viewer', subject: { type: 'core/user', id: op } }], on_duplicate: 'ignore' });
    if (w.status !== 200) throw new Error(`setup write ${w.status}`);
    toolInput.set(t.id, { op, file: f, tid: t.tid });
  }
  await sleep(300);
  // ---- request plan ----
  const plan = [];
  const P = params.traffic;
  for (let i = 0; i < P.tool_run_3hop; i++) { const t = tools[i % tools.length]; const ti = toolInput.get(t.id); plan.push({ kind: 'tool.run', tier: 'write', user: ti.op, tid: ti.tid, method: 'POST', path: `/t/${ti.tid}/tools/${t.id}/run`, body: { file_id: ti.file.id, with_labels: true }, file: ti.file.id, hops: 3 }); }
  for (let i = 0; i < P.file_write_1hop; i++) { const f = pick(rng, ds.files); plan.push({ kind: 'file.write', tier: 'write', user: f.owner, tid: f.tid, method: 'PUT', path: `/t/${f.tid}/files/${f.id}`, body: { content: `tc016 ${i}` }, file: f.id, hops: 1 }); }
  for (let i = 0; i < P.file_read_1hop; i++) { const f = pick(rng, ds.files); plan.push({ kind: 'file.read', tier: 'read-sensitive', user: f.owner, tid: f.tid, method: 'GET', path: `/t/${f.tid}/files/${f.id}`, file: f.id, hops: 1 }); }
  for (let i = 0; i < P.file_read_labels_2hop; i++) { const f = pick(rng, ds.files); plan.push({ kind: 'file.read+labels', tier: 'read-sensitive', user: f.owner, tid: f.tid, method: 'GET', path: `/t/${f.tid}/files/${f.id}?labels=1`, file: f.id, hops: 2 }); }
  // shuffle deterministically, assign variants
  for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
  plan.forEach((p, i) => { p.variant = ['V0', 'V1', 'V2', 'V3'][i % 4]; p.idx = i; });
  // pair templates: V0 vs V2 and V0 vs V3 for the same request
  const pairs = [];
  for (let k = 0; k < P.pair_templates; k++) {
    const base = plan[k * Math.floor(plan.length / P.pair_templates)];
    for (const v of ['V0', 'V2', 'V3']) pairs.push({ ...base, variant: v, pair: k, idx: `pair${k}-${v}`, body: base.kind === 'file.write' ? { content: `tc016 pair ${k}` } : base.body });
  }
  // expected allow (positive control) per the reference evaluator
  const refQ = [...plan, ...pairs].flatMap((p) => p.kind === 'tool.run' ? [{ user: p.user, type: 'proj/tool_instance', id: p.path.split('/')[4], permission: 'use' }] : [{ user: p.user, type: 'files/file', id: p.file, permission: p.kind === 'file.write' ? 'write' : 'read' }]);
  const allTuples = [...ds.tuples, ...[...toolInput.values()].map((ti) => ({ tid: ti.tid, resource: { type: 'files/file', id: ti.file.id }, relation: 'viewer', subject: { type: 'core/user', id: ti.op } }))];
  const refOut = refEvaluate({ tuples: allTuples, queries: refQ, now: new Date() });
  run.writeJson('plan.json', { marker_sha256: crypto.createHash('sha256').update(MARKER).digest('hex'), collide_trace_id: COLLIDE, plan, pairs, ref_expected_allow: refOut });
  // ---- sessions ----
  const clis = new Map();
  async function callerFor(user, tid) {
    const k = `${user}|${tid}`;
    if (!clis.has(k)) {
      const c = await s.loginCli({ sub: user, tid });
      if (!c.ok) throw new Error(`cli login failed ${k}`);
      clis.set(k, makeCliCaller(s, c));
    }
    return clis.get(k);
  }
  const results = [];
  async function send(p, phase) {
    const call = await callerFor(p.user, p.tid);
    const th = traceHeaders(p.variant, { user: p.user, tid: p.tid, file: p.file });
    const r = await call(p.method, p.path, p.body, th);
    const rec = { phase, idx: p.idx, pair: p.pair, kind: p.kind, tier: p.tier, variant: p.variant, status: r.status, ext_trace_id: th.traceparent.split('-')[1], edge_trace_id: r.headers['x-edge-trace-id'], decision_id: r.body?.decision_id, downstream_decision_id: r.body?.downstream_decision_id, label_decision_id: r.body?.label_decision_id, hops: p.hops };
    results.push(rec);
    run.append('requests.jsonl', rec);
    return rec;
  }
  for (const p of plan) await send(p, 'main');
  for (const p of pairs) await send(p, 'pairs');
  const posFail = results.filter((r) => r.status < 200 || r.status >= 300).length;
  log(`traffic done: ${results.length} requests, non-2xx ${posFail}`);
  if (posFail > params.abort['C-3_positive_control_max_failure_rate']) { const e = new Error(`positive control failures ${posFail}`); e.abort = 'C-3'; throw e; }
  // ---- (6) Txn-Token adapter swap ----
  const snapDir = path.join(run.dir, 'consumer-snapshot-before-swap');
  snapshotConsumer(snapDir);
  const sw = await s.req(`${s.topo.urls.sts}/admin/settings`, { body: { txnIdFormat: 'inhouse' } });
  run.append('inject.jsonl', { event: 'adapter_swap', status: sw.status, txnIdFormat: 'inhouse' });
  const swapPlan = plan.filter((p) => p.tier === 'write').slice(0, params.adapter_swap.writes_after_swap).map((p, i) => ({ ...p, variant: 'V0', idx: `swap${i}`, body: p.kind === 'file.write' ? { content: `swap ${i}` } : p.body }));
  for (const p of swapPlan) await send(p, 'swap');
  const swapDiff = diffConsumer(snapDir);
  await sleep(2500);
  // ---- pre-injection snapshot of the audit store (tamper tests run on copies of it) ----
  const snapAudit = path.join(run.dir, 'tamper', 'base');
  for (const d of ['audit', 'audit-copy', 'audit-producers']) fs.cpSync(path.join(run.dir, d), path.join(snapAudit, d), { recursive: true });
  // ---- (4) injections ----
  const topo = loadTopology(s.topoFile);
  const secrets = loadSecrets(topo);
  const rogue = new AuditProducer({ topo, secrets, workload: 'admin', tls: clientTls(topo, 'admin') });
  const journal0 = readJsonl(path.join(run.dir, 'audit', 'journal.jsonl'));
  const realE2 = journal0.filter((r) => r.family === 'enforcement' && r.tier === 'read-sensitive');
  const realE1 = journal0.filter((r) => r.family === 'decision' && r.event_type === 'authz.evaluation' && r.tier === 'read-sensitive');
  const injected = [];
  const fieldsOf = (r) => ({ family: r.family, event_type: r.event_type, tid: r.tid, tier: r.tier, outcome: r.outcome, reason_code: r.reason_code, subject: r.subject, actor: r.actor, resource: r.resource, action: r.action, corr: { ...r.corr }, detail: { ...r.detail } });
  for (let i = 0; i < params.injections.e2_missing_decision_id; i++) {
    const f = fieldsOf(realE2[i]); delete f.corr.decision_id;
    const out = await rogue.emit(f); injected.push({ kind: 'e2_missing_decision_id', event_id: out.record.event_id, mode: out.mode });
  }
  for (let i = 0; i < params.injections.e2_forged_decision_id_not_from_facade; i++) {
    const f = fieldsOf(realE2[3 + i]); f.corr.decision_id = opaqueId(); f.corr.request_id = opaqueId();
    const out = await rogue.emit(f); injected.push({ kind: 'e2_forged_decision_id', event_id: out.record.event_id, decision_id: f.corr.decision_id, mode: out.mode });
  }
  for (let i = 0; i < params.injections.e2_request_id_mismatch_on_real_decision; i++) {
    const f = fieldsOf(realE2[6 + i]); f.corr.request_id = opaqueId();
    const out = await rogue.emit(f); injected.push({ kind: 'e2_request_id_mismatch', event_id: out.record.event_id, decision_id: f.corr.decision_id, mode: out.mode });
  }
  for (let i = 0; i < params.injections.e1_facade_only_without_enforcement; i++) {
    const e1 = realE1[i];
    const p = plan.find((x) => x.tier === 'read-sensitive');
    const rid = opaqueId();
    const r = await s.req(`${s.topo.urls.pdp}/access/v1/evaluation`, { headers: { 'x-request-id': rid }, body: { subject: { type: 'core/user', id: p.user, properties: { tid: p.tid, principal_type: 'human', acr: 'L2', auth_time: Math.floor(Date.parse(e1.detail.auth_time) / 1000) } }, action: { name: 'read' }, resource: { type: 'files/file', id: p.file, properties: { tid: p.tid } }, context: { 'x-authz-profile': { profile_version: '1.0' }, 'x-authz-corr': { iss: e1.corr.iss, jti_ref: e1.corr.jti_ref, sid: e1.corr.sid, grant_ref: e1.corr.grant_ref } } } });
    injected.push({ kind: 'e1_facade_only', decision_id: r.json()?.context?.['x-authz-profile']?.decision_id, request_id: rid, status: r.status });
  }
  rogue.close();
  for (const x of injected) run.append('inject.jsonl', { event: 'audit_injection', ...x });
  await sleep(2500);
  await s.stop(); s = null;
  log('stack stopped; evaluating');

  // ================================================================================================
  // evaluation
  // ================================================================================================
  const J = readJsonl(path.join(run.dir, 'audit', 'journal.jsonl'));
  const invalid = readJsonl(path.join(run.dir, 'audit', 'journal-invalid.jsonl'));
  const copyOk = fs.existsSync(path.join(run.dir, 'audit-copy', 'journal.jsonl')) && fs.readFileSync(path.join(run.dir, 'audit-copy', 'journal.jsonl'), 'utf8') === fs.readFileSync(path.join(run.dir, 'audit', 'journal.jsonl'), 'utf8');
  if (!copyOk) { const e = new Error('independent copy missing or differs'); e.abort = 'C-6'; throw e; }
  const verify = verifyRun(run.dir);
  fs.writeFileSync(run.file('audit-verify.json'), JSON.stringify(verify, null, 2));
  // reconstruction and trace checks use the pre-injection snapshot (base); injection detection uses the final journal
  const J0 = readJsonl(path.join(snapAudit, 'audit', 'journal.jsonl'));
  const index = (JJ) => {
    const E1 = JJ.filter((r) => r.family === 'decision');
    const E2 = JJ.filter((r) => r.family === 'enforcement');
    const e1ById = new Map(E1.map((r) => [r.corr.decision_id, r]));
    const e2ByDid = new Map();
    for (const r of E2) { const k = r.corr.decision_id; e2ByDid.set(k, [...(e2ByDid.get(k) || []), r]); }
    return { E1, E2, e1ById, e2ByDid, ISS: JJ.filter((r) => r.family === 'issuance') };
  };
  const base = index(J0), fin = index(J);
  const { E1, E2, e1ById, e2ByDid, ISS } = base;
  const stsIss = new Map(ISS.filter((r) => r.detail.ledger === 'sts').map((r) => [r.corr.jti_ref, r]));
  const ttsIss = new Map(ISS.filter((r) => r.detail.ledger === 'tts').map((r) => [r.corr.txn, r]));
  const lineage = (ref) => { const chain = []; let cur = ref; for (let i = 0; i < 10 && cur; i++) { const rec = stsIss.get(cur); if (!rec) return { chain, complete: false }; chain.push(cur); const inp = rec.detail.input_token; if (!inp || !stsIss.has(inp.jti_ref)) return { chain, complete: true, root: cur }; cur = inp.jti_ref; } return { chain, complete: false }; };
  // per-hop record check: E1 and E2 joined by decision_id and request_id, lineage complete
  const hopOk = (did) => {
    const d = e1ById.get(did);
    const es = e2ByDid.get(did) || [];
    if (!d || es.length !== 1) return { ok: false, why: !d ? 'no_e1' : `e2_count_${es.length}` };
    if (es[0].corr.request_id !== d.corr.request_id) return { ok: false, why: 'request_id_mismatch' };
    const l = lineage(d.corr.jti_ref);
    if (!l.complete) return { ok: false, why: 'lineage' };
    return { ok: true, d, e: es[0], l };
  };
  const e2ByTrace = new Map(E2.map((r) => [r.corr.trace_id, r]));
  const recon = [];
  for (const r of results) {
    let dids = [r.decision_id, r.downstream_decision_id, r.label_decision_id].filter(Boolean);
    if (r.kind === 'file.write') { const e = e2ByTrace.get(r.edge_trace_id); dids = e ? [e.corr.decision_id] : []; }
    const hops = dids.map(hopOk);
    let ok = hops.length === r.hops && hops.every((h) => h.ok);
    const out = { idx: r.idx, phase: r.phase, kind: r.kind, tier: r.tier, variant: r.variant, hops_found: hops.length, hops_expected: r.hops, why: hops.filter((h) => !h.ok).map((h) => h.why) };
    if (ok && r.tier === 'write') {
      // txn: one txn across all hops, issued by the TTS, every hop's lineage reaches the TTS root, tid consistent
      const txns = new Set(hops.flatMap((h) => [h.d.corr.txn, h.e.corr.txn]));
      const txn = [...txns][0];
      const iss = ttsIss.get(txn);
      ok = txns.size === 1 && !!txn && !!iss && hops.every((h) => h.l.chain.includes(iss.detail.root_jti_ref) && h.d.tid === iss.tid && h.e.tid === iss.tid);
      out.txn = txn; out.txn_format = txn ? (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(txn) ? 'inhouse' : 'opaque') : null; out.tts_issued = !!iss;
    }
    if (ok && r.kind === 'file.read+labels') {
      // B -> C: the label hop's token was exchanged from the file hop's token
      ok = hops[1].l.chain.includes(hops[0].d.corr.jti_ref);
    }
    out.reconstructed = ok;
    recon.push(out);
  }
  const rate = (f) => { const xs = recon.filter(f); return { n: xs.length, ok: xs.filter((x) => x.reconstructed).length, rate: xs.length ? xs.filter((x) => x.reconstructed).length / xs.length : null }; };
  // trace forgery: record content diffs for pairs
  const norm = (rec) => { const { event_id, event_time, observed_time, received_time, integrity, record_stage, ...rest } = rec; const corr = { ...rest.corr }; for (const k of ['trace_id', 'request_id', 'decision_id', 'jti_ref', 'txn']) delete corr[k]; return JSON.stringify({ ...rest, corr }); };
  const recsOf = (r) => { let dids = [r.decision_id, r.downstream_decision_id, r.label_decision_id].filter(Boolean); if (r.kind === 'file.write') { const e = e2ByTrace.get(r.edge_trace_id); dids = e ? [e.corr.decision_id] : []; } return dids.flatMap((d) => [e1ById.get(d), ...(e2ByDid.get(d) || [])]).filter(Boolean).map(norm); };
  const pairDiffs = [];
  for (let k = 0; k < P.pair_templates; k++) {
    const g = results.filter((r) => r.phase === 'pairs' && r.pair === k);
    const base = recsOf(g.find((r) => r.variant === 'V0'));
    for (const v of ['V2', 'V3']) { const o = recsOf(g.find((r) => r.variant === v)); if (JSON.stringify(o) !== JSON.stringify(base)) pairDiffs.push({ pair: k, variant: v, base_records: base.length, other_records: o.length }); }
  }
  // record presence must not depend on sampled flag / trace state: every request has its records
  const byVariant = Object.fromEntries(['V0', 'V1', 'V2', 'V3'].map((v) => [v, rate((x) => x.variant === v)]));
  // identifiers in trace / baggage
  const ids = new Set([...ds.users.map((u) => u.id), ...ds.tenants.map((t) => t.id), ...ds.files.map((f) => f.id)]);
  const internalTraceIds = [...new Set([...E1, ...E2].map((r) => r.corr.trace_id).filter(Boolean))];
  const traceWithIds = internalTraceIds.filter((t) => [...ids].some((i) => t.includes(i))).length;
  const extIds = new Set(results.map((r) => r.ext_trace_id));
  const extLeak = internalTraceIds.filter((t) => extIds.has(t)).length; // external trace ids must never be used internally (re-numbered)
  // the baggage marker (with identifiers) must not appear in any component-written file
  let markerHits = 0; const markerFiles = [];
  const scan = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!['consumer-snapshot-before-swap', 'tamper'].includes(e.name)) scan(p); } else if (!['requests.jsonl', 'plan.json', 'progress.jsonl', 'inject.jsonl'].includes(e.name)) { const t = fs.readFileSync(p, 'latin1'); if (t.includes(MARKER)) { markerHits++; markerFiles.push(path.relative(run.dir, p)); } } } };
  scan(run.dir);
  const v3Internal = new Set(results.filter((r) => r.variant === 'V3').map((r) => r.edge_trace_id));
  // injection detection (bidirectional E1/E2 matching + quarantine)
  const flagged = new Map();
  const flag = (eid, why) => flagged.set(eid, [...(flagged.get(eid) || []), why]);
  {
  const { E1, E2, e1ById, e2ByDid } = fin;
  for (const r of E2) {
    if (!r.corr.decision_id) { flag(r.event_id, 'e2_missing_decision_id'); continue; }
    const d = e1ById.get(r.corr.decision_id);
    if (!d) flag(r.event_id, 'e2_without_e1');
    else if (d.corr.request_id !== r.corr.request_id) flag(r.event_id, 'request_id_mismatch');
    if ((e2ByDid.get(r.corr.decision_id) || []).length > 1) flag(r.event_id, 'duplicate_enforcement');
  }
  for (const d of E1) if (d.event_type === 'authz.evaluation' && !e2ByDid.has(d.corr.decision_id)) flag(`E1:${d.corr.decision_id}`, 'e1_without_e2');
  }
  for (const b of invalid) { flag(b.rec?.event_id, `quarantined:${b.reason}`); if (b.rec?.family === 'decision') flag(`E1:${b.rec.corr?.decision_id}`, `quarantined:${b.reason}`); }
  const det = injected.map((x) => {
    const keys = x.kind === 'e1_facade_only' ? [`E1:${x.decision_id}`] : [x.event_id];
    const why = keys.flatMap((k) => flagged.get(k) || []);
    return { ...x, detected: why.length > 0, by: why };
  });
  const injectedKeys = new Set(det.flatMap((x) => (x.kind === 'e1_facade_only' ? [`E1:${x.decision_id}`] : [x.event_id])));
  // a genuine E2 that shares a decision_id with a forged one is flagged as duplicate_enforcement: count separately
  const falsePos = [...flagged.entries()].filter(([k]) => !injectedKeys.has(k)).map(([k, w]) => ({ key: k, why: w }));
  const fpExplained = falsePos.filter((f) => f.why.every((w) => w === 'duplicate_enforcement'));
  // (5) tamper tests on copies of the pre-injection snapshot
  const baseVerify = verifyRun(snapAudit);
  const tamper = [];
  const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  for (const variant of ['journal_only', 'journal_and_copy']) {
    for (const kind of ['modify_one_record', 'delete_one_record', 'truncate_tail']) {
      const dir = path.join(run.dir, 'tamper', `${variant}-${kind}`);
      fs.cpSync(snapAudit, dir, { recursive: true });
      const jf = path.join(dir, 'audit', 'journal.jsonl');
      let L = lines(jf);
      let target;
      if (kind === 'modify_one_record') {
        const i = L.findIndex((l, k) => k > L.length / 3 && JSON.parse(l).family === 'decision' && JSON.parse(l).detail.decision === false);
        const idx = i >= 0 ? i : Math.floor(L.length / 2);
        const r = JSON.parse(L[idx]);
        if (r.detail && 'decision' in r.detail) { r.detail.decision = !r.detail.decision; r.detail.reason = r.detail.decision ? 'allow' : 'deny_no_relation'; r.reason_code = r.detail.reason; } else r.outcome = r.outcome === 'success' ? 'failure' : 'success';
        L[idx] = JSON.stringify(r); target = { line: idx + 1, event_id: r.event_id };
      } else if (kind === 'delete_one_record') {
        const idx = Math.floor(L.length / 2); target = { line: idx + 1, event_id: JSON.parse(L[idx]).event_id }; L.splice(idx, 1);
      } else { target = { removed_lines: 3, from_line: L.length - 2 }; L = L.slice(0, -3); }
      fs.writeFileSync(jf, L.join('\n') + '\n');
      if (variant === 'journal_and_copy') fs.writeFileSync(path.join(dir, 'audit-copy', 'journal.jsonl'), L.join('\n') + '\n');
      const v = verifyRun(dir);
      const checks = [...new Set(v.summary.findings.map((f) => f.check))];
      tamper.push({ variant, kind, target, detected: !v.summary.ok && checks.some((c) => ['C1', 'C2', 'C3'].includes(c)), checks, findings: v.summary.findings.slice(0, 6) });
    }
  }
  const tamperRate = tamper.filter((t) => t.detected).length / tamper.length;
  const main = (f) => rate((x) => x.phase !== 'swap' && f(x));
  const crit = {
    reconstruction_rate_write_txn: main((x) => x.tier === 'write'),
    reconstruction_rate_read_sensitive_triple: main((x) => x.tier === 'read-sensitive'),
    forged_trace_record_diffs: { value: pairDiffs.length, pass: pairDiffs.length === 0 },
    injected_gap_and_forgery_detection_rate: { value: det.filter((x) => x.detected).length / det.length, pass: det.every((x) => x.detected) },
    tamper_detection_rate: { value: tamperRate, pass: tamperRate === 1 && baseVerify.summary.ok, base_snapshot_ok: baseVerify.summary.ok },
    identifiers_in_trace_or_baggage: { value: traceWithIds + markerHits + extLeak, pass: traceWithIds + markerHits + extLeak === 0, detail: { internal_trace_ids_containing_ids: traceWithIds, baggage_marker_hits: markerHits, marker_files: markerFiles, external_trace_ids_used_internally: extLeak } },
    adapter_swap_consumer_diff_lines: { value: swapDiff.lines, pass: swapDiff.lines === 0, reconstruction_after_swap: rate((x) => x.phase === 'swap'), txn_formats_after_swap: recon.filter((x) => x.phase === 'swap').map((x) => x.txn_format) },
  };
  crit.reconstruction_rate_write_txn.pass = crit.reconstruction_rate_write_txn.rate === 1;
  crit.reconstruction_rate_read_sensitive_triple.pass = crit.reconstruction_rate_read_sensitive_triple.rate === 1;
  crit.adapter_swap_consumer_diff_lines.pass = crit.adapter_swap_consumer_diff_lines.pass && crit.adapter_swap_consumer_diff_lines.reconstruction_after_swap.rate === 1 && crit.adapter_swap_consumer_diff_lines.txn_formats_after_swap.every((f) => f === 'inhouse');
  const verdict = Object.values(crit).every((c) => c.pass) ? '合格' : '不合格';
  Object.assign(evalOut, {
    verdict, criteria: crit,
    measures: {
      requests: results.length, by_variant_reconstruction: byVariant, v3_distinct_internal_trace_ids: v3Internal.size, v3_requests: results.filter((r) => r.variant === 'V3').length,
      journal_records: J.length, journal_records_pre_injection: J0.length, quarantined_records: invalid.length, verify_summary_final: verify.summary, injections: det, false_positive_flags: falsePos.length, false_positive_explained_as_duplicate_of_forged_e2: fpExplained.length,
      tamper,
    },
    reconstruction: recon,
    pair_diffs: pairDiffs,
    notes: ['sampler: PoC の部品は OpenTelemetry の sampler を持たない。sampled=00 の外部 traceparent（V1）で sampler DROP を模した（監査記録の有無が trace の sampling に依存しない構造であることの確認）'],
  });
  writeEval(run, evalOut, ['requests.jsonl', 'plan.json', 'inject.jsonl', 'audit/journal.jsonl', 'audit-copy/journal.jsonl', 'audit-verify.json']);
  log(`verdict ${verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.rate ?? v.value]))));
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
