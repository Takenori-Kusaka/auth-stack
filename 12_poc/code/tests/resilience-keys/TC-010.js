// TC-010 PDP 障害・評価不能・誤応答での縮退 (test plan §4.10; fail-mode-matrix §5, §6.1, §6.2, §6.13, §8).
//   node tests/resilience-keys/TC-010.js --freeze                 write / refresh the freeze manifest (no measurement)
//   node tests/resilience-keys/TC-010.js --engine openfga|cedar   one measurement run (stack started and stopped here)
//   node tests/resilience-keys/TC-010.js --eval <run-dir>         re-run the evaluator on stored raw data only
// Port block: TC-010 = 42200..42219 (config/ports.js). Parameters: params/TC-010.json (read before any measurement).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStack } from '../../harness/stack.js';
import { request } from '../../lib/http.js';
import { generate } from '../../data/gen-synthetic.js';
import { syntheticId, seededRng } from '../../lib/ids.js';
import { args } from '../../lib/runtime.js';
import { openRun, freeze, loadParams, sleep, tcpClientsTo, recorder, readJsonl, writeEval, GROUP } from './common.js';
import { Run } from '../../harness/run.js';

const TC = 'TC-010';
const SELF = fileURLToPath(import.meta.url);
const a = args();

// ------------------------------------------------------------------------------------------------
// dataset: synthetic smoke profile + probe users written by the test (all ids "syn" prefixed, DEC-4 / C-1)
// ------------------------------------------------------------------------------------------------
function buildDataset(seed) {
  const ds = generate({ seed, profile: 'smoke' });
  const L = ds.tenants.find((t) => t.size === 'L') || ds.tenants[0];
  const tid = L.id;
  const rng = seededRng(`rk-tc010:${seed}`);
  const add = (memberships) => { const id = syntheticId(rng); ds.users.push({ id, status: 'active', memberships, probe: true }); return id; };
  const member = (id) => ds.tuples.push({ tid, resource: { type: 'core/tenant', id: tid }, relation: 'member', subject: { type: 'core/user', id } });
  const uNo = add([{ tid, kind: 'member', status: 'active' }]); member(uNo);
  const uKaA = add([{ tid, kind: 'member', status: 'active' }]); member(uKaA);
  const uKaD = add([{ tid, kind: 'member', status: 'active' }]); member(uKaD);
  const grant = ds.externalGrants.find((g) => g.tid === tid && !g.expired);
  const gFolder = grant.target.id;
  const gFile = ds.files.find((f) => f.folder === gFolder);
  const f = ds.files.find((x) => x.tid === tid && x.folder !== gFolder && x.id !== gFile.id);
  const fKa = ds.files.find((x) => x.tid === tid && x.id !== f.id && x.folder !== gFolder);
  ds.tuples.push({ tid, resource: { type: 'files/file', id: fKa.id }, relation: 'viewer', subject: { type: 'core/user', id: uKaA } });
  // restricted_external on the guest's folder: the guest is excluded by `read = viewers - parent->restricted_inherited`
  ds.tuples.push({ tid, resource: { type: 'files/folder', id: gFolder }, relation: 'restricted_external', subject: { type: 'core/tenant', id: tid, relation: 'external_member' } });
  const tool = ds.tools.find((t) => t.tid === tid);
  const project = ds.projects.find((p) => p.id === tool.project);
  const roles = { tid, uOwner: f.owner, uNo, uAdmin: project.owner, uGuest: grant.grantee, uKaA, uKaD, file: f, folder: f.folder, tool: tool.id, guestFile: gFile.id, kaFile: fKa.id };
  return { ds, roles };
}

function knownAnswer(roles, intervalMs) {
  const subj = (id) => ({ type: 'core/user', id, properties: { tid: roles.tid, principal_type: 'human', acr: 'L2' } });
  const res = { type: 'files/file', id: roles.kaFile, properties: { tid: roles.tid } };
  return { intervalMs, allow: { subject: subj(roles.uKaA), action: { name: 'read' }, resource: res }, deny: { subject: subj(roles.uKaD), action: { name: 'read' }, resource: res } };
}

