// TC-014 鍵の緊急 rotation・計画 rotation・JWKS 差替え (test plan §4.14; ADR-007 TC-07-02/03/04/13/16, fail-mode FM-08).
//   node tests/resilience-keys/TC-014.js --freeze
//   node tests/resilience-keys/TC-014.js [--prefreeze --phases baseline,emergency]   (prefreeze: harness check, no evaluator)
//   node tests/resilience-keys/TC-014.js --eval <run-dir>
// Port block TC-014 = 42280..42299; +18 JWKS redirector, +19 attacker JWKS server (in-process, this group).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStack } from '../../harness/stack.js';
import { Run } from '../../harness/run.js';
import { portBase } from '../../config/ports.js';
import { generate } from '../../data/gen-synthetic.js';
import { args } from '../../lib/runtime.js';
import { foreignKey } from '../../harness/forge.js';
import { CompactSign } from 'jose';
import { openRun, freeze, loadParams, sleep, recorder, readJsonl, writeEval, quantile, GROUP } from './common.js';
import { Redirector, AttackerJwks, StoreSigner, harnessX5t, atClaims, txnClaims, makeVerifier, makeRevocation, presentToPep, pepLog } from './keyharness.js';

const TC = 'TC-014';
const SELF = fileURLToPath(import.meta.url);
const a = args();

