// TC-015 署名 alg の切替（古典 alg の範囲） (test plan §4.15; ADR-015 D15-71 with classic algs, ADR-007 TC-07-06 part).
//   node tests/resilience-keys/TC-015.js --freeze
//   node tests/resilience-keys/TC-015.js [--prefreeze]
//   node tests/resilience-keys/TC-015.js --eval <run-dir>
// Port block TC-015 = 42300..42319; +18 JWKS redirector (unused here except as the verifiers' JWKS path), +19 unused.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CompactSign } from 'jose';
import { Run } from '../../harness/run.js';
import { generate } from '../../data/gen-synthetic.js';
import { args } from '../../lib/runtime.js';
import { CODE_DIR } from '../../lib/topology.js';
import { foreignKey } from '../../harness/forge.js';
import { openRun, freeze, loadParams, sleep, readJsonl, writeEval, sha256File, GROUP } from './common.js';
import { atClaims } from './keyharness.js';
import { keyTestBed, controlPhase, checkControl } from './TC-014.js';

const TC = 'TC-015';
const SELF = fileURLToPath(import.meta.url);
const a = args();
const WATCH_FILES = () => [...fs.readdirSync(path.join(CODE_DIR, 'services')).filter((f) => f.endsWith('.js')).map((f) => `services/${f}`), 'pep/sdk.js', 'lib/jwt.js', 'config/ledger.json'];
const SERVICES = ['file-service', 'tool-service', 'label-service', 'edge', 'bff'];

function fingerprint(s) {
  return {
    files: Object.fromEntries(WATCH_FILES().map((f) => [f, sha256File(path.join(CODE_DIR, f))])),
    pids: Object.fromEntries(SERVICES.map((n) => [n, s.procs.procs.get(n)?.child.pid ?? null])),
  };
}

function buildDataset(seed) {
  const ds = generate({ seed, profile: 'smoke' });
  const L = ds.tenants.find((t) => t.size === 'L') || ds.tenants[0];
  const f = ds.files.find((x) => x.tid === L.id);
  return { ds, roles: { tid: L.id, uOwner: f.owner, fileId: f.id } };
}