// ------------------------------------------------------------------------------------------------
// measurement
// ------------------------------------------------------------------------------------------------
async function measure(engine, { prefreeze = false, only = null, ref = false } = {}) {
  // --prefreeze: harness wiring check only (§2.5): data under _prefreeze/, evaluator NOT executed
  const { run, params } = prefreeze
    ? { run: new Run({ tc: `${GROUP}/${TC}`, frozen: false, seed: params0().seed, purpose: `prefreeze-harness-check-${engine}` }), params: params0() }
    : openRun(TC, { seed: params0().seed, purpose: ref ? `reference-after-fix-${engine}` : `measurement-${engine}`, paramsName: ref ? 'TC-010.ref' : undefined });
  const P = params;
  const rec = recorder(run, 'requests.jsonl');
  const win = recorder(run, 'windows.jsonl');
  const inj = recorder(run, 'inject.jsonl');
  const health = recorder(run, 'health.jsonl');
  const ns = recorder(run, 'netstat.jsonl');
  const { ds, roles } = buildDataset(P.seed);
  run.writeJson('roles.json', { ...roles, file: roles.file.id, engine });
  const kaEnv = JSON.stringify(knownAnswer(roles, P.timing.known_answer_probe_interval_ms));
  const pepEnv = { PEP_KNOWN_ANSWER: kaEnv, PEP_PDP_TIMEOUT_MS: String(P.timing.D_t_pep_pdp_timeout_ms) };
  let s;
  let status = 'completed';
  let abort = null;
  try {
    s = await startStack({
      tc: TC, run, engine, dataset: ds, seed: P.seed, settings: P.settings,
      injectPep: true, injectEngine: engine === 'openfga', faultAdmin: true,
      env: { 'file-service': { ...pepEnv }, 'tool-service': { ...pepEnv }, 'label-service': { ...pepEnv }, pdp: { PDP_ENGINE_TIMEOUT_MS: String(P.timing.facade_engine_timeout_ms) } },
    });
    const T = s.topo;
    const tid = roles.tid;
    // ---- sessions (BFF, cert-bound) ----
    const login = async (sub, amr) => { const u = await s.login({ sub, tid, amr }); if (!u.ok) throw new Error(`login failed for ${sub}: ${u.status}`); return u; };
    const uOwner = await login(roles.uOwner, 'pwd,hwk');
    const uNo = await login(roles.uNo, 'pwd,hwk');
    const uAdmin = await login(roles.uAdmin, 'pwd,hwk');
    const uGuest = await login(roles.uGuest, 'pwd,otp');
    const su = await uOwner.call('POST', `/t/${tid}/files/${roles.file.id}/url`, {});
    if (su.status !== 200) throw Object.assign(new Error(`signed url setup failed ${su.status}`), { abort: 'C-3' });
    const dlPath = su.body.url;
    let seq = 0;
    const OPS = {
      'pub.download': () => request(`${T.urls.edge}${dlPath}`, { tls: s.tls, timeoutMs: 15000 }),
      'rs.file.read.owner': () => uOwner.call('GET', `/t/${tid}/files/${roles.file.id}`),
      'rs.file.read.none': () => uNo.call('GET', `/t/${tid}/files/${roles.file.id}`),
      'rs.folder.list.owner': () => uOwner.call('GET', `/t/${tid}/folders/${roles.folder}/files`),
      'rs.file.search.owner': () => uOwner.call('GET', `/t/${tid}/files?limit=50`),
      'rs.tool.view.admin': () => uAdmin.call('GET', `/t/${tid}/tools/${roles.tool}`),
      'rs.tool.view.none': () => uNo.call('GET', `/t/${tid}/tools/${roles.tool}`),
      'w.file.write.owner': () => uOwner.call('PUT', `/t/${tid}/files/${roles.file.id}`, { content: `rk-tc010 owner ${++seq}` }),
      'w.file.write.none': () => uNo.call('PUT', `/t/${tid}/files/${roles.file.id}`, { content: `rk-tc010 none ${++seq}` }),
      'pT.tool.config.admin': () => uAdmin.call('PUT', `/t/${tid}/tools/${roles.tool}/config`, { config: { rk: ++seq } }),
      'pT.tool.config.none': () => uNo.call('PUT', `/t/${tid}/tools/${roles.tool}/config`, { config: { rk: ++seq } }),
      'rs.file.read.restricted_guest': () => uGuest.call('GET', `/t/${tid}/files/${roles.guestFile}`),
    };
    const opMeta = Object.fromEntries(P.operations.map((o) => [o.id, o]));
    const one = async (w, batch, op, rep) => {
      const sent = Date.now();
      let r, err;
      try { r = await OPS[op](); } catch (e) { err = e.code || e.message; }
      const body = r ? (typeof r.body === 'object' ? r.body : (typeof r.json === 'function' ? r.json() : undefined)) : undefined;
      const items = body && Array.isArray(body.items) ? body.items.length : undefined;
      rec({ window: w.id, class: w.class, batch, op, rep, tier: opMeta[op].tier, expected_normal: opMeta[op].expected_normal, list: !!opMeta[op].list, sent_at: new Date(sent).toISOString(), ms: Date.now() - sent, status: r ? r.status : 0, items, err, retry_after: r?.headers?.['retry-after'] });
      return r ? r.status : 0;
    };
    const batch = async (w, name) => { for (let i = 0; i < P.repetitions_per_request; i++) await Promise.all(Object.keys(OPS).map((op) => one(w, name, op, i))); };
    // ---- health of non-target components (C-5) ----
    const healthCheck = async (w, phase, withFacade) => {
      const probes = {
        'state-store': () => s.req(`${T.urls.state}/healthz`, { timeoutMs: 2000 }),
        sts: () => s.req(`${T.urls.sts}/jwks`, { timeoutMs: 2000 }),
        'as-a': () => s.req(`${T.urls.asA}/.well-known/openid-configuration`, { timeoutMs: 2000 }),
        ...(withFacade ? { pdp: () => s.req(`${T.urls.pdp}/healthz`, { timeoutMs: 2000 }) } : {}),
      };
      const out = {};
      for (const [k, f] of Object.entries(probes)) { try { out[k] = (await f()).status; } catch (e) { out[k] = `err:${e.code || e.message}`; } }
      health({ window: w.id, phase, ...out });
      return Object.entries(out).filter(([, v]) => v !== 200).map(([k]) => k);
    };
    // ---- netstat sampler (bypass to the authorization store) ----
    let sampling = null;
    const startSampler = (w) => {
      if (engine !== 'openfga') return;
      const allowed = new Set([s.procs.procs.get('inj-engine')?.child.pid].filter(Boolean));
      let stop = false;
      const loop = (async () => {
        while (!stop) {
          const r = await tcpClientsTo(T.ports.openfgaHttp);
          const others = r.rows.filter((x) => !allowed.has(x.pid));
          const pidNames = Object.fromEntries([...s.procs.procs.values()].map((p) => [p.child.pid, p.name]));
          ns({ window: w.id, ok: r.ok, rows: r.rows.length, allowed_pids: [...allowed], other_owner_rows: others.map((x) => ({ ...x, name: pidNames[x.pid] || (x.pid === process.pid ? 'harness' : 'unknown') })) });
          await sleep(P.timing.netstat_sample_interval_ms);
        }
      })();
      sampling = async () => { stop = true; await loop; };
    };
    // ---- fault application ----
    const injLogLines = (name) => readJsonl(path.join(run.dir, 'inject', `${name}.jsonl`)).length;
    const proxyFault = async (name, cfg) => {
      const before = injLogLines(name);
      s.inject(name, cfg);
      const t0 = Date.now();
      while (injLogLines(name) <= before && Date.now() - t0 < 3000) await sleep(10);
      return injLogLines(name) > before;
    };
    const FAULTS = {
      W1: { on: () => proxyFault('inj-pep', { mode: /delay_each/.test(P.windows_openfga.find((x) => x.id === 'W1').fault) ? 'delay_each' : 'delay', ms: P.timing.injected_delay_ms }), off: () => proxyFault('inj-pep', { mode: 'pass' }) },
      W2: { on: () => proxyFault('inj-pep', { mode: 'blackhole' }), off: () => proxyFault('inj-pep', { mode: 'pass' }) },
      W3: { on: () => proxyFault('inj-pep', { mode: 'reset' }), off: () => proxyFault('inj-pep', { mode: 'pass' }) },
      W4: { on: async () => { await s.kill('pdp'); return true; }, off: async () => { await s.start('pdp'); return true; }, target: 'pdp' },
      W5: { on: () => proxyFault('inj-engine', { mode: 'delay', ms: P.timing.injected_delay_ms }), off: () => proxyFault('inj-engine', { mode: 'pass' }), facade: true },
      W6: { on: () => proxyFault('inj-engine', { mode: 'blackhole' }), off: () => proxyFault('inj-engine', { mode: 'pass' }), facade: true },
      W7: { on: () => proxyFault('inj-engine', { mode: 'status', status: 500 }), off: () => proxyFault('inj-engine', { mode: 'pass' }), facade: true },
      W8: { on: async () => { await s.kill('openfga'); return true; }, off: async () => { await s.start('openfga'); return true; }, facade: true, target: 'openfga' },
      W9: { on: () => proxyFault('inj-engine', { mode: 'status', status: 400 }), off: () => proxyFault('inj-engine', { mode: 'pass' }), facade: true },
      W10: { on: async () => (await s.facadeFault({ mode: 'allow_all' })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      W11: { on: async () => (await s.facadeFault({ mode: 'deny_all' })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      W12: { on: async () => (await s.facadeFault({ mode: 'stale_revision' })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      W13: { on: () => proxyFault('inj-engine', { mode: 'allow_all' }), off: () => proxyFault('inj-engine', { mode: 'pass' }), facade: true },
      W14: { on: () => proxyFault('inj-engine', { mode: 'deny_all' }), off: () => proxyFault('inj-engine', { mode: 'pass' }), facade: true },
      W15: { on: async () => (await s.facadeFault({ mode: 'drop_decision_id' })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      W16: { on: async () => (await s.facadeFault({ mode: 'wrong_request_id' })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      W17: { on: async () => (await s.facadeFault({ mode: 'unavailable' })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      C1: { on: async () => (await s.facadeFault({ mode: 'none', cedar: { dropAttr: 'ttu_parent__restricted_inherited' } })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      C2: { on: async () => (await s.facadeFault({ mode: 'none', cedar: { dropEntityPrefix: `core/tenant:${tid}#external_member` } })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      C3: { on: async () => (await s.facadeFault({ mode: 'none', cedar: { noSchema: true } })).status === 200, off: async () => (await s.facadeFault({ mode: 'none' })).status === 200 },
      C4: { on: () => proxyFault('inj-pep', { mode: 'blackhole' }), off: () => proxyFault('inj-pep', { mode: 'pass' }) },
    };
    const recover = async (w) => {
      const t0 = Date.now();
      while (Date.now() - t0 < P.timing.recovery_timeout_ms) {
        const r = await uOwner.call('GET', `/t/${tid}/files/${roles.file.id}`).catch(() => ({ status: 0 }));
        if (r.status === 200) { win({ window: w.id, ev: 'recovered', ms: Date.now() - t0 }); return true; }
        await sleep(200);
      }
      win({ window: w.id, ev: 'not_recovered', ms: Date.now() - t0 });
      return false;
    };
    const windows = (engine === 'openfga' ? P.windows_openfga : P.windows_cedar).filter((w) => !only || only.includes(w.id));
    for (const w of windows) {
      win({ window: w.id, ev: 'start', class: w.class, fm: w.fm, fault: w.fault });
      if (w.class === 'baseline') {
        await batch(w, 'A');
        const h = await healthCheck(w, 'baseline', true);
        // C-3: controls in the baseline must behave as expected
        const rows = readJsonl(run.file('requests.jsonl')).filter((x) => x.window === w.id);
        const bad = rows.filter((x) => (x.expected_normal === 'allow') !== (x.status >= 200 && x.status < 300) || (x.list && x.status === 200 && !x.items));
        win({ window: w.id, ev: 'baseline_check', bad: bad.length, unhealthy: h });
        if (bad.length || h.length) throw Object.assign(new Error(`C-3 baseline controls failed (${bad.length} requests, unhealthy=${h.join(',')})`), { abort: 'C-3', detail: bad.slice(0, 20) });
        continue;
      }
      const F = FAULTS[w.id];
      startSampler(w);
      const applied = await F.on();
      const tApplied = Date.now();
      inj({ window: w.id, op: 'apply', fault: w.fault, applied, at: new Date(tApplied).toISOString() });
      win({ window: w.id, ev: 'applied', ok: applied });
      const hA = healthCheck(w, 'during', !!F.facade);
      await batch(w, 'A');
      const wait = P.batch_b_delay_ms - (Date.now() - tApplied);
      if (wait > 0) await sleep(wait);
      await batch(w, 'B');
      const unhealthy = [...new Set([...(await hA), ...(await healthCheck(w, 'after_B', !!F.facade))])];
      if (sampling) { await sampling(); sampling = null; }
      const cleared = await F.off();
      inj({ window: w.id, op: 'clear', ok: cleared, at: new Date().toISOString() });
      const ok = await recover(w);
      if (unhealthy.length) throw Object.assign(new Error(`C-5 non-target component unhealthy during ${w.id}: ${unhealthy.join(',')}`), { abort: 'C-5' });
      if (!ok) throw Object.assign(new Error(`C-3 no recovery after ${w.id}`), { abort: 'C-3' });
      await sleep(500);
    }
    await sleep(1500); // let audit / logs flush
  } catch (e) {
    abort = e.abort || 'harness_error';
    status = `aborted:${abort}`;
    run.writeJson('abort.json', { abort, message: e.message, detail: e.detail, stack: e.stack });
    console.error(`ABORT ${abort}: ${e.message}`);
  } finally {
    if (s) await s.stop();
  }
  if (prefreeze) { run.finish(status, { engine, note: 'pre-freeze harness check; evaluator not run (§2.5)' }); console.log(JSON.stringify({ run_dir: run.dir, status })); return; }
  const ev = evaluate(run.dir);
  run.finish(status, { engine, eval_summary: ev.summary });
  console.log(JSON.stringify({ run_dir: run.dir, status, summary: ev.summary }, null, 2));
}

function params0() { return loadParams(TC); }

// ------------------------------------------------------------------------------------------------
// evaluator: raw data only (requests.jsonl, windows.jsonl, netstat.jsonl, pep/*-alarms.jsonl, pdp/decisions.jsonl)
// ------------------------------------------------------------------------------------------------
export function evaluate(dir) {
  let pname = 'TC-010.json';
  try { const rm = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')); if (rm.params?.file) pname = path.basename(rm.params.file); } catch { /* default */ }
  const P = JSON.parse(fs.readFileSync(path.join(path.dirname(SELF), 'params', pname), 'utf8'));
  const runMeta = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
  // engine: run.json gets it only at finish(); roles.json is written at the start of the run (evaluator fix RK-EV-01)
  try { runMeta.engine ||= JSON.parse(fs.readFileSync(path.join(dir, 'roles.json'), 'utf8')).engine; } catch { /* keep */ }
  const reqs = readJsonl(path.join(dir, 'requests.jsonl'));
  const wins = readJsonl(path.join(dir, 'windows.jsonl'));
  const injs = readJsonl(path.join(dir, 'inject.jsonl'));
  const nets = readJsonl(path.join(dir, 'netstat.jsonl'));
  const healths = readJsonl(path.join(dir, 'health.jsonl'));
  const pepDir = path.join(dir, 'pep');
  const alarms = fs.existsSync(pepDir) ? fs.readdirSync(pepDir).filter((f) => f.endsWith('-alarms.jsonl')).flatMap((f) => readJsonl(path.join(pepDir, f))) : [];
  const decisions = readJsonl(path.join(dir, 'pdp', 'decisions.jsonl'));
  const windowDefs = [...P.windows_openfga, ...P.windows_cedar];
  const wdef = Object.fromEntries(windowDefs.map((w) => [w.id, w]));
  const allowed = (r) => r.status >= 200 && r.status < 300;
  const writePlus = (r) => r.tier === 'write' || r.tier === 'privileged';
  // window time ranges
  const ranges = {};
  for (const i of injs) {
    ranges[i.window] ||= {};
    if (i.op === 'apply') ranges[i.window].from = Date.parse(i.at);
    if (i.op === 'clear') ranges[i.window].to = Date.parse(i.at);
  }
  const firstAlarm = {};
  for (const [wid, rg] of Object.entries(ranges)) {
    const al = alarms.filter((x) => x.type === 'fm13_wrong_answer' && Date.parse(x.t) >= rg.from - 50 && Date.parse(x.t) <= (rg.to || Infinity));
    if (al.length) firstAlarm[wid] = { at: Math.min(...al.map((x) => Date.parse(x.t))), alarms: al };
  }
  const perWindow = {};
  const M = { write_plus_allow: 0, indeterminate_to_allow: 0, bypass: 0, empty_list_in_outage: 0, rs_allow_in_outage: 0, pre_detection_correct_allows: 0, public_denied: 0, matrix_deviation: 0 };
  const violations = [];
  for (const r of reqs) {
    const w = wdef[r.window];
    if (!w || w.class === 'baseline') continue;
    // RK-EV-02: params C3 note (pre-declared) — evaluation without schema counts only when an expected-deny request is allowed
    if (w.note && /counted only if an expected-deny request is allowed/.test(w.note) && !(r.expected_normal === 'deny' && r.status >= 200 && r.status < 300) && r.tier !== 'public') { (perWindow[r.window] ||= { class: w.class, fm: w.fm, fault: w.fault, n: 0, allowed: 0, by_status: {}, write_plus_allow: 0, rs_allow: 0, empty_list: 0, pre_detection_correct_allows: 0, note_excluded: 0 }).note_excluded = ((perWindow[r.window].note_excluded) || 0) + 1; continue; }
    const pw = (perWindow[r.window] ||= { class: w.class, fm: w.fm, fault: w.fault, n: 0, allowed: 0, by_status: {}, write_plus_allow: 0, rs_allow: 0, empty_list: 0, pre_detection_correct_allows: 0 });
    pw.n++;
    pw.by_status[r.status] = (pw.by_status[r.status] || 0) + 1;
    if (allowed(r)) pw.allowed++;
    const sentAt = Date.parse(r.sent_at);
    const det = firstAlarm[r.window]?.at;
    const afterDet = det !== undefined && sentAt >= det;
    if (r.tier === 'public') { if (!allowed(r)) { M.public_denied++; M.matrix_deviation++; violations.push({ kind: 'public_denied', ...r }); } continue; }
    if (writePlus(r) && allowed(r)) {
      const counts = w.class === 'U' || w.class === 'I' || (w.class === 'F' && (r.expected_normal === 'deny' || afterDet));
      if (counts) { M.write_plus_allow++; pw.write_plus_allow++; violations.push({ kind: 'write_plus_allow', ...r }); }
      else { M.pre_detection_correct_allows++; pw.pre_detection_correct_allows++; }
    }
    if (w.class === 'I' && allowed(r)) { M.indeterminate_to_allow++; violations.push({ kind: 'indeterminate_to_allow', ...r }); }
    if ((w.class === 'U' || w.class === 'I') && r.tier === 'read-sensitive' && allowed(r)) { M.rs_allow_in_outage++; pw.rs_allow++; violations.push({ kind: 'rs_allow_in_outage', ...r }); }
    if (['U', 'I', 'F'].includes(w.class) && r.list && allowed(r) && r.items === 0) { M.empty_list_in_outage++; pw.empty_list++; violations.push({ kind: 'empty_list', ...r }); }
    // fail-mode matrix conformance (non-public): class U/I -> 503; class F after detection -> 503; F before detection -> no allow of expected-deny
    const conform = (w.class === 'U' || w.class === 'I') ? r.status === 503
      : w.class === 'F' ? (afterDet ? r.status === 503 : !(allowed(r) && r.expected_normal === 'deny')) : true;
    if (!conform) M.matrix_deviation++;
    if (w.class === 'F' && allowed(r) && r.expected_normal === 'deny' && r.tier === 'read-sensitive') violations.push({ kind: 'rs_wrong_allow_before_detection', ...r });
  }
  const sutRows = (x) => (x.other_owner_rows || []).filter((y) => y.name !== 'harness');
  M.bypass = nets.reduce((n, x) => n + sutRows(x).length, 0);
  M.harness_rows_excluded = nets.reduce((n, x) => n + (x.other_owner_rows || []).filter((y) => y.name === 'harness').length, 0);
  // FM-13 alarms on allow-widening windows
  const widening = windowDefs.filter((w) => w.allow_widening && ranges[w.id]);
  const alarmed = widening.filter((w) => (firstAlarm[w.id]?.alarms || []).some((x) => x.allow_widening === true));
  const detection = Object.fromEntries(Object.entries(firstAlarm).map(([wid, x]) => [wid, { detect_ms: x.at - ranges[wid].from, alarms: x.alarms.length, services: [...new Set(x.alarms.map((y) => y.svc))], reasons: [...new Set(x.alarms.map((y) => y.reason))] }]));
  // reason codes recorded by the façade per window (hypothesis: unavailable vs indeterminate are distinct)
  const reasonByWindow = {};
  for (const [wid, rg] of Object.entries(ranges)) {
    const ds = decisions.filter((d) => d.t && Date.parse(d.t) >= rg.from && Date.parse(d.t) <= (rg.to || Infinity) && d.reason);
    reasonByWindow[wid] = ds.reduce((o, d) => { o[d.reason] = (o[d.reason] || 0) + 1; return o; }, {});
  }
  const unhealthy = healths.filter((h) => Object.entries(h).some(([k, v]) => ['state-store', 'sts', 'as-a', 'pdp'].includes(k) && v !== 200));
  const crit = P.pass_criteria;
  const checks = {
    write_plus_allow: { value: M.write_plus_allow, threshold: crit.write_plus_allow, pass: M.write_plus_allow === 0 },
    indeterminate_to_allow: { value: M.indeterminate_to_allow, threshold: 0, pass: M.indeterminate_to_allow === 0 },
    bypass: { value: M.bypass, threshold: 0, pass: M.bypass === 0, samples: nets.length, note: runMeta.engine === 'cedar' || !nets.length ? 'not applicable (no separate authorization store process in the Cedar configuration)' : undefined },
    empty_list_in_outage: { value: M.empty_list_in_outage, threshold: 0, pass: M.empty_list_in_outage === 0 },
    rs_allow_in_outage: { value: M.rs_allow_in_outage, threshold: 0, pass: M.rs_allow_in_outage === 0 },
    alarm_all_allow: { value: `${alarmed.length}/${widening.length}`, pass: widening.length === 0 ? null : alarmed.length === widening.length },
  };
  const evaluated = Object.values(checks).filter((c) => c.pass !== null);
  const allPass = evaluated.every((c) => c.pass);
  const completedWindows = new Set(wins.filter((x) => x.ev === 'recovered').map((x) => x.window));
  const expectedWindows = (runMeta.engine === 'cedar' ? P.windows_cedar : P.windows_openfga).filter((w) => w.class !== 'baseline').map((w) => w.id);
  const missing = expectedWindows.filter((w) => !completedWindows.has(w));
  const summary = {
    engine: runMeta.engine, requests: reqs.length, windows_completed: completedWindows.size, windows_missing: missing,
    checks, harness_rows_excluded: M.harness_rows_excluded, matrix_deviation: M.matrix_deviation, public_denied: M.public_denied, pre_detection_correct_allows: M.pre_detection_correct_allows,
    verdict: missing.length ? 'incomplete' : allPass ? 'pass' : 'fail', non_target_unhealthy_samples: unhealthy.length,
  };
  return writeEval(dir, { tc: TC, evaluatorFile: SELF, summary, per_window: perWindow, fm13_detection: detection, facade_reason_codes: reasonByWindow, violations: violations.slice(0, 500), violations_total: violations.length });
}

// ------------------------------------------------------------------------------------------------
if (a.freeze) {
  const m = freeze(TC, a.reason || 'initial freeze');
  console.log(JSON.stringify({ tc: TC, version: m.ver ?? m.version, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at }));
} else if (a.eval) {
  console.log(JSON.stringify(evaluate(a.eval).summary, null, 2));
} else {
  await measure(a.engine || 'openfga', { prefreeze: !!a.prefreeze, only: a.windows ? String(a.windows).split(',') : null, ref: !!a.ref });
}