export async function keyTestBed({ tc, run, P, ds, roles, settings, extraEnv = {}, verifierAlgs }) {
  const env = { PEP_JWKS_TTL_MS: String(P.real_pep_jwks_ttl_ms), ...extraEnv };
  const s = await startStack({ tc, run, engine: 'openfga', dataset: ds, seed: P.seed, settings, env: { 'file-service': { ...env }, 'tool-service': { ...env }, 'label-service': { ...env } } });
  const T = s.topo;
  const base = portBase(tc);
  const red = new Redirector({ port: base + 18, stsPort: T.ports.sts, attackerPort: base + 19 });
  await red.start();
  const attacker = new AttackerJwks({ port: base + 19 });
  const rev = makeRevocation(T, s.tls);
  await rev.start();
  const signer = new StoreSigner(T);
  // 'cp': allowlist from the distributed crypto profile (RK-07), as the PEP SDK does; otherwise static / undefined (ES256)
  const algsFn = verifierAlgs === 'cp' ? (kind) => (rev.status?.alg_policy?.[kind] || ['ES256']) : verifierAlgs;
  const x5t = harnessX5t(T);
  const jwksBase = `https://127.0.0.1:${base + 18}`;
  const verifiers = [];
  for (const kind of P.verifier_matrix.kinds) for (const ttl of P.verifier_matrix.jwks_cache_ttl_ms) for (const push of P.verifier_matrix.revocation_push) {
    verifiers.push(makeVerifier({ topo: T, tls: s.tls, name: `${kind}-ttl${ttl}-${push ? 'push' : 'nopush'}`, kind, ttlMs: ttl, push, rev, jwksBase, algs: algsFn }));
  }
  const controls = [makeVerifier({ topo: T, tls: s.tls, name: 'ctl-at-ttl1000-push-nopin', kind: 'at', ttlMs: 1000, push: true, pin: false, rev, jwksBase, algs: algsFn }),
    makeVerifier({ topo: T, tls: s.tls, name: 'ctl-at-ttl15000-push-nopin', kind: 'at', ttlMs: 15000, push: true, pin: false, rev, jwksBase, algs: algsFn })];
  for (const c of controls) c.control = true;
  const tick = recorder(run, 'ticks.jsonl');
  const pepRec = recorder(run, 'pep-probe.jsonl');
  const userRec = recorder(run, 'user.jsonl');
  const ev = recorder(run, 'events.jsonl');
  const login = await s.login({ sub: roles.uOwner, tid: roles.tid, amr: 'pwd,otp' });
  if (!login.ok) throw Object.assign(new Error('owner login failed'), { abort: 'C-3' });
  const st = { tickCfg: null, pepCfg: null, userPh: null, stop: false, lastAccept: {}, lastSeen: {}, seq: 0 };
  const claimsFor = (kind) => (kind === 'txn' ? txnClaims(T, { sub: roles.uOwner, tid: roles.tid }) : atClaims(T, { sub: roles.uOwner, tid: roles.tid, aud: T.audiences.file }));
  // ---- loops ----
  const tickLoop = (async () => {
    while (!st.stop) {
      const t0 = Date.now();
      const cfg = st.tickCfg;
      if (cfg) {
        let toks;
        try { toks = await cfg.tokens(); } catch (e) { toks = null; ev({ ev: 'token_error', ph: cfg.ph, e: e.message }); }
        if (toks) {
          const out = {};
          await Promise.all(cfg.set.flatMap((v) => Object.entries(toks).filter(([, tk]) => tk && tk.kind === v.kind && (!tk.only || tk.only(v))).map(async ([key, tk]) => {
            const r = await v.verify(tk.token);
            const id = `${v.name}|${key}`;
            out[id] = r.ok ? 'A' : `R:${r.code}`;
            st.lastSeen[id] = t0;
            if (r.ok) st.lastAccept[id] = t0;
          })));
          tick({ ph: cfg.ph, rep: cfg.rep, ts: t0, kids: Object.fromEntries(Object.entries(toks).filter(([, x]) => x).map(([k, x]) => [k, x.kid])), r: out });
        }
      }
      await sleep(Math.max(0, P.q_ms.in_process_verifiers - (Date.now() - t0)));
    }
  })();
  const pepLoop = (async () => {
    while (!st.stop) {
      const t0 = Date.now();
      const cfg = st.pepCfg;
      if (cfg) {
        try {
          const tk = await cfg.token();
          const status = await presentToPep(T, s.tls, tk.token, { tid: roles.tid, fileId: roles.fileId });
          pepRec({ ph: cfg.ph, rep: cfg.rep, ts: t0, key: tk.key, kid: tk.kid, status });
          if (status === 200) st.lastAccept[`pep|${tk.key}`] = t0;
          st.lastSeen[`pep|${tk.key}`] = t0;
        } catch (e) { pepRec({ ph: cfg.ph, ts: t0, err: e.message }); }
      }
      await sleep(Math.max(0, P.q_ms.real_pep - (Date.now() - t0)));
    }
  })();
  const userLoop = (async () => {
    let i = 0;
    while (!st.stop) {
      const t0 = Date.now();
      if (st.userPh) {
        const ph = st.userPh;
        const op = i++ % 2 === 0 ? 'read' : 'write';
        let status = 0;
        try {
          const r = op === 'read' ? await login.call('GET', `/t/${roles.tid}/files/${roles.fileId}`) : await login.call('PUT', `/t/${roles.tid}/files/${roles.fileId}`, { content: `rk-${tc} ${++st.seq}` });
          status = r.status;
        } catch { status = 0; }
        userRec({ ph, ts: t0, op, status, ms: Date.now() - t0 });
      }
      await sleep(Math.max(0, P.q_ms.user_traffic - (Date.now() - t0)));
    }
  })();
  const stopLoops = async () => { st.stop = true; await Promise.all([tickLoop, pepLoop, userLoop]); };
  // harness admin calls: one retry when a kept-alive socket was closed by the server (ECONNRESET), not a SUT failure
  const retry = async (fn) => { try { return await fn(); } catch (e) { if (e.code !== 'ECONNRESET' && e.code !== 'EPIPE') throw e; ev({ ev: 'harness_retry', code: e.code }); return fn(); } };
  s.reqR = (url, o) => retry(() => s.req(url, o));
  const keysOp = async (store, op, body = {}) => {
    const t0 = Date.now();
    const r = await retry(() => s.keys(store, op, body));
    const out = { status: r.status, body: r.json() };
    ev({ ev: 'key_op', store, op, req: body, status: r.status, resp: out.body, sent_ms: t0, ms: Date.now() - t0 });
    return out;
  };
  const tokenOf = async (store, k, extra = {}) => ({ token: await signer.sign(store, k, claimsFor(store)), kid: k.kid, kind: store, ...extra });
  const pepTokenOf = async (k, key) => ({ key, kid: k.kid, token: await signer.sign('at', k, atClaims(T, { sub: roles.uOwner, tid: roles.tid, aud: T.audiences.file, cnfX5t: x5t })) });
  const currentTokens = async () => ({ at: await tokenOf('at', await signer.active('at')), txn: await tokenOf('txn', await signer.active('txn')) });
  const currentPep = async () => pepTokenOf(await signer.active('at'), 'cur');
  const dumpKeys = async (name) => {
    for (const store of ['at', 'txn']) {
      const r = await s.reqR(`${T.urls.sts}/admin/keys/${store}`);
      fs.writeFileSync(path.join(run.dir, `${name}-keys-${store}.json`), JSON.stringify(r.json(), null, 2)); // no key material (server strips it)
    }
  };
  return { s, T, red, attacker, rev, signer, x5t, verifiers, controls, st, ev, keysOp, tokenOf, pepTokenOf, currentTokens, currentPep, stopLoops, dumpKeys, claimsFor, login };
}

/** Run `fn` while all verifiers + real PEP + user traffic run in phase `ph` with the current keys; C-3 if any failure. */
export async function controlPhase(tb, ph, ms) {
  const { st } = tb;
  st.tickCfg = { ph, tokens: tb.currentTokens, set: tb.verifiers };
  st.pepCfg = { ph, token: tb.currentPep };
  st.userPh = ph;
  await sleep(ms);
  st.tickCfg = null; st.pepCfg = null; st.userPh = null;
  await sleep(300);
}