async function measure({ prefreeze = false } = {}) {
  const P0 = loadParams(TC);
  const { run, params: P } = prefreeze
    ? { run: new Run({ tc: `${GROUP}/${TC}`, frozen: false, seed: P0.seed, purpose: 'prefreeze-harness-check' }), params: P0 }
    : openRun(TC, { seed: P0.seed, purpose: 'measurement' });
  const { ds, roles } = buildDataset(P.seed);
  run.writeJson('roles.json', roles);
  let tb, status = 'completed';
  try {
    tb = await keyTestBed({ tc: TC, run, P, ds, roles, settings: P.settings, verifierAlgs: 'cp' });
    const { st, ev, keysOp, signer, verifiers, T } = tb;
    const atV = verifiers.filter((v) => v.kind === 'at');
    let cpv = 0;
    const cp = async (version, at, txn) => {
      const r = await tb.s.reqR(`${T.urls.state}/status`, { body: { kind: 'alg_policy', id: version, status: { at, txn } } });
      ev({ ev: 'cp', version, at, txn, status: r.status, t: Date.now() });
      return r.status;
    };
    const phase = (ph, extraTokens) => {
      st.tickCfg = { ph, tokens: async () => ({ ...(await tb.currentTokens()), ...(extraTokens ? await extraTokens() : {}) }), set: verifiers };
      st.pepCfg = { ph, token: tb.currentPep };
      st.userPh = ph;
      ev({ ev: 'phase', ph, t: Date.now() });
    };
    await sleep(2500);
    await controlPhase(tb, 'baseline', 5000);
    const bad = checkControl(run.dir, 'baseline');
    ev({ ev: 'baseline_check', ...bad });
    if (bad.failures) throw Object.assign(new Error(`C-3 baseline: ${JSON.stringify(bad)}`), { abort: 'C-3' });
    const fpBefore = fingerprint(tb.s);
    run.writeJson('fingerprint-before.json', fpBefore);
    // initial CP (v1): the static configuration expressed as a distributed profile
    cpv = 1;
    await cp(cpv, ['ES256'], ['ES256']);
    phase('P0:cp-initial');
    await sleep(P.timing.cp_propagation_wait_ms + 2000);
    for (const pass of P.passes) {
      const { id, from, to } = pass;
      // S1 導入
      cpv++;
      await cp(cpv, [from, to], ['ES256']);
      phase(`${id}:S1`);
      await sleep(P.timing.cp_propagation_wait_ms);
      // S2 pre-publish
      const k = (await keysOp('at', 'prepublish', { alg: to })).body.kid;
      phase(`${id}:S2`);
      await sleep(P.timing.prepublish_wait_ms);
      // S3 switch
      const fromKid = (await signer.active('at')).kid;
      await keysOp('at', 'activate', { kid: k });
      phase(`${id}:S3`);
      await sleep(P.timing.observe_after_switch_ms);
      // S4 rollback (in-flight `to` tokens keep being presented)
      const toKey = await signer.byKid('at', k);
      const inflight = { token: await signer.sign('at', toKey, tb.claimsFor('at')), kid: k, kind: 'at' };
      const tCmd = Date.now();
      const rb = await keysOp('at', 'activate', { kid: fromKid });
      const tResp = Date.now();
      ev({ ev: 'rollback', pass: id, t_cmd: tCmd, t_resp: tResp, status: rb.status, to_kid: fromKid });
      phase(`${id}:S4`, async () => ({ inflight }));
      await sleep(P.timing.rollback_inflight_present_ms);
      phase(`${id}:S4b`);
      await sleep(P.timing.observe_after_switch_ms - P.timing.rollback_inflight_present_ms);
      // S5 re-switch
      await keysOp('at', 'activate', { kid: k });
      phase(`${id}:S5`);
      await sleep(P.timing.observe_after_switch_ms);
      // S6 retire `from`
      phase(`${id}:S6`);
      await sleep(P.timing.retire_wait_ms);
      for (const key of (await signer.refresh('at')).filter((x) => x.alg === from && ['pending', 'retiring'].includes(x.state))) {
        const r = await keysOp('at', 'remove', { kid: key.kid, check_in_use: true });
        ev({ ev: 'retire_remove', pass: id, kid: key.kid, status: r.status });
      }
      cpv++;
      await cp(cpv, [to], ['ES256']);
      await sleep(P.timing.cp_propagation_wait_ms);
      phase(`${id}:S6b`);
      await sleep(5000);
      // S7 negatives
      const pub = (await keysOp('at', 'prepublish', { alg: from })).body.kid; // a published key of the retired alg
      const pubKey = await signer.byKid('at', pub);
      const active = await signer.active('at');
      const rawSign = async (header, payload, key) => new CompactSign(Buffer.from(JSON.stringify(payload))).setProtectedHeader(header).sign(key);
      const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const pubJwk = (() => { const { d, p, q, dp, dq, qi, ...pk } = active.privateJwk; return { ...pk, kid: active.kid, alg: active.alg }; })();
      const rsa = await foreignKey('RS256');
      const negs = {
        published_retired_alg: async (c) => signer.sign('at', pubKey, c),
        alg_key_mismatch: async (c) => rawSign({ alg: active.alg, typ: 'at+jwt', kid: pub }, c, await signer.keyObj(active)),
        alg_none: async (c) => `${enc({ alg: 'none', typ: 'at+jwt', kid: active.kid })}.${enc(c)}.`,
        hs256_public_key_as_secret: async (c) => rawSign({ alg: 'HS256', typ: 'at+jwt', kid: active.kid }, c, new TextEncoder().encode(JSON.stringify(pubJwk))),
        foreign_rs256_active_kid: async (c) => rawSign({ alg: 'RS256', typ: 'at+jwt', kid: active.kid }, c, rsa.privateKey),
      };
      for (const [name, mk] of Object.entries(negs)) {
        const ph = `${id}:S7-${name}`;
        st.tickCfg = { ph, tokens: async () => ({ neg: { token: await mk(tb.claimsFor('at')), kid: name, kind: 'at' } }), set: atV };
        st.pepCfg = { ph, token: async () => ({ key: 'neg', kid: name, token: await mk(atClaims(T, { sub: roles.uOwner, tid: roles.tid, aud: T.audiences.file, cnfX5t: tb.x5t })) }) };
        st.userPh = null;
        await sleep(P.timing.negative_each_ms);
        if (name === 'published_retired_alg') {
          // old CP version re-presented (monotonic CP): must be refused, the allowlist must not change
          const stOld = await cp(cpv - 2, [from, to], ['ES256']);
          ev({ ev: 'negative_cp_rollback', pass: id, version: cpv - 2, status: stOld });
          st.tickCfg = { ...st.tickCfg, ph: `${id}:S7-after_old_cp` };
          st.pepCfg = { ...st.pepCfg, token: async () => ({ key: 'neg', kid: 'after_old_cp', token: await negs.published_retired_alg(atClaims(T, { sub: roles.uOwner, tid: roles.tid, aud: T.audiences.file, cnfX5t: tb.x5t })) }) };
          await sleep(P.timing.negative_each_ms);
        }
      }
      await keysOp('at', 'remove', { kid: pub, check_in_use: true });
      phase(`${id}:end`);
      await sleep(3000);
    }
    st.tickCfg = null; st.pepCfg = null; st.userPh = null;
    await sleep(16000);
    await controlPhase(tb, 'postcheck', 5000);
    const badPost = checkControl(run.dir, 'postcheck');
    ev({ ev: 'postcheck', ...badPost });
    const fpAfter = fingerprint(tb.s);
    run.writeJson('fingerprint-after.json', fpAfter);
    await tb.dumpKeys('final');
    if (badPost.failures) throw Object.assign(new Error(`C-3 post-check: ${JSON.stringify(badPost)}`), { abort: 'C-3' });
  } catch (e) {
    status = `aborted:${e.abort || 'harness_error'}`;
    run.writeJson('abort.json', { abort: e.abort || 'harness_error', message: e.message, stack: e.stack });
    console.error(`ABORT: ${e.message}`);
  } finally {
    if (tb) { await tb.stopLoops(); tb.rev.stop(); await tb.red.stop(); await tb.attacker.stop(); await tb.s.stop(); }
  }
  if (prefreeze) { run.finish(status, { note: 'pre-freeze harness check; evaluator not run (§2.5)' }); console.log(JSON.stringify({ run_dir: run.dir, status })); return; }
  const out = evaluate(run.dir);
  run.finish(status, { eval_summary: out.summary });
  console.log(JSON.stringify({ run_dir: run.dir, status, summary: out.summary }, null, 2));
}

