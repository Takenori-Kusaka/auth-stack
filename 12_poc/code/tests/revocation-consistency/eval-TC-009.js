// TC-009 evaluator (frozen with the TC; §2.6). Rules: params/TC-009.json wrong_allow_rules / duplicate_rule.
//   node tests/revocation-consistency/eval-TC-009.js [--manifest-version N]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from '../../lib/topology.js';
import { args } from '../../lib/runtime.js';
import { loadParams, latestManifest, summary, GROUP } from './common.js';

const a = args();
const P = loadParams('TC-009');
const ver = Number(a['manifest-version'] || latestManifest('TC-009')?.ver);
const man = JSON.parse(fs.readFileSync(path.join(DATA_DIR, GROUP, '_freeze', `manifest-TC-009-v${ver}.json`), 'utf8'));
const tcDir = path.join(DATA_DIR, GROUP, 'TC-009');
const L = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const OK = { create: 201, move: 200, delete: 204, share: 200 };
const crashFault = (f) => f.startsWith('crash_');

const results = [];
for (const d of (fs.existsSync(tcDir) ? fs.readdirSync(tcDir) : []).sort()) {
  const dir = path.join(tcDir, d);
  if (!fs.existsSync(path.join(dir, 'run.json'))) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
  if (meta.frozen_manifest?.version !== ver) continue;
  if (!meta.status?.startsWith('completed')) { results.push({ run: d, config: meta.engine_config?.id, status: meta.status, evaluated: false }); continue; }
  const ops = L(path.join(dir, 'ops.jsonl'));
  const reqs = L(path.join(dir, 'requests.jsonl'));
  const writes = L(path.join(dir, 'pdp', 'writes.jsonl'));
  const byIter = new Map();
  for (const r of reqs) { if (!byIter.has(r.iter)) byIter.set(r.iter, []); byIter.get(r.iter).push(r); }
  const rows = [];
  for (const o of ops) {
    const pr = byIter.get(o.iter) || [];
    const allows = (role, pred = () => true) => pr.filter((r) => r.role === role && r.status === 200 && pred(r));
    let wrong = [];
    let entitledFirstAllow = null;
    if (o.op === 'create') {
      wrong = allows('non_entitled_Y');
      const x = allows('entitled_X');
      entitledFirstAllow = x.length ? Math.min(...x.map((r) => r.sent_ms)) - o.t_ack_ms : null;
    } else if (o.op === 'move' && o.final) {
      if (o.final.folder === o.dst) wrong = allows('v_src', (r) => r.sent_ms > o.t_ack_ms);
      else if (o.final.folder === o.src) wrong = allows('v_dst', (r) => r.sent_ms > o.t_send_ms);
      const x = allows('v_dst', (r) => r.sent_ms > o.t_send_ms);
      entitledFirstAllow = o.final.folder === o.dst && x.length ? Math.min(...x.map((r) => r.sent_ms)) - o.t_ack_ms : null;
    } else if (o.op === 'delete') {
      if (!o.final && o.t_ack_ms) wrong = pr.filter((r) => r.status === 200 && r.sent_ms > o.t_ack_ms);
    } else if (o.op === 'share') {
      const committed = o.outbox.some((x) => x.file_id === o.target && x.payload_kind.startsWith('writes'));
      wrong = committed ? allows('grantee', (r) => r.sent_ms < o.t_send_ms) : allows('grantee');
      const x = allows('grantee', (r) => r.sent_ms > o.t_send_ms);
      entitledFirstAllow = committed && x.length ? Math.min(...x.map((r) => r.sent_ms)) - o.t_ack_ms : null;
    }
    const success = o.op_status === OK[o.op];
    let control;
    if (crashFault(o.fault)) control = !!o.restart || (o.op === 'delete' && o.op_status === 204);
    else control = success && (o.op === 'delete' || entitledFirstAllow !== null);
    rows.push({ iter: o.iter, op: o.op, fault: o.fault, rep: o.rep, op_status: o.op_status, control, wrong_allows: wrong.length, entitled_first_allow_ms: entitledFirstAllow === null ? null : +entitledFirstAllow.toFixed(3), probes: pr.length, final_folder: o.final?.folder ?? null, k4_repair: o.k4_repair || null });
  }
  // duplicate application: one façade write per outbox idempotency key
  const perKey = new Map();
  for (const w of writes) if (w.idempotency_key) perKey.set(w.idempotency_key, (perKey.get(w.idempotency_key) || 0) + 1);
  const duplicates = [...perKey].filter(([, n]) => n > 1).map(([k, n]) => ({ idempotency_key: k, applied: n }));
  const controlFail = rows.filter((r) => !r.control).length;
  const c3 = rows.length ? controlFail / rows.length > P.c3_max_control_failure_ratio : false;
  const byFault = {};
  for (const r of rows) {
    const k = `${r.op}/${r.fault}`;
    const b = (byFault[k] ||= { iterations: 0, wrong_allows: 0, control_failures: 0, entitled_first_allow_ms: [] });
    b.iterations++; b.wrong_allows += r.wrong_allows; b.control_failures += r.control ? 0 : 1;
    if (r.entitled_first_allow_ms !== null) b.entitled_first_allow_ms.push(r.entitled_first_allow_ms);
  }
  for (const b of Object.values(byFault)) b.entitled_first_allow_ms = summary(b.entitled_first_allow_ms);
  const ev = {
    tc: 'TC-009', engine_config: meta.engine_config, run: d, manifest_version: ver, manifest_sha256: man.manifest_sha256, evaluated_at: new Date().toISOString(),
    control: { failures: controlFail, iterations: rows.length, c3_abort: c3 },
    metrics: { wrong_allows_one_sided: rows.reduce((n, r) => n + r.wrong_allows, 0), duplicate_applications: duplicates.length, duplicates, outbox_keys: perKey.size, k4_repairs: rows.filter((r) => r.k4_repair).length, by_op_fault: byFault },
  };
  ev.verdict = { wrong_allow_0: ev.metrics.wrong_allows_one_sided === 0, duplicate_0: ev.metrics.duplicate_applications === 0 };
  ev.result = c3 ? 'aborted:C-3' : Object.values(ev.verdict).every(Boolean) ? 'pass' : 'fail';
  ev.inputs = Object.fromEntries(['ops.jsonl', 'requests.jsonl', 'pdp/writes.jsonl', 'run.json'].filter((f) => fs.existsSync(path.join(dir, f))).map((f) => [f, sha(path.join(dir, f))]));
  fs.writeFileSync(path.join(dir, 'eval.json'), JSON.stringify(ev, null, 2));
  fs.writeFileSync(path.join(dir, 'ops-eval.csv'), ['iter,op,fault,rep,op_status,control,wrong_allows,entitled_first_allow_ms,probes,final_folder,k4_repair', ...rows.map((r) => Object.values(r).map((v) => (v === null ? '' : String(v).includes(',') ? `"${v}"` : v)).join(','))].join('\n') + '\n');
  results.push({ run: d, config: meta.engine_config.id, status: meta.status, evaluated: true, result: ev.result, verdict: ev.verdict, control: ev.control, metrics: { wrong_allows_one_sided: ev.metrics.wrong_allows_one_sided, duplicate_applications: ev.metrics.duplicate_applications, k4_repairs: ev.metrics.k4_repairs } });
}
const ev = results.filter((r) => r.evaluated);
const missing = P.engine_configs.map((c) => c.id).filter((c) => !ev.some((r) => r.config === c));
const overall = missing.length ? 'incomplete' : ev.some((r) => r.result === 'aborted:C-3') ? 'aborted:C-3' : ev.every((r) => r.result === 'pass') ? 'pass' : 'fail';
fs.writeFileSync(path.join(tcDir, `eval-summary-v${ver}.json`), JSON.stringify({ tc: 'TC-009', manifest_version: ver, manifest_sha256: man.manifest_sha256, overall, missing_configs: missing, runs: results }, null, 2));
console.log(JSON.stringify({ overall, runs: results }, null, 2));