function buildDataset(seed) {
  const ds = generate({ seed, profile: 'smoke' });
  const L = ds.tenants.find((t) => t.size === 'L') || ds.tenants[0];
  const f = ds.files.find((x) => x.tid === L.id);
  return { ds, roles: { tid: L.id, uOwner: f.owner, fileId: f.id } };
}

async function measure({ prefreeze = false, phases = null } = {}) {
  const P0 = loadParams(TC);
  const { run, params: P } = prefreeze
    ? { run: new Run({ tc: `${GROUP}/${TC}`, frozen: false, seed: P0.seed, purpose: 'prefreeze-harness-check' }), params: P0 }
    : openRun(TC, { seed: P0.seed, purpose: 'measurement' });
  const want = (ph) => !phases || phases.includes(ph);
  const { ds, roles } = buildDataset(P.seed);
  run.writeJson('roles.json', roles);
  let tb, status = 'completed';
  try {
    tb = await keyTestBed({ tc: TC, run, P, ds, roles, settings: P.settings });
    const { st, ev, keysOp, signer, verifiers, controls, red, attacker, T } = tb;
    await sleep(2500); // first JWKS fetches, revocation sync
    // ---------------- baseline (C-3) ----------------
    await controlPhase(tb, 'baseline', 5000);
    const bad = checkControl(run.dir, 'baseline');
    ev({ ev: 'baseline_check', ...bad });
    if (bad.failures) throw Object.assign(new Error(`C-3 baseline: ${JSON.stringify(bad)}`), { abort: 'C-3' });
    // ---------------- emergency revocation ----------------
    if (want('emergency')) {
      const reps = [];
      for (let i = 0; i < Math.max(P.emergency.repetitions.at, P.emergency.repetitions.txn); i++) {
        if (i < P.emergency.repetitions.at) reps.push('at');
        if (i < P.emergency.repetitions.txn) reps.push('txn');
      }
      let rep = 0;
      for (const kind of reps) {
        rep++;
        const K = await signer.active(kind);
        const set = verifiers.filter((v) => v.kind === kind);
        st.tickCfg = { ph: 'emergency', rep, tokens: async () => ({ old: await tb.tokenOf(kind, K) }), set };
        if (kind === 'at') st.pepCfg = { ph: 'emergency', rep, token: () => tb.pepTokenOf(K, 'old') };
        st.userPh = 'emergency';
        await sleep(P.emergency.pre_declaration_ms);
        const tDecl = Date.now();
        ev({ ev: 'declare', ph: 'emergency', rep, kind, kid: K.kid, at: tDecl });
        const r = await keysOp(kind, 'emergency-revoke', { kid: K.kid });
        // epoch watcher (harness revocation client = distribution to the in-process push verifiers)
        let tEpoch = null;
        const tEnd = tDecl + P.emergency.timeout_ms;
        while (Date.now() < tEnd) {
          if (tEpoch === null && tb.rev.kidRevoked(K.kid)) { tEpoch = Date.now(); ev({ ev: 'epoch_applied', ph: 'emergency', rep, kind, kid: K.kid, at: tEpoch, epoch: tb.rev.epoch }); }
          const ids = [...set.map((v) => `${v.name}|old`), ...(kind === 'at' ? ['pep|old'] : [])];
          const lastA = Math.max(0, ...ids.map((id) => st.lastAccept[id] || 0));
          const seenAll = ids.every((id) => (st.lastSeen[id] || 0) > tDecl + 200);
          if (seenAll && Date.now() - Math.max(lastA, tDecl) >= P.emergency.observe_until_all_reject_ms && tEpoch !== null) break;
          await sleep(10);
        }
        ev({ ev: 'rep_end', ph: 'emergency', rep, kind, kid: K.kid, timed_out: Date.now() >= tEnd, revoke_status: r.status });
        st.tickCfg = null; st.pepCfg = null; st.userPh = null;
        await sleep(P.emergency.gap_ms);
      }
    }
    // ---------------- planned rotation (12 cycles, at + txn) ----------------
    if (want('rotation')) {
      st.tickCfg = { ph: 'rotation', tokens: tb.currentTokens, set: verifiers };
      st.pepCfg = { ph: 'rotation', token: tb.currentPep };
      st.userPh = 'rotation';
      const prevRetiring = { at: [], txn: [] };
      for (let c = 1; c <= P.planned_rotation.cycles; c++) {
        const next = {};
        for (const store of P.planned_rotation.stores) next[store] = (await keysOp(store, 'prepublish', { alg: 'ES256' })).body.kid;
        ev({ ev: 'cycle_prepublished', ph: 'rotation', cycle: c, next });
        await sleep(P.planned_rotation.prepublish_wait_ms);
        for (const store of P.planned_rotation.stores) {
          const cur = (await signer.active(store)).kid;
          const act = await keysOp(store, 'activate', { kid: next[store] });
          ev({ ev: 'cycle_activated', ph: 'rotation', cycle: c, store, from: cur, to: next[store], status: act.status });
          const keep = [];
          for (const old of prevRetiring[store]) {
            const rm = await keysOp(store, 'remove', { kid: old });
            if (rm.status !== 200) keep.push(old);
          }
          prevRetiring[store] = [...keep, cur];
        }
      }
      await sleep(P.planned_rotation.prepublish_wait_ms);
      for (const store of P.planned_rotation.stores) for (const old of prevRetiring[store]) await keysOp(store, 'remove', { kid: old });
      await sleep(1000);
      st.tickCfg = null; st.pepCfg = null; st.userPh = null;
      await sleep(500);
    }
    // ---------------- retain / removal ----------------
    if (want('retain')) {
      st.tickCfg = { ph: 'retain', tokens: tb.currentTokens, set: verifiers };
      st.pepCfg = { ph: 'retain', token: tb.currentPep };
      st.userPh = 'retain';
      const R = (await keysOp('at', 'prepublish', { alg: 'ES256', retain: true })).body.kid;
      ev({ ev: 'attempt', what: 'remove_retain_pending', kid: R, status: (await keysOp('at', 'remove', { kid: R })).status });
      await sleep(P.planned_rotation.prepublish_wait_ms);
      const before = (await signer.active('at')).kid;
      await keysOp('at', 'activate', { kid: R });
      const N = (await keysOp('at', 'prepublish', { alg: 'ES256' })).body.kid;
      await sleep(P.planned_rotation.prepublish_wait_ms);
      await keysOp('at', 'activate', { kid: N });
      for (let i = 0; i < P.retain_and_removal.retain_removal_attempts - 1; i++) ev({ ev: 'attempt', what: 'remove_retain_retiring', kid: R, status: (await keysOp('at', 'remove', { kid: R })).status });
      ev({ ev: 'attempt', what: 'remove_active', kid: N, status: (await keysOp('at', 'remove', { kid: N })).status });
      await keysOp('at', 'remove', { kid: before }); // tidy: the key active before R (long expired tokens)
      // in-use check, then mistaken removal with the check switched off
      await sleep(4000); // N signs live tokens (user traffic)
      const M = (await keysOp('at', 'prepublish', { alg: 'ES256' })).body.kid;
      await sleep(P.planned_rotation.prepublish_wait_ms);
      const nTok = await tb.tokenOf('at', await signer.byKid('at', N)); // a token issued with N just before the switch
      const nPep = await tb.pepTokenOf(await signer.byKid('at', N), 'n_inflight');
      await keysOp('at', 'activate', { kid: M });
      ev({ ev: 'attempt', what: 'remove_in_use_checked', kid: N, status: (await keysOp('at', 'remove', { kid: N, check_in_use: true })).status });
      await tb.s.reqR(`${T.urls.sts}/admin/settings`, { body: { keyRemovalInUseCheck: false } });
      ev({ ev: 'settings', keyRemovalInUseCheck: false });
      st.tickCfg = { ph: 'mistaken_removal', tokens: async () => ({ ...(await tb.currentTokens()), inflight: { ...nTok, only: () => true } }), set: verifiers };
      st.pepCfg = { ph: 'mistaken_removal', token: async () => nPep };
      st.userPh = 'mistaken_removal';
      const mr = await keysOp('at', 'remove', { kid: N });
      ev({ ev: 'attempt', what: 'mistaken_removal', kid: N, status: mr.status, at: Date.now() });
      await sleep(P.retain_and_removal.mistaken_removal_observe_ms || 20000);
      await tb.s.reqR(`${T.urls.sts}/admin/settings`, { body: { keyRemovalInUseCheck: true } });
      ev({ ev: 'settings', keyRemovalInUseCheck: true });
      st.tickCfg = null; st.pepCfg = null; st.userPh = null;
      await sleep(500);
    }
    // ---------------- fake JWKS ----------------
    if (want('fake')) {
      const atk = await foreignKey('ES256');
      const allV = [...verifiers.filter((v) => v.kind === 'at'), ...controls];
      const sample = (header, kidOverride) => async () => {
        const claims = tb.claimsFor('at');
        const h = { alg: 'ES256', typ: 'at+jwt', kid: kidOverride || atk.publicJwk.kid, ...header };
        return { token: await new CompactSign(Buffer.from(JSON.stringify(claims))).setProtectedHeader(h).sign(atk.privateKey), kid: h.kid, kind: 'at' };
      };
      const pepSample = (header, kidOverride) => async () => {
        const claims = atClaims(T, { sub: roles.uOwner, tid: roles.tid, aud: T.audiences.file, cnfX5t: tb.x5t });
        const h = { alg: 'ES256', typ: 'at+jwt', kid: kidOverride || atk.publicJwk.kid, ...header };
        return { key: 'fake', kid: h.kid, token: await new CompactSign(Buffer.from(JSON.stringify(claims))).setProtectedHeader(h).sign(atk.privateKey) };
      };
      const attackerUrl = `https://127.0.0.1:${portBase(TC) + 19}/jwks`;
      await attacker.start({ cert: T.workloads['tool-service'].cert, key: T.workloads['tool-service'].key });
      attacker.body = { keys: [atk.publicJwk] };
      const f1 = [['jwk', { jwk: atk.publicJwk }], ['jku', { jku: attackerUrl }], ['x5u', { x5u: attackerUrl }], ['x5c', { x5c: [Buffer.from('not-a-cert').toString('base64')] }]];
      for (const [name, hdr] of f1) {
        const tok = sample(hdr);
        st.tickCfg = { ph: `fake:F1-${name}`, tokens: async () => ({ cur: { ...(await tb.tokenOf('at', await signer.active('at'))) }, fake: await tok() }), set: allV };
        st.pepCfg = { ph: `fake:F1-${name}`, token: pepSample(hdr) };
        ev({ ev: 'fake_variant', id: `F1-${name}`, at: Date.now() });
        await sleep(2000);
      }
      const variants = [
        { id: 'F2', cert: Object.values(T.sandbox)[0], body: () => ({ keys: [atk.publicJwk] }), kid: null },
        { id: 'F3', cert: T.workloads['tool-service'], body: () => ({ keys: [atk.publicJwk] }), kid: null },
        { id: 'F4', cert: T.workloads['tool-service'], body: (legit) => ({ keys: [{ ...atk.publicJwk, kid: legit }] }), kid: 'legit' },
      ];
      for (const v of variants) {
        const legit = (await signer.active('at')).kid;
        await attacker.start({ cert: v.cert.cert, key: v.cert.key });
        attacker.body = v.body(legit);
        red.set('attacker');
        const tok = sample({}, v.kid === 'legit' ? legit : null);
        ev({ ev: 'fake_variant', id: v.id, at: Date.now(), attacker_cert: v.cert.spiffeId || v.cert.name, kid_collision: v.kid === 'legit' });
        st.tickCfg = { ph: `fake:${v.id}`, tokens: async () => ({ cur: await tb.tokenOf('at', await signer.active('at')), fake: await tok() }), set: allV };
        await sleep(P.fake_jwks.observe_ms);
        st.tickCfg = null;
        red.set('sts');
        ev({ ev: 'fake_variant_end', id: v.id, attacker_hits: attacker.hits });
        await sleep(16000); // caches back to the legitimate JWKS before the next variant
      }
      await attacker.stop();
      st.tickCfg = null; st.pepCfg = null;
    }
    // ---------------- JWKS outage (FM-08) ----------------
    if (want('outage')) {
      const prevAt = (await signer.active('at')).kid;
      const prevTxn = (await signer.active('txn')).kid;
      const nAt = (await keysOp('at', 'prepublish', { alg: 'ES256' })).body.kid;
      const nTxn = (await keysOp('txn', 'prepublish', { alg: 'ES256' })).body.kid;
      st.tickCfg = { ph: 'outage-pre', tokens: tb.currentTokens, set: verifiers };
      st.userPh = 'outage-pre';
      await sleep(P.planned_rotation.prepublish_wait_ms);
      const prevAtKey = await signer.byKid('at', prevAt);
      const prevTxnKey = await signer.byKid('txn', prevTxn);
      st.tickCfg = { ph: 'outage', tokens: async () => ({ ...(await tb.currentTokens()), atOld: await tb.tokenOf('at', prevAtKey), txnOld: await tb.tokenOf('txn', prevTxnKey) }), set: verifiers };
      st.userPh = 'outage';
      red.set('blackhole');
      const t0 = Date.now();
      ev({ ev: 'outage_start', at: t0 });
      await sleep(3000);
      await keysOp('at', 'activate', { kid: nAt });
      await keysOp('txn', 'activate', { kid: nTxn });
      ev({ ev: 'outage_activated', at: Date.now() });
      await sleep(5000);
      ev({ ev: 'outage_revoke_previous', at: Date.now(), at_kid: prevAt, txn_kid: prevTxn });
      await keysOp('at', 'emergency-revoke', { kid: prevAt });
      await keysOp('txn', 'emergency-revoke', { kid: prevTxn });
      await sleep(Math.max(0, P.jwks_outage.duration_ms - (Date.now() - t0)));
      red.set('sts');
      ev({ ev: 'outage_end', at: Date.now() });
      st.tickCfg = null; st.userPh = null;
      await sleep(16000);
    }
    // ---------------- key-age hard limit ----------------
    if (want('hardlimit')) {
      for (const store of ['at', 'txn']) await keysOp(store, 'prepublish', { alg: 'ES256' });
      st.tickCfg = { ph: 'hardlimit-pre', tokens: tb.currentTokens, set: verifiers };
      await sleep(P.planned_rotation.prepublish_wait_ms);
      st.tickCfg = { ph: 'hardlimit', tokens: tb.currentTokens, set: verifiers };
      st.pepCfg = { ph: 'hardlimit', token: tb.currentPep };
      st.userPh = 'hardlimit';
      await tb.s.reqR(`${T.urls.sts}/admin/settings`, { body: { keyMaxAgeMs: P.hard_limit.key_max_age_ms } });
      ev({ ev: 'hardlimit_on', at: Date.now(), key_max_age_ms: P.hard_limit.key_max_age_ms });
      await sleep(P.hard_limit.with_next_key_observe_ms + P.hard_limit.without_next_key_observe_ms);
      await tb.s.reqR(`${T.urls.sts}/admin/settings`, { body: { keyMaxAgeMs: 0 } });
      ev({ ev: 'hardlimit_off', at: Date.now() });
      st.tickCfg = null; st.pepCfg = null; st.userPh = null;
      await sleep(500);
    }
    // ---------------- post-check (C-3) ----------------
    await sleep(16000); // let every cache settle on the current JWKS
    await controlPhase(tb, 'postcheck', 5000);
    const badPost = checkControl(run.dir, 'postcheck');
    ev({ ev: 'postcheck', ...badPost });
    if (badPost.failures) throw Object.assign(new Error(`C-3 post-check: ${JSON.stringify(badPost)}`), { abort: 'C-3' });
    await tb.dumpKeys('final');
  } catch (e) {
    status = `aborted:${e.abort || 'harness_error'}`;
    run.writeJson('abort.json', { abort: e.abort || 'harness_error', message: e.message, stack: e.stack });
    console.error(`ABORT: ${e.message}`);
    try { await tb?.dumpKeys('abort'); } catch { /* ignore */ }
  } finally {
    if (tb) { await tb.stopLoops(); tb.rev.stop(); await tb.red.stop(); await tb.attacker.stop(); await tb.s.stop(); }
  }
  if (prefreeze) { run.finish(status, { note: 'pre-freeze harness check; evaluator not run (§2.5)' }); console.log(JSON.stringify({ run_dir: run.dir, status })); return; }
  const out = evaluate(run.dir);
  run.finish(status, { eval_summary: out.summary });
  console.log(JSON.stringify({ run_dir: run.dir, status, summary: out.summary }, null, 2));
}

