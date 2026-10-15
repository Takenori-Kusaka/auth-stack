// TC-020 回復・認証器・step-up の鮮度（preregistered-test-plan.md §4.20）
//   node tests/engine-swap-perf-audit/TC-020.js [--harness-check]
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { introspect } from '../../lib/oauth-client.js';
import { openRun, groupPortBase, writeEval, sleep, HARNESS_CHECK } from './common.js';
import { Recovery } from './lib/recovery.js';
import { makeCliCaller } from './lib/cli.js';

const TC = 'TC-020';
const { run, params } = openRun(TC, { seed: 20 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const P = params.parameters;
let status = 'completed';
const evalOut = { tc: TC, scenarios: {} };
const SC = evalOut.scenarios;
let s = null;
const ok2xx = (x) => x >= 200 && x < 300;

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: groupPortBase(TC) });
  let notifyFail = false;
  const rc = new Recovery({ s, waitMs: P.wait_ms, restrictMs: P.restrict_ms, newAddressQuarantineMs: P.new_address_quarantine_ms, maxAgeMs: P.max_age_ms, notifier: () => !notifyFail });
  const T1 = ds.tenants[0];
  const users = ds.users.filter((u) => u.memberships.length === 1 && u.memberships[0].tid === T1.id);
  let ui = 0; const nextUser = () => users[ui++].id;
  const edgeAuth = { type: 'private_key_jwt', clientId: s.topo.clients.edge.clientId, privateJwkFile: s.topo.clients.edge.privateJwkFile };
  const intro = (tok) => introspect(s.asMeta, tok, { auth: edgeAuth, tls: s.tls });
  // ---------------- R1 three choices ----------------
  {
    const r = {};
    const u1 = nextUser(); const { codes } = rc.createAccount(u1);
    r.only_one_stored = rc.startRecovery(u1, { stored: [codes[0]] });
    r.two_stored_same_method = rc.startRecovery(u1, { stored: codes });
    const u2 = nextUser(); rc.createAccount(u2, { proofed: false });
    r.reproof_unproofed = rc.startRecovery(u2, { reproofed: true });
    const u3 = nextUser(); rc.createAccount(u3, { notify: ['addr-1'] });
    const ic3 = rc.issueCode(u3, 'addr-1');
    const a3 = rc.accounts.get(u3); const pw3 = [...a3.authenticators.values()].find((x) => x.type === 'password').id;
    r.notify_only_destination = rc.startRecovery(u3, { issued: [ic3.code], authenticator: pw3 });
    // positives
    const p1 = nextUser(); const c1 = rc.createAccount(p1);
    const pa = rc.startRecovery(p1, { stored: [c1.codes[0]], issued: [rc.issueCode(p1, 'addr-1').code] });
    const p2 = nextUser(); rc.createAccount(p2);
    const pw2 = [...rc.accounts.get(p2).authenticators.values()].find((x) => x.type === 'password').id;
    const pb = rc.startRecovery(p2, { issued: [rc.issueCode(p2, 'addr-2').code], authenticator: pw2 });
    const p3 = nextUser(); rc.createAccount(p3, { proofed: true });
    const pc = rc.startRecovery(p3, { reproofed: true });
    r.positive = { a: pa.ok, b: pb.ok, c: pc.ok };
    SC.R1 = r;
    if (!(pa.ok && pb.ok && pc.ok)) { const e = new Error(`positive control R1 ${JSON.stringify(r.positive)}`); e.abort = 'C-3'; throw e; }
  }
  log('R1 done');
  // ---------------- R2 cancel ----------------
  async function cancelScenario(stage) {
    const u = nextUser(); const { codes } = rc.createAccount(u);
    const cli = await s.loginCli({ sub: u, tid: T1.id });
    const call = makeCliCaller(s, cli);
    const f = ds.files.find((x) => x.tid === T1.id && x.owner === u)?.id || ds.files.find((x) => x.tid === T1.id).id;
    const before = (await call('GET', `/t/${T1.id}/files/${f}`)).status;
    const st = rc.startRecovery(u, { stored: [codes[0]], issued: [rc.issueCode(u, 'addr-1').code] });
    let newAuth = null;
    if (stage === 'restricted') { await sleep(P.wait_ms + 100); const c = await rc.complete(st.case); newAuth = c.newAuth; }
    const d = await rc.deny(st.case, 'notify-1');
    const tCancel = Date.now();
    let tDenied = null;
    for (let i = 0; i < 100; i++) { const x = (await call('GET', `/t/${T1.id}/files/${f}`)).status; if (!ok2xx(x) && x !== 404) { tDenied = Date.now(); break; } await sleep(P.probe_interval_ms); }
    const afterComplete = await rc.complete(st.case);
    const authNew = newAuth ? rc.authenticate(u, newAuth) : { ok: false, why: 'none' };
    let login; try { login = (await s.login({ sub: u, tid: T1.id })).ok; } catch { login = false; }
    const refresh = (await cli.refresh()).status;
    return { stage, started: st.ok, cancelled: d.ok, before_status: before, ms_cancel_to_session_denied: tDenied ? tDenied - tCancel : null, complete_after_cancel: afterComplete.ok, auth_with_recovered_authenticator: authNew.ok, login_after_cancel: !!login, refresh_after_cancel: refresh, account_state: rc.accounts.get(u).state };
  }
  SC.R2 = { waiting: await cancelScenario('waiting'), restricted: await cancelScenario('restricted') };
  log('R2 done');
  // ---------------- R3 helpdesk ----------------
  rc.helpdesk.add('hd-1');
  SC.R3 = Object.fromEntries(['reset_authenticator', 'transfer_authenticator', 'proxy_register', 'read_recovery_codes', 'change_notification_target', 'shorten_waiting', 'release_sec_hold'].map((op) => [op, rc.helpdeskOp('hd-1', op).ok]));
  // ---------------- R4 admin recovery approvals ----------------
  {
    const adm = nextUser(); const { codes } = rc.createAccount(adm, { admin: true, storedCodes: 6 });
    const ev = () => ({ stored: [codes.shift()], issued: [rc.issueCode(adm, 'addr-1').code] });
    const r = {};
    r.single_approval = rc.startRecovery(adm, ev(), { approvals: [{ id: 'ta-1', kind: 'tenant_admin' }], requester: adm }).ok;
    r.requester_is_approver = rc.startRecovery(adm, ev(), { approvals: [{ id: adm, kind: 'tenant_admin' }, { id: 'ta-2', kind: 'tenant_admin' }], requester: adm }).ok;
    r.helpdesk_approver = rc.startRecovery(adm, ev(), { approvals: [{ id: 'hd-1', kind: 'tenant_admin' }, { id: 'ta-2', kind: 'tenant_admin' }], requester: adm }).ok;
    r.provider_staff_approver = rc.startRecovery(adm, ev(), { approvals: [{ id: 'st-1', kind: 'provider_staff' }, { id: 'ta-2', kind: 'tenant_admin' }], requester: adm }).ok;
    r.positive_two_tenant_admins = rc.startRecovery(adm, ev(), { approvals: [{ id: 'ta-1', kind: 'tenant_admin' }, { id: 'ta-2', kind: 'tenant_admin' }], requester: adm }).ok;
    SC.R4 = r;
  }
  // ---------------- R5 authenticators ----------------
  {
    const r = {};
    const u = nextUser(); rc.createAccount(u, { authenticators: [{ type: 'passkey' }, { type: 'totp' }] });
    const a = rc.accounts.get(u);
    const pk = [...a.authenticators.values()].find((x) => x.type === 'passkey').id, tt = [...a.authenticators.values()].find((x) => x.type === 'totp').id;
    r.pr_account_add_with_totp = rc.addAuthenticator(u, { usingAuth: tt, newType: 'passkey' }).ok;
    r.pr_account_add_with_passkey = rc.addAuthenticator(u, { usingAuth: pk, newType: 'passkey' }).ok; // positive
    notifyFail = true;
    r.add_with_notification_failure = rc.addAuthenticator(u, { usingAuth: pk, newType: 'passkey' }).ok;
    notifyFail = false;
    const v = nextUser(); rc.createAccount(v, { authenticators: [{ type: 'password' }, { type: 'totp' }] });
    const b = rc.accounts.get(v);
    const pw = [...b.authenticators.values()].find((x) => x.type === 'password').id, t2 = [...b.authenticators.values()].find((x) => x.type === 'totp').id;
    r.add_passkey_with_password_lower_aal = rc.addAuthenticator(v, { usingAuth: pw, newType: 'passkey' }).ok;
    r.add_passkey_with_totp = rc.addAuthenticator(v, { usingAuth: t2, newType: 'passkey' }).ok; // positive (min(2,3)=2)
    const w = nextUser(); rc.createAccount(w, { authenticators: [{ type: 'passkey' }] });
    const only = [...rc.accounts.get(w).authenticators.values()][0].id;
    r.remove_last = rc.removeAuthenticator(w, only, { authTime: Date.now() }).ok;
    SC.R5 = r;
  }
  // ---------------- R6 new recovery address quarantine ----------------
  {
    const u = nextUser(); rc.createAccount(u);
    rc.addAddress(u, 'addr-new');
    const early = rc.issueCode(u, 'addr-new');
    await sleep(P.new_address_quarantine_ms + 200);
    const late = rc.issueCode(u, 'addr-new');
    SC.R6 = { used_within_quarantine: early.ok, used_after_quarantine: late.ok };
  }
  log('R3-R6 done');
  // ---------------- F1 step-up freshness via the AS ----------------
  {
    const tool = ds.tools.find((t) => t.tid === T1.id);
    const owner = ds.projects.find((p) => p.id === tool.project).owner;
    const l2 = await s.loginCli({ sub: owner, tid: T1.id, amr: 'pwd,otp' });
    const i0 = await intro(l2.tokens.access_token);
    const cfgL2 = (await makeCliCaller(s, l2)('PUT', `/t/${T1.id}/tools/${tool.id}/config`, { config: { f1: 1 } })).status;
    await sleep(1100);
    const pr = await s.loginCli({ sub: owner, tid: T1.id, amr: 'fido' });
    const i1 = await intro(pr.tokens.access_token);
    const cfgPr = (await makeCliCaller(s, pr)('PUT', `/t/${T1.id}/tools/${tool.id}/config`, { config: { f1: 2 } })).status;
    await sleep(1100);
    const rf = await l2.refresh();
    const i2 = rf.status === 200 ? await intro(rf.body.access_token) : null;
    const cfgRefreshed = rf.status === 200 ? (await makeCliCaller(s, { tokens: rf.body, key: l2.key })('PUT', `/t/${T1.id}/tools/${tool.id}/config`, { config: { f1: 3 } })).status : null;
    SC.F1 = { l2_acr: i0.acr, l2_auth_time: i0.auth_time, l2_config_status: cfgL2, stepup_acr: i1.acr, stepup_auth_time: i1.auth_time, stepup_config_status: cfgPr, refreshed_status: rf.status, refreshed_acr: i2?.acr, refreshed_auth_time: i2?.auth_time, refreshed_config_status: cfgRefreshed };
  }
  // ---------------- F2 max_age for +SEC ----------------
  {
    const u = nextUser(); rc.createAccount(u, { authenticators: [{ type: 'passkey' }, { type: 'totp' }] });
    const cli = await s.loginCli({ sub: u, tid: T1.id, amr: 'fido' });
    const a0 = (await intro(cli.tokens.access_token)).auth_time * 1000;
    const totp = [...rc.accounts.get(u).authenticators.values()].find((x) => x.type === 'totp').id;
    await sleep(P.max_age_ms + 500);
    const stale = rc.removeAuthenticator(u, totp, { authTime: a0 });
    const rf = await cli.refresh();
    const aR = rf.status === 200 ? (await intro(rf.body.access_token)).auth_time * 1000 : null;
    const viaRefresh = rc.removeAuthenticator(u, totp, { authTime: aR ?? undefined });
    const fresh = await s.loginCli({ sub: u, tid: T1.id, amr: 'fido' });
    const aF = (await intro(fresh.tokens.access_token)).auth_time * 1000;
    const viaFresh = rc.removeAuthenticator(u, totp, { authTime: aF });
    SC.F2 = { stale_ok: stale.ok, stale_why: stale.why, refreshed_auth_time_changed: aR !== a0, via_refresh_ok: viaRefresh.ok, fresh_ok: viaFresh.ok };
  }
  log('F done');
  await sleep(300);
  await s.stop(); s = null;
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  // ---------------- evaluation ----------------
  const R1 = SC.R1, R2 = SC.R2, R4 = SC.R4, R5 = SC.R5, F1 = SC.F1, F2 = SC.F2;
  const irregular = [R1.only_one_stored.ok, R1.two_stored_same_method.ok, R1.reproof_unproofed.ok, R1.notify_only_destination.ok, R4.single_approval, R4.requester_is_approver, R4.helpdesk_approver, R4.provider_staff_approver, SC.R6.used_within_quarantine].filter(Boolean).length;
  const afterCancel = [R2.waiting, R2.restricted].reduce((n, x) => n + (x.complete_after_cancel ? 1 : 0) + (x.auth_with_recovered_authenticator ? 1 : 0) + (x.login_after_cancel ? 1 : 0) + (x.refresh_after_cancel === 200 ? 1 : 0), 0);
  const helpdesk = Object.values(SC.R3).filter(Boolean).length;
  const fallbacks = [R5.pr_account_add_with_totp, R5.add_with_notification_failure, R5.add_passkey_with_password_lower_aal, R5.remove_last].filter(Boolean).length;
  const freshDev = [F1.l2_acr !== 'L2', F1.l2_config_status !== 401, F1.stepup_acr !== 'L2-PR', !(F1.stepup_auth_time > F1.l2_auth_time), F1.stepup_config_status !== 200, F1.refreshed_status === 200 && (F1.refreshed_acr !== F1.l2_acr || F1.refreshed_auth_time !== F1.l2_auth_time), F1.refreshed_config_status === 200, F2.stale_ok, F2.via_refresh_ok, F2.refreshed_auth_time_changed, !F2.fresh_ok].filter(Boolean).length;
  const crit = {
    irregular_recovery_success: { value: irregular, pass: irregular === 0 && R4.positive_two_tenant_admins && SC.R6.used_after_quarantine },
    auth_with_cancelled_recovery: { value: afterCancel, pass: afterCancel === 0 && R2.waiting.cancelled && R2.restricted.cancelled },
    helpdesk_changes: { value: helpdesk, pass: helpdesk === 0 },
    fallbacks: { value: fallbacks, pass: fallbacks === 0 && R5.pr_account_add_with_passkey && R5.add_passkey_with_totp },
    freshness_rule_deviations: { value: freshDev, pass: freshDev === 0 },
  };
  Object.assign(evalOut, { criteria: crit, verdict: Object.values(crit).every((c) => c.pass) ? '合格' : '不合格', recorded: { ms_cancel_to_session_denied: { waiting: R2.waiting.ms_cancel_to_session_denied, restricted: R2.restricted.ms_cancel_to_session_denied } }, not_covered: params.not_covered });
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  if (e.harnessCheck) status = 'harness-check';
  else { status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error'; evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack }; evalOut.verdict = '中止'; console.error(e.stack); }
} finally {
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, []); else run.writeJson('harness-check.json', { scenarios_completed: Object.keys(SC), abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