export function evaluate(dir) {
  const P = JSON.parse(fs.readFileSync(path.join(path.dirname(SELF), 'params', 'TC-015.json'), 'utf8'));
  const ticks = readJsonl(path.join(dir, 'ticks.jsonl'));
  const peps = readJsonl(path.join(dir, 'pep-probe.jsonl'));
  const users = readJsonl(path.join(dir, 'user.jsonl'));
  const evs = readJsonl(path.join(dir, 'events.jsonl'));
  const ok2xx = (s) => s >= 200 && s < 300;
  const procPh = (ph) => /^P\d:(S[1-6]b?|S4b)$/.test(ph) || ph === 'P0:cp-initial';
  const proc = { verifier_rejects: 0, pep_failures: 0, user_failures: 0, by_phase: {} };
  for (const t of ticks.filter((x) => procPh(x.ph))) for (const [k, v] of Object.entries(t.r)) if (v !== 'A') { proc.verifier_rejects++; (proc.by_phase[t.ph] ||= {})[`${k}:${v}`] = ((proc.by_phase[t.ph] || {})[`${k}:${v}`] || 0) + 1; }
  proc.pep_failures = peps.filter((x) => procPh(x.ph) && x.status !== 200).length;
  proc.user_failures = users.filter((x) => procPh(x.ph) && !ok2xx(x.status)).length;
  const procTotal = proc.verifier_rejects + proc.pep_failures + proc.user_failures;
  const procN = ticks.filter((x) => procPh(x.ph)).reduce((n, t) => n + Object.keys(t.r).length, 0) + peps.filter((x) => procPh(x.ph)).length + users.filter((x) => procPh(x.ph)).length;
  // negatives
  const negs = {};
  let negAccepted = 0;
  for (const t of ticks.filter((x) => /:S7-/.test(x.ph))) {
    for (const [k, v] of Object.entries(t.r)) {
      const n = (negs[t.ph] ||= { verifier_n: 0, verifier_accepted: 0, codes: {}, pep_n: 0, pep_accepted: 0, pep_statuses: {} });
      n.verifier_n++;
      if (v === 'A') { n.verifier_accepted++; negAccepted++; } else n.codes[v] = (n.codes[v] || 0) + 1;
    }
  }
  for (const x of peps.filter((y) => /:S7-/.test(y.ph))) {
    const n = (negs[x.ph] ||= { verifier_n: 0, verifier_accepted: 0, codes: {}, pep_n: 0, pep_accepted: 0, pep_statuses: {} });
    n.pep_n++;
    n.pep_statuses[x.status] = (n.pep_statuses[x.status] || 0) + 1;
    if (x.status === 200) { n.pep_accepted++; negAccepted++; }
  }
  const oldCp = evs.filter((e) => e.ev === 'negative_cp_rollback');
  negAccepted += oldCp.filter((e) => e.status === 200).length;
  // rollback time
  const rollbacks = evs.filter((e) => e.ev === 'rollback').map((e) => {
    const after = ticks.filter((t) => t.ts >= e.t_resp && t.kids && t.kids.at === e.to_kid);
    const firstAll = after.find((t) => Object.entries(t.r).filter(([k]) => k.endsWith('|at')).every(([, v]) => v === 'A'));
    return { pass: e.pass, command_to_issuer_switch_ms: e.t_resp - e.t_cmd, command_to_first_all_accept_ms: firstAll ? firstAll.ts - e.t_cmd : null };
  });
  const inflight = ticks.filter((t) => /:S4$/.test(t.ph)).flatMap((t) => Object.entries(t.r).filter(([k]) => k.endsWith('|inflight')));
  // diff and restarts
  const rd = (f) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null);
  const fb = rd('fingerprint-before.json'), fa = rd('fingerprint-after.json');
  const diffFiles = fb && fa ? Object.keys({ ...fb.files, ...fa.files }).filter((f) => fb.files[f] !== fa.files[f]) : null;
  const restarts = fb && fa ? SERVICES.filter((n) => fb.pids[n] !== fa.pids[n]) : null;
  const passesDone = new Set(evs.filter((e) => e.ev === 'phase' && /:end$/.test(e.ph)).map((e) => e.ph.split(':')[0]));
  const checks = {
    code_and_config_diff_files: { value: diffFiles ? diffFiles.length : null, files: diffFiles, pass: diffFiles ? diffFiles.length === 0 : null },
    service_restarts: { value: restarts ? restarts.length : null, pass: restarts ? restarts.length === 0 : null },
    verification_failures_in_procedure: { value: procTotal, n: procN, detail: proc, pass: passesDone.size === P.passes.length ? procTotal === 0 : null },
    downgrade_or_negative_accepted: { value: negAccepted, old_cp_statuses: oldCp.map((e) => e.status), pass: Object.keys(negs).length ? negAccepted === 0 : null },
  };
  const evald = Object.values(checks).filter((c) => c.pass !== null);
  const summary = {
    checks, rollbacks, inflight_during_rollback: { n: inflight.length, rejected: inflight.filter(([, v]) => v !== 'A').length },
    passes_completed: [...passesDone],
    verdict: evald.length < Object.keys(checks).length ? 'incomplete' : evald.every((c) => c.pass) ? 'pass' : 'fail',
  };
  return writeEval(dir, { tc: TC, evaluatorFile: SELF, summary, negatives: negs });
}

if (path.resolve(process.argv[1] || '') === SELF) {
  if (a.freeze) {
    const m = freeze(TC, a.reason || 'initial freeze');
    console.log(JSON.stringify({ tc: TC, version: m.ver ?? m.version, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at }));
  } else if (a.eval) {
    console.log(JSON.stringify(evaluate(a.eval).summary, null, 2));
  } else {
    await measure({ prefreeze: !!a.prefreeze });
  }
}