/** Control phases: every token signed with the active key must be accepted; user traffic must succeed. */
export function checkControl(dir, ph) {
  const ticks = readJsonl(path.join(dir, 'ticks.jsonl')).filter((x) => x.ph === ph);
  const peps = readJsonl(path.join(dir, 'pep-probe.jsonl')).filter((x) => x.ph === ph);
  const users = readJsonl(path.join(dir, 'user.jsonl')).filter((x) => x.ph === ph);
  const rejects = ticks.reduce((n, t) => n + Object.values(t.r).filter((x) => x !== 'A').length, 0);
  const pepBad = peps.filter((x) => x.status !== 200).length;
  const userBad = users.filter((x) => !(x.status >= 200 && x.status < 300)).length;
  return { ticks: ticks.length, verifications: ticks.reduce((n, t) => n + Object.keys(t.r).length, 0), rejects, pep: peps.length, pep_bad: pepBad, user: users.length, user_bad: userBad, failures: rejects + pepBad + userBad + (ticks.length && peps.length && users.length ? 0 : 1) };
}

// ------------------------------------------------------------------------------------------------
export function evaluate(dir) {
  const P = JSON.parse(fs.readFileSync(path.join(path.dirname(SELF), 'params', 'TC-014.json'), 'utf8'));
  const ticks = readJsonl(path.join(dir, 'ticks.jsonl'));
  const peps = readJsonl(path.join(dir, 'pep-probe.jsonl'));
  const users = readJsonl(path.join(dir, 'user.jsonl'));
  const evs = readJsonl(path.join(dir, 'events.jsonl'));
  const pepEnf = pepLog(dir);
  const ok2xx = (s) => s >= 200 && s < 300;
  // ---- emergency ----
  const decl = evs.filter((e) => e.ev === 'declare');
  const epochs = Object.fromEntries(evs.filter((e) => e.ev === 'epoch_applied').map((e) => [e.rep, e.at]));
  const emergency = [];
  let oldAfterEpoch = 0;
  const lat = { push: [], nopush: [], pep: [] };
  for (const d of decl) {
    const rt = ticks.filter((t) => t.ph === 'emergency' && t.rep === d.rep);
    const names = [...new Set(rt.flatMap((t) => Object.keys(t.r)))];
    const per = {};
    for (const id of names) {
      const after = rt.filter((t) => t.ts >= d.at && t.r[id]);
      const acc = after.filter((t) => t.r[id] === 'A');
      const lastA = acc.length ? Math.max(...acc.map((t) => t.ts)) - d.at : 0;
      const firstR = after.find((t) => t.r[id] !== 'A');
      const push = /-push\|/.test(id);
      const violations = push && epochs[d.rep] ? rt.filter((t) => t.ts > epochs[d.rep] && t.r[id] === 'A').length : 0;
      oldAfterEpoch += violations;
      per[id] = { last_accept_after_decl_ms: lastA, first_reject_ms: firstR ? firstR.ts - d.at : null, reject_code: firstR ? firstR.r[id] : null, accepted_after_epoch: violations, never_rejected: !firstR };
      (push ? lat.push : lat.nopush).push(lastA);
    }
    if (d.kind === 'at') {
      const rp = peps.filter((x) => x.ph === 'emergency' && x.rep === d.rep);
      const after = rp.filter((x) => x.ts >= d.at);
      const acc = after.filter((x) => x.status === 200);
      const lastA = acc.length ? Math.max(...acc.map((x) => x.ts)) - d.at : 0;
      // epoch applied at the real PEP = its first kid_revoked rejection for this kid
      const firstRevoked = pepEnf.find((x) => Date.parse(x.t) >= d.at && /kid_revoked/.test(x.detail || '') && (x.verify_detail || '').includes(d.kid));
      const tApplied = firstRevoked ? Date.parse(firstRevoked.t) : null;
      const viol = tApplied ? rp.filter((x) => x.ts > tApplied && x.status === 200).length : 0;
      oldAfterEpoch += viol;
      per['pep|old'] = { last_accept_after_decl_ms: lastA, first_reject_ms: after.find((x) => x.status !== 200) ? after.find((x) => x.status !== 200).ts - d.at : null, epoch_applied_ms: tApplied ? tApplied - d.at : null, accepted_after_epoch: viol };
      lat.pep.push(lastA);
    }
    emergency.push({ rep: d.rep, kind: d.kind, kid: d.kid, epoch_applied_ms: epochs[d.rep] ? epochs[d.rep] - d.at : null, verification_points: per });
  }
  const stats = (arr) => { const s = [...arr].sort((x, y) => x - y); return { n: s.length, p50: quantile(s, 0.5), p99: quantile(s, 0.99), max: s.length ? s[s.length - 1] : null }; };
  // ---- planned rotation ----
  const rotT = ticks.filter((t) => t.ph === 'rotation');
  const rotFail = rotT.reduce((n, t) => n + Object.values(t.r).filter((x) => x !== 'A').length, 0);
  const rotPep = peps.filter((x) => x.ph === 'rotation');
  const rotUser = users.filter((x) => x.ph === 'rotation');
  const rotFailures = rotFail + rotPep.filter((x) => x.status !== 200).length + rotUser.filter((x) => !ok2xx(x.status)).length;
  const cycles = evs.filter((e) => e.ev === 'cycle_activated');
  const removals = evs.filter((e) => e.ev === 'key_op' && e.op === 'remove');
  // ---- retain ----
  const attempts = evs.filter((e) => e.ev === 'attempt');
  const retainAttempts = attempts.filter((e) => /^remove_retain/.test(e.what));
  const retainNotBlocked = retainAttempts.filter((e) => e.status === 200).length;
  const mistaken = attempts.find((e) => e.what === 'mistaken_removal');
  const mrT = ticks.filter((t) => t.ph === 'mistaken_removal');
  const mrInflight = mrT.flatMap((t) => Object.entries(t.r).filter(([k]) => k.endsWith('|inflight')).map(([k, v]) => ({ k, v, ts: t.ts })));
  const mrPep = peps.filter((x) => x.ph === 'mistaken_removal');
  const alarmsDir = path.join(dir, 'pep');
  const alarmFiles = fs.existsSync(alarmsDir) ? fs.readdirSync(alarmsDir).filter((f) => f.endsWith('-alarms.jsonl')) : [];
  // ---- fake JWKS ----
  const fakePh = [...new Set(ticks.filter((t) => /^fake:/.test(t.ph)).map((t) => t.ph))];
  const fake = {};
  let fakeAccepted = 0;
  for (const ph of fakePh) {
    const ft = ticks.filter((t) => t.ph === ph);
    const res = {};
    for (const t of ft) for (const [k, v] of Object.entries(t.r)) {
      const [vn, tok] = k.split('|');
      const grp = vn.startsWith('ctl-') ? 'control_unpinned' : 'pinned';
      const key = `${grp}:${tok}`;
      res[key] ||= { n: 0, accepted: 0, codes: {} };
      res[key].n++;
      if (v === 'A') res[key].accepted++; else res[key].codes[v] = (res[key].codes[v] || 0) + 1;
    }
    const pp = peps.filter((x) => x.ph === ph);
    if (pp.length) res['real_pep:fake'] = { n: pp.length, accepted: pp.filter((x) => x.status === 200).length, statuses: pp.reduce((o, x) => { o[x.status] = (o[x.status] || 0) + 1; return o; }, {}) };
    fakeAccepted += (res['pinned:fake']?.accepted || 0) + (res['real_pep:fake']?.accepted || 0);
    fake[ph] = res;
  }
  // ---- outage ----
  const outT = ticks.filter((t) => t.ph === 'outage');
  const revokeAt = evs.find((e) => e.ev === 'outage_revoke_previous')?.at;
  const outage = {};
  for (const t of outT) for (const [k, v] of Object.entries(t.r)) {
    const [vn, tok] = k.split('|');
    const grp = `${/-push$/.test(vn) ? 'push' : 'nopush'}:${tok}:${revokeAt && t.ts > revokeAt ? 'after_revoke' : 'before_revoke'}`;
    outage[grp] ||= { n: 0, accepted: 0, codes: {} };
    outage[grp].n++;
    if (v === 'A') outage[grp].accepted++; else outage[grp].codes[v] = (outage[grp].codes[v] || 0) + 1;
  }
  const outUser = users.filter((x) => x.ph === 'outage');
  // ---- hard limit ----
  const hlUser = users.filter((x) => x.ph === 'hardlimit');
  const hlPep = peps.filter((x) => x.ph === 'hardlimit');
  const hlT = ticks.filter((t) => t.ph === 'hardlimit');
  let keyEvents = [];
  for (const store of ['at', 'txn']) {
    const f = path.join(dir, `final-keys-${store}.json`);
    if (fs.existsSync(f)) keyEvents = keyEvents.concat((JSON.parse(fs.readFileSync(f, 'utf8')).events || []).map((e) => ({ store, ...e })));
  }
  const hlEvents = keyEvents.filter((e) => /^hard_limit/.test(e.op));
  const issuanceErrors = hlUser.filter((x) => !ok2xx(x.status)).length;
  const checks = {
    old_kid_accepted_after_epoch_applied: { value: oldAfterEpoch, threshold: 0, pass: decl.length ? oldAfterEpoch === 0 : null },
    verification_failures_during_planned_rotation: { value: rotFailures, threshold: 0, pass: cycles.length ? rotFailures === 0 : null, cycles_completed: cycles.length / 2, verifications: rotT.reduce((n, t) => n + Object.keys(t.r).length, 0) + rotPep.length + rotUser.length },
    retain_key_removal_not_blocked: { value: retainNotBlocked, threshold: 0, pass: retainAttempts.length ? retainNotBlocked === 0 : null, attempts: retainAttempts.length },
    fake_jwks_accepted: { value: fakeAccepted, threshold: 0, pass: fakePh.length ? fakeAccepted === 0 : null },
    issuance_errors_at_key_age_hard_limit: { value: issuanceErrors, threshold: 0, pass: hlUser.length ? issuanceErrors === 0 && hlEvents.length > 0 : null, hard_limit_events: hlEvents.map((e) => `${e.store}:${e.op}`) },
  };
  const evald = Object.values(checks).filter((c) => c.pass !== null);
  const summary = {
    checks,
    emergency_latency_ms: { push_verifiers: stats(lat.push), nopush_verifiers: stats(lat.nopush), real_pep: stats(lat.pep) },
    emergency_user_failures: users.filter((x) => x.ph === 'emergency' && !ok2xx(x.status)).length,
    mistaken_removal: mistaken ? { removal_status: mistaken.status, inflight_verifications: mrInflight.length, inflight_rejected: mrInflight.filter((x) => x.v !== 'A').length, pep_inflight_rejected: mrPep.filter((x) => x.status !== 200).length, detection_alarm_files: alarmFiles.length, detected: false } : null,
    other_removal_attempts: attempts.filter((e) => !/^remove_retain/.test(e.what)).map((e) => ({ what: e.what, status: e.status })),
    outage_user_failures: outUser.filter((x) => !ok2xx(x.status)).length,
    hardlimit: { user: hlUser.length, pep_failures: hlPep.filter((x) => x.status !== 200).length, verifier_rejects: hlT.reduce((n, t) => n + Object.values(t.r).filter((x) => x !== 'A').length, 0) },
    removals: removals.map((e) => ({ store: e.store, status: e.status })).reduce((o, e) => { o[`${e.store}:${e.status}`] = (o[`${e.store}:${e.status}`] || 0) + 1; return o; }, {}),
    verdict: evald.length < Object.keys(checks).length ? 'incomplete' : evald.every((c) => c.pass) ? 'pass' : 'fail',
  };
  return writeEval(dir, { tc: TC, evaluatorFile: SELF, summary, emergency, fake_jwks: fake, outage });
}

if (path.resolve(process.argv[1] || '') === SELF) {
  if (a.freeze) {
    const m = freeze(TC, a.reason || 'initial freeze');
    console.log(JSON.stringify({ tc: TC, version: m.ver ?? m.version, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at }));
  } else if (a.eval) {
    console.log(JSON.stringify(evaluate(a.eval).summary, null, 2));
  } else {
    await measure({ prefreeze: !!a.prefreeze, phases: a.phases ? String(a.phases).split(',') : null });
  }
}
