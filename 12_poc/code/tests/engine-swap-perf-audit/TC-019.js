// TC-019 federation・linking・SCIM・IdP 停止（OIDC の範囲）（preregistered-test-plan.md §4.19）
//   node tests/engine-swap-perf-audit/TC-019.js [--harness-check]
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { request } from '../../lib/http.js';
import { openRun, groupPortBase, writeEval, sleep, HARNESS_CHECK } from './common.js';
import { IdpMock, Broker, ScimReceiver } from './lib/federation.js';
import { makeCliCaller } from './lib/cli.js';

const TC = 'TC-019';
const { run, params } = openRun(TC, { seed: 19 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
const P = params.parameters;
const base = groupPortBase(TC);
let status = 'completed';
const evalOut = { tc: TC, scenarios: {} };
const SC = evalOut.scenarios;
let s = null, idp1 = null, idp2 = null, scim = null;
const ok2xx = (x) => x >= 200 && x < 300;

try {
  s = await startStack({ tc: TC, run, engine: params.engine, dataset: ds, portBase: base });
  const [T1, T2] = ds.tenants;
  idp1 = await new IdpMock({ name: 'idp1', port: base + 14 }).start();
  idp2 = await new IdpMock({ name: 'idp2', port: base + 15 }).start();
  const asUser = (sub, tid, status = 'active') => s.req(`${s.topo.urls.asA}/admin/user-status`, { body: { sub, status, memberships: [{ tid, kind: 'member', status: 'active' }] } });
  scim = await new ScimReceiver({
    s, port: base + 16, credentials: new Map([['scim-cred-t1', T1.id], ['scim-cred-t2', T2.id]]),
    onCreate: async (u) => { await asUser(u.id, u.tid); await s.writeTuples(u.tid, { writes: [{ resource: { type: 'core/tenant', id: u.tid }, relation: 'member', subject: { type: 'core/user', id: u.id } }], on_duplicate: 'ignore' }); },
    onDeactivate: async (u) => { await asUser(u.id, u.tid, 'suspended'); await s.setStatus('subject', u.id, 'suspended'); await s.revoke('sub', u.id, { reason: 'scim_active_false' }); await s.req(`${s.topo.urls.asA}/admin/revoke-account-grants`, { body: { sub: u.id, reason: 'scim_active_false' } }); },
  }).start();
  const broker = new Broker({ s, maxAgeMs: P.protected_op_max_age_ms });
  broker.setupIdp(T1.id, idp1); broker.setupIdp(T2.id, idp2);
  const V = ds.files.find((f) => f.tid === T1.id && ds.users.find((u) => u.id === f.owner).memberships.length === 1);
  const victim = V.owner;
  broker.link(T1.id, idp1.issuer, 'upstream-victim', victim);
  const victimEmail = 'victim@corp.example', victimUser = 'victim.user';
  const platformLogin = async (sub, tid) => { try { const u = await s.login({ sub, tid }); return u; } catch (e) { return { ok: false, status: e.message.slice(0, 60) }; } };
  // positive control: the victim logs in through IdP-1 and reads the file
  const pc = await broker.login(T1.id, idp1, { sub: 'upstream-victim', email: victimEmail, preferred_username: victimUser });
  const pcs = pc.ok ? await platformLogin(pc.platform_sub, T1.id) : { ok: false };
  const pcr = pcs.ok ? (await pcs.call('GET', `/t/${T1.id}/files/${V.id}`)).status : 0;
  if (!(pc.ok && pc.platform_sub === victim && pcr === 200)) { const e = new Error(`positive control ${JSON.stringify({ pc, pcr })}`); e.abort = 'C-3'; throw e; }
  // ---------------- F1 nOAuth ----------------
  {
    const a = await broker.login(T2.id, idp2, { sub: 'attacker-sub', email: victimEmail, preferred_username: victimUser }, { scim });
    let reads = [];
    if (a.ok) { const ses = await platformLogin(a.platform_sub, T2.id); reads = ses.ok ? [(await ses.call('GET', `/t/${T1.id}/files/${V.id}`)).status, (await ses.call('GET', `/t/${T2.id}/files/${V.id}`)).status] : []; }
    const intoT1 = await broker.login(T1.id, idp2, { sub: 'attacker-sub', email: victimEmail, preferred_username: victimUser });
    SC.F1 = { login_ok: a.ok, linked_to_victim: a.platform_sub === victim, created_new: a.created, victim_file_reads: reads, attacker_idp_into_victim_tenant: intoT1.ok, why: intoT1.why };
  }
  // ---------------- F2 add IdP (protected) + username collision ----------------
  {
    const noReauth = broker.addIdp(T1.id, idp2, { reauth: false, at: Date.now() });
    const stale = broker.addIdp(T1.id, idp2, { reauth: true, at: Date.now() - P.protected_op_max_age_ms - 1000 });
    const nAud0 = broker.audit.length, nNot0 = broker.notifications.length;
    const ok = broker.addIdp(T1.id, idp2, { reauth: true, at: Date.now() });
    const recorded = broker.audit.length > nAud0 && broker.notifications.length > nNot0;
    const col = await broker.login(T1.id, idp2, { sub: 'other-person', email: victimEmail, preferred_username: victimUser }, { scim });
    SC.F2 = { add_without_reauth: noReauth.ok, add_with_stale_reauth: stale.ok, add_with_reauth: ok.ok, protected_op_recorded: recorded, username_collision_linked_to_victim: col.platform_sub === victim, collision_created_new: col.created };
  }
  // ---------------- F3 re-link ----------------
  {
    const no = broker.relink(victim, T1.id, idp2.issuer, 'attacker-relink', { reauth: false, at: Date.now() });
    const tryLogin = await broker.login(T1.id, idp2, { sub: 'attacker-relink', email: 'x@x' }, { scim });
    const nAud0 = broker.audit.length, nNot0 = broker.notifications.length;
    const yes = broker.relink(victim, T1.id, idp2.issuer, 'victim-new-idp', { reauth: true, at: Date.now() });
    const recorded = broker.audit.length > nAud0 && broker.notifications.some((n) => n.what === 'idp_relinked');
    const after = await broker.login(T1.id, idp2, { sub: 'victim-new-idp' });
    SC.F3 = { relink_without_protected_op: no.ok, unprotected_attempt_login_maps_to_victim: tryLogin.platform_sub === victim, relink_with_protected_op: yes.ok, protected_op_recorded: recorded, victim_via_new_idp: after.platform_sub === victim };
  }
  // ---------------- F4 linking rule ----------------
  {
    const email = broker.changeLinkingRule(T1.id, { match_on: 'email' }, { reauth: true, at: Date.now() });
    const noReauth = broker.changeLinkingRule(T1.id, { match_on: 'sub', jit: false }, { reauth: false, at: Date.now() });
    const ok = broker.changeLinkingRule(T1.id, { match_on: 'sub', jit: false }, { reauth: true, at: Date.now() });
    SC.F4 = { email_rule_enabled: email.ok, email_why: email.why, change_without_reauth: noReauth.ok, change_with_reauth: ok.ok, notified: broker.notifications.some((n) => n.what === 'linking_rule_changed') };
  }
  log('F done');
  // ---------------- S1 SCIM concurrency ----------------
  const scimReq = (cred, method, p, body, headers = {}) => request(`http://127.0.0.1:${base + 16}${p}`, { method, body, headers: { authorization: `Bearer ${cred}`, ...headers } });
  {
    const posts = await Promise.all(Array.from({ length: P.concurrent_posts }, (_, i) => scimReq('scim-cred-t1', 'POST', '/scim/v2/Users', { externalId: 'ext-dup-1', 'urn:poc:federation': { iss: idp1.issuer, sub: `dup-sub-${i}` } })));
    const created = posts.filter((r) => r.status === 201).length;
    // JIT and SCIM arriving together for the same triple
    const [jit, sc] = await Promise.all([broker.login(T1.id, idp1, { sub: 'race-sub' }, { scim }), scimReq('scim-cred-t1', 'POST', '/scim/v2/Users', { externalId: 'ext-race', 'urn:poc:federation': { iss: idp1.issuer, sub: 'race-sub' } })]);
    const raceAccounts = [...scim.users.values()].filter((u) => u.triple === `${T1.id}|${idp1.issuer}|race-sub`).length;
    // concurrent PATCH with the same If-Match
    const target = JSON.parse(posts.find((r) => r.status === 201).text);
    const etag = target.meta.version;
    const patches = await Promise.all(Array.from({ length: P.concurrent_patches }, () => scimReq('scim-cred-t1', 'PATCH', `/scim/v2/Users/${target.id}`, { Operations: [{ op: 'replace', path: 'displayName', value: 'x' }] }, { 'if-match': etag })));
    const noIfMatch = await Promise.all([1, 2].map(() => scimReq('scim-cred-t1', 'PATCH', `/scim/v2/Users/${target.id}`, { Operations: [{ op: 'replace', path: 'displayName', value: 'y' }] })));
    const perTriple = new Map(), perExt = new Map();
    for (const u of scim.users.values()) { perTriple.set(u.triple, (perTriple.get(u.triple) || 0) + 1); if (u.externalId) perExt.set(`${u.tid}|${u.externalId}`, (perExt.get(`${u.tid}|${u.externalId}`) || 0) + 1); }
    SC.S1 = { concurrent_posts_created: created, concurrent_posts_409: posts.filter((r) => r.status === 409).length, jit_scim_race_accounts: raceAccounts, jit_ok: jit.ok, scim_race_status: sc.status, patches_200: patches.filter((r) => r.status === 200).length, patches_412: patches.filter((r) => r.status === 412).length, no_if_match_statuses: noIfMatch.map((r) => r.status), duplicate_accounts: [...perTriple.values(), ...perExt.values()].filter((n) => n > 1).length };
  }
  // ---------------- S2 cross tenant ----------------
  {
    const t1User = [...scim.users.values()].find((u) => u.tid === T1.id);
    const w0 = scim.writes.length;
    const r = {
      get_other_tenant_id: (await scimReq('scim-cred-t2', 'GET', `/scim/v2/Users/${t1User.id}`)).status,
      patch_other_tenant_id: (await scimReq('scim-cred-t2', 'PATCH', `/scim/v2/Users/${t1User.id}`, { Operations: [{ op: 'replace', path: 'active', value: false }] })).status,
      post_body_other_tenant: (await scimReq('scim-cred-t2', 'POST', '/scim/v2/Users', { tenant_id: T1.id, externalId: 'x-t', 'urn:poc:federation': { iss: idp2.issuer, sub: 'x-t' } })).status,
      tenant_header_mismatch: (await scimReq('scim-cred-t2', 'GET', `/scim/v2/Users/${t1User.id}`, undefined, { 'x-tenant-id': T1.id })).status,
    };
    r.cross_tenant_writes = scim.writes.filter((w) => scim.users.get(w.id)?.tid !== w.tid).length; // every write in the run (w0 marks the start of S2)
    r.writes_during_s2 = scim.writes.length - w0;
    r.t1_user_still_active = scim.users.get(t1User.id).active;
    SC.S2 = r;
  }
  log('S done');
  // ---------------- S3 active=false ----------------
  {
    const cr = await scimReq('scim-cred-t1', 'POST', '/scim/v2/Users', { externalId: 'ext-leaver', 'urn:poc:federation': { iss: idp1.issuer, sub: 'leaver-sub' } });
    const u = JSON.parse(cr.text);
    const f = ds.files.find((x) => x.tid === T1.id).id;
    await s.writeTuples(T1.id, { writes: [{ resource: { type: 'files/file', id: f }, relation: 'viewer', subject: { type: 'core/user', id: u.id } }], on_duplicate: 'ignore' });
    const bff = await platformLogin(u.id, T1.id);
    const cli = await s.loginCli({ sub: u.id, tid: T1.id });
    const call = makeCliCaller(s, cli);
    const before = [(await bff.call('GET', `/t/${T1.id}/files/${f}`)).status, (await call('GET', `/t/${T1.id}/files/${f}`)).status];
    const t0 = Date.now();
    const p = await scimReq('scim-cred-t1', 'PATCH', `/scim/v2/Users/${u.id}`, { Operations: [{ op: 'replace', path: 'active', value: false }] }, { 'if-match': u.meta.version });
    const tPatch = Date.now();
    let tAll = null;
    for (let i = 0; i < 100; i++) { const a = (await bff.call('GET', `/t/${T1.id}/files/${f}`)).status, b = (await call('GET', `/t/${T1.id}/files/${f}`)).status; if (!ok2xx(a) && !ok2xx(b)) { tAll = Date.now(); break; } await sleep(P.probe_interval_ms); }
    await sleep(800);
    const after = { bff: (await bff.call('GET', `/t/${T1.id}/files/${f}`)).status, cli: (await call('GET', `/t/${T1.id}/files/${f}`)).status, refresh: (await cli.refresh()).status, new_login: (await platformLogin(u.id, T1.id)).ok, broker_login_maps_to_disabled: (await broker.login(T1.id, idp1, { sub: 'leaver-sub' })).platform_sub === u.id };
    SC.S3 = { patch_status: p.status, before, after, ms_active_false_to_all_denied: tAll ? tAll - tPatch : null, patch_api_ms: tPatch - t0, misses: [ok2xx(after.bff), ok2xx(after.cli), after.refresh === 200, after.new_login].filter(Boolean).length };
  }
  // ---------------- O1 upstream IdP outage ----------------
  {
    idp1.up = false;
    const l = await broker.login(T1.id, idp1, { sub: 'upstream-victim' });
    SC.O1 = { login_during_outage: l.ok, why: l.why, alternative_login_offered: !!l.alt_login_offered };
    idp1.up = true;
    const back = await broker.login(T1.id, idp1, { sub: 'upstream-victim' });
    SC.O1.login_after_recovery = back.ok;
  }
  log('S3/O1 done');
  await sleep(300);
  if (HARNESS_CHECK) { evalOut.verdict = 'harness-check'; throw Object.assign(new Error('harness check finished (no evaluation)'), { harnessCheck: true }); }
  const F1 = SC.F1, F2 = SC.F2, F3 = SC.F3, F4 = SC.F4, S1 = SC.S1, S2 = SC.S2, S3 = SC.S3, O1 = SC.O1;
  const crit = {
    mutable_attribute_links: { value: [F1.linked_to_victim, F2.username_collision_linked_to_victim, F4.email_rule_enabled].filter(Boolean).length, pass: !F1.linked_to_victim && !F2.username_collision_linked_to_victim && !F4.email_rule_enabled },
    impersonation_success: { value: [...F1.victim_file_reads.filter(ok2xx), F1.attacker_idp_into_victim_tenant, F3.unprotected_attempt_login_maps_to_victim].filter(Boolean).length, pass: !F1.victim_file_reads.some(ok2xx) && !F1.attacker_idp_into_victim_tenant && !F3.unprotected_attempt_login_maps_to_victim && !F3.relink_without_protected_op && !F2.add_without_reauth && !F2.add_with_stale_reauth && !F4.change_without_reauth },
    protected_op_record_missing: { value: [F2.protected_op_recorded, F3.protected_op_recorded, F4.notified].filter((x) => !x).length, pass: F2.add_with_reauth && F3.relink_with_protected_op && F4.change_with_reauth && F2.protected_op_recorded && F3.protected_op_recorded && F4.notified },
    duplicate_accounts: { value: S1.duplicate_accounts + (S1.jit_scim_race_accounts !== 1 ? 1 : 0) + (S1.concurrent_posts_created !== 1 ? 1 : 0), pass: S1.duplicate_accounts === 0 && S1.jit_scim_race_accounts === 1 && S1.concurrent_posts_created === 1 && S1.patches_200 === 1 },
    cross_tenant_writes: { value: S2.cross_tenant_writes, pass: S2.cross_tenant_writes === 0 && S2.get_other_tenant_id === 404 && S2.patch_other_tenant_id === 404 && S2.post_body_other_tenant === 400 && S2.tenant_header_mismatch === 403 && S2.t1_user_still_active },
    revocation_misses: { value: S3.misses, pass: S3.misses === 0 && S3.patch_status === 200 && S3.before.every(ok2xx) },
    alternative_logins: { value: O1.alternative_login_offered ? 1 : 0, pass: !O1.login_during_outage && !O1.alternative_login_offered && O1.login_after_recovery },
  };
  Object.assign(evalOut, { criteria: crit, verdict: Object.values(crit).every((c) => c.pass) ? '合格' : '不合格', recorded: { ms_active_false_to_all_denied: S3.ms_active_false_to_all_denied },
    limitations: ['AS の合成ログインは IdP 側の認証を代行する役であり、テナントの SSO 強制（MT-4）とローカル資格情報の有無は broker で評価した。AS 自体にテナント単位の SSO 強制はない', 'SAML・実 IdP 製品は TC-112'] });
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  if (e.harnessCheck) status = 'harness-check';
  else { status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error'; evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack }; evalOut.verdict = '中止'; console.error(e.stack); }
} finally {
  if (scim) await scim.stop();
  if (idp1) await idp1.stop();
  if (idp2) await idp2.stop();
  if (s) await s.stop();
  if (!HARNESS_CHECK) writeEval(run, evalOut, []); else run.writeJson('harness-check.json', { scenarios_completed: Object.keys(SC), abort: evalOut.abort || null });
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
