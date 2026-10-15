// Runs the kit negative vectors (11_contracts/kit/negative-vectors/*.json) unmodified against the SUT with self-made stubs.
// kit/README §5: results are for our own CI only, not the kit verdict (CON-11 §10.1).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startWorld, call } from './harness.js';
import { randomId } from '../src/jose.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const VDIR = path.resolve(here, '../../../11_contracts/kit/negative-vectors');
const LEDGER = JSON.parse(fs.readFileSync(path.join(here, '..', 'entrypoints.json'), 'utf8'));
const results = [];
const groups = new Map();

// Cases that do not apply to this SUT (manifest / role) or whose injection cannot be established (kit/README §5.3)
const NA = {
  'CV-003b': 'CR-4（RP）を担わない（BFF は本検証の範囲外）',
  'CV-009a': 'options.sender_constrained=false',
  'CV-011c': 'CR-10（client 登録）を担わない',
  'CV-012b': '接続確立の遅延を Windows の自前スタブで作れない（kit/README §5.3、対象外＝注入不成立）',
  'CV-012c': 'mTLS がないため TLS ハンドシェイクの停止を注入できない（対象外）',
};

// Variants we add to see what the vector intended (the original is also run unmodified)
const VARIANTS = {
  'CV-014b': (c) => { c.stimulus.setup = [{ op: 'fixtures', txn_token: { signer: 'TTS.current', claims: { sub: '{{subject.self}}', tctx: { tid: '{{tenant.1}}', tier: 'write' } } }, present_txn_token_as: 'txn_token_header' }]; return 'write に正規の Txn-Token を添えた版（CV-012 と同じ扱い）'; },
  'CV-061d': (c) => { c.stimulus.setup[1].txn_token.claims.sub = '{{guest.sub}}'; return 'Txn-Token の sub を access token と同じゲストにした版'; },
  'CV-062a': (c) => { c.stimulus.setup[0].txn_token.claims.sub = '{{agent.sub}}'; return 'Txn-Token の sub を access token（エージェント）と揃え、AD-02 の経路を通す版'; },
};

function opFor(name) { return LEDGER.entry_points.find((e) => e.id === LEDGER.vector_manifest[`operation.${name}`]); }

function makeSubst(w, f, opName) {
  const now = Math.floor(Date.now() / 1000);
  const op = opName ? opFor(opName) : null;
  const map = {
    'sut.audience': 'svc-sup-ticket', 'other.audience': 'svc-other-api', 'issuer.other': 'https://issuer-other.test.invalid',
    'key.A.current.kid': w.A.keys.current.kid, 'tenant.1': w.ids.t1, 'tenant.2': w.ids.t2,
    'resource.t1.own': f.own, 'resource.t2.existing': f.t2existing, 'resource.absent': f.absent, 'resource.t1.ungranted': f.ungranted,
    'profile.below_min': '0.9', 'subject.self': w.ids.self, 'guest.sub': w.ids.guest, 'guest.email': 'guest-kit@partner.test.invalid',
    'agent.sub': w.ids.agent, 'agent.delegation_client': w.ids.deskAgentClient, 'agent.autonomous_client': w.ids.autonomousClient,
    'agent.tool_scope': op?.agent_delegation?.tool_scope || 'sup.draft_reply', 'agent.other_tool_scope': 'sup.unrelated_tool',
    'job_run.t1': f.jobRun,
  };
  for (const k of ['read', 'write', 'list', 'invite', 'agent_write', 'agent_approval']) map[`manifest.operation.${k}`] = k;
  const one = (s) => {
    const m = s.match(/^\{\{now([+-]\d+)?\}\}$/); if (m) return now + Number(m[1] || 0);
    const whole = s.match(/^\{\{([^}]+)\}\}$/); if (whole && whole[1] in map) return map[whole[1]];
    return s.replace(/\{\{([^}]+)\}\}/g, (_, k) => (k in map ? map[k] : _));
  };
  const deep = (v) => (typeof v === 'string' ? one(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  return deep;
}

async function request(w, f, opName, resource, token, txn, extraHeaders = {}, extraBody = {}) {
  const res = resource || f.own;
  switch (opName) {
    case 'read': return call(w, 'GET', `/tickets/${res}`, { token, txn, headers: extraHeaders });
    case 'write': return call(w, 'POST', `/tickets/${res}/comments`, { token, txn, body: { body: 'kit', ...extraBody }, headers: extraHeaders });
    case 'list': return call(w, 'GET', '/tickets', { token, txn, headers: extraHeaders });
    case 'invite': return call(w, 'POST', `/tickets/${res}/guests`, { token, txn, body: { email: 'guest-kit@partner.test.invalid' }, headers: extraHeaders });
    case 'agent_write': return call(w, 'POST', `/tickets/${res}/drafts`, { token, txn, body: { body: 'draft', ...extraBody }, headers: extraHeaders });
    case 'agent_approval': {
      const did = randomId(); w.app.store.drafts.set(did, { id: did, ticket: res, body: 'x', author: w.ids.self, status: 'draft' });
      return call(w, 'POST', `/tickets/${res}/drafts/${did}/send`, { token, txn, body: extraBody, headers: extraHeaders });
    }
    default: throw new Error('unknown op ' + opName);
  }
}

function profileOk(profile, r) {
  switch (profile) {
    case 'auth_failure': return r.status === 401 && /error="invalid_token"/.test(r.headers['www-authenticate'] || '');
    case 'missing_credentials': return r.status === 401 && !/error=/.test(r.headers['www-authenticate'] || '');
    case 'resource_denied': return r.status === 404;
    case 'no_decision': return r.status === 503 && !!r.headers['retry-after'];
    case 'success': return r.status >= 200 && r.status < 300;
    default: return true;
  }
}

async function runCase(vec, c, variantNote) {
  const w = await startWorld();
  const out = { id: c.case_id + (variantNote ? '(variant)' : ''), vector: vec.id, note: variantNote || null, checks: [] };
  const chk = (name, ok, detail) => out.checks.push({ name, ok: !!ok, detail });
  try {
    const st = c.stimulus || {}; const ex = c.expect;
    const setup = st.setup || [];
    // pre-start setup
    for (const s of setup) if (s.discovery_override && s.when === 'before_sut_start') w.A.discoveryOverride = 'https://issuer-other.test.invalid';
    try { await w.startSut(); } catch (e) {
      out.startup_refused = String(e.message);
      chk('startup refused (CV-003c (a))', ex.outcome === 'reject', e.message);
      return out;
    }
    const f = w.fixtures();
    f.jobRun = w.tts.fixtureRecord(w.ids.self, w.ids.t1);
    w.app.store.jobs.set(f.jobRun, { job_run_id: f.jobRun, tid: w.ids.t1, ticket: f.own, origin_sub: w.ids.self, subject_type: 'core/user', ptype: 'human', due_at: Date.now() });
    const S = makeSubst(w, f, st.request?.operation?.replace(/^\{\{manifest\.operation\.|\}\}$/g, ''));
    const sx = S(st); const exp = S(ex);
    const opName = st.request ? String(st.request.operation).replace(/^\{\{manifest\.operation\.|\}\}$/g, '') : null;
    const store = w.app.store;
    let accessTok = null, txnTok = null; const headers = {}; const body = {};
    for (const s of S(setup)) {
      if (s.access_token) accessTok = w.mint({ base: 'access_token', ...s.access_token });
      if (s.txn_token) txnTok = w.mint({ base: 'txn_token', signer: s.txn_token.signer, claims: s.txn_token.claims });
      if (s.external_grant) {
        const g = w.xg.fixtureGrant({ anchor: `sup/ticket:${s.external_grant.resource}`, relation: 'guest', grantee: s.external_grant.grantee, tid: w.ids.t1, expires_at: new Date(Number(s.external_grant.expires_at) * 1000).toISOString() });
        out.grant = g.grant_id;
      }
      if (s.op === 'inject' && s.kind === 'tts_jwks_unavailable') w.tts.jwksUnavailable = true;
      if (s.approval_grant) { headers['agent-approval'] = 'apg-stub-' + randomId(); }
    }
    if (st.mint) {
      const t = w.mint(sx.mint);
      if (st.present?.as === 'txn_token_header') txnTok = t; else accessTok = t;
    }
    if (setup.some((s) => s.txn_token_tamper === 'signature_byte_flip') && txnTok) {
      const parts = txnTok.split('.'); const sig = Buffer.from(parts[2], 'base64url'); sig[5] ^= 0x01; parts[2] = sig.toString('base64url'); txnTok = parts.join('.');
    }
    if (c.case_id === 'CV-062h') { headers['x-agent-approved'] = 'true'; body.approved = true; body.annotations = { readOnlyHint: true }; }
    if (st.inject?.target === 'MK-03') { if (st.inject.kind === 'evaluations_item_reason') { w.pdp.inject = st.inject.kind; w.pdp.injectParams = sx.inject.params; } else if (st.inject.kind !== 'revoked') w.pdp.inject = st.inject.kind; }
    if (st.inject?.target === 'STUB-LEDGER' && st.inject.kind === 'overload_503') w.tts.ledgerInject = 'overload_503';
    const keyPublish = setup.find((s) => s.op === 'keys.publish_after');
    const revokeAfterAllow = setup.find((s) => s.op === 'revoke' && s.when === 'after_first_allow');
    const cancelAnchor = setup.find((s) => s.business_action === 'cancel_anchor_resource');

    // preparatory steps
    if (keyPublish) { // let the SUT cache the JWKS first, then publish the new key just before presenting
      await call(w, 'GET', `/tickets/${f.own}`, { token: w.mint() }); w.A.publish('next_unpublished');
    }
    if (cancelAnchor) { const r = await call(w, 'POST', `/tickets/${f.own}/close`, { token: w.mint(), txn: w.txnFor() }); out.cancel_status = r.status; }
    if (revokeAfterAllow) { const r0 = await request(w, f, opName, sx.request.resource, accessTok, txnTok); chk('first request allowed before revoke', r0.status === 200, r0.status); w.pdp.revokedSubjects.add(w.ids.self); }
    if (st.after?.some((a) => a.what === 'external_grant')) {
      const r0 = await request(w, f, opName, sx.request.resource, accessTok, txnTok); chk('readable before revoke', r0.status === 200, r0.status);
      w.pdp.grants.forEach((g) => { g.state = 'revoked'; });
    }

    const A0 = { ...w.A.fetches }; const B0 = { ...w.B.fetches };
    const be0 = store.businessExecutions; const te0 = store.toolExecutions; const pc0 = w.pdp.calls.length; const ev0 = w.sink.events.length;
    const dl0 = store.deadLetters.length; const nt0 = store.notifications.length;
    let r = null; let consumed = null;
    if (st.deliver) {
      consumed = await w.app.consume(sx.deliver.message);
      out.consume = consumed;
    } else {
      r = await request(w, f, opName, sx.request.resource, accessTok, txnTok, headers, body);
      out.status = r.status; out.code = r.json?.code;
    }
    await w.app.audit.flush();
    const newEvents = w.sink.events.slice(ev0);
    const se = exp.side_effects || {};
    // outcome
    if (r) {
      if (exp.outcome === 'reject') chk('outcome reject', r.status >= 400 && r.status < 500, r.status);
      if (exp.outcome === 'accept') chk('outcome accept', r.status >= 200 && r.status < 300, r.status);
      if (exp.outcome === 'no_decision') chk('outcome no_decision', r.status === 503, r.status);
      if (exp.response_profile) chk(`profile ${exp.response_profile}`, profileOk(exp.response_profile, r), `${r.status} ${r.headers['www-authenticate'] || ''}`);
      if (exp.same_as_group) {
        const norm = JSON.stringify({ s: r.status, b: r.text, wa: r.headers['www-authenticate'] || null, ra: r.headers['retry-after'] || null });
        const g = groups.get(exp.same_as_group) || new Map(); g.set(out.id, norm); groups.set(exp.same_as_group, g);
      }
    } else {
      if (exp.outcome === 'reject') chk('consume rejected', consumed.ok === false, consumed);
      if (exp.outcome === 'accept') chk('consume accepted', consumed.ok === true, consumed);
    }
    if ('business_execution' in se) chk('business_execution', store.businessExecutions - be0 === se.business_execution, store.businessExecutions - be0);
    if ('pdp_calls_max' in se) chk('pdp_calls_max', w.pdp.calls.length - pc0 <= se.pdp_calls_max, w.pdp.calls.length - pc0);
    if ('tool_executions_max' in se) chk('tool_executions_max', store.toolExecutions - te0 <= se.tool_executions_max, store.toolExecutions - te0);
    if ('dead_letter_min' in se) chk('dead_letter_min', store.deadLetters.length - dl0 >= se.dead_letter_min, store.deadLetters.length - dl0);
    if ('notifications_max' in se) chk('notifications_max', store.notifications.length - nt0 <= se.notifications_max, store.notifications.length - nt0);
    if (se.fetches) for (const [k, v] of Object.entries(se.fetches)) {
      const [iss, what] = k.split('.'); let n;
      if (iss === 'issuer_A') n = w.A.fetches[what]; else if (iss === 'issuer_B') n = w.B.fetches[what] - B0[what]; else n = 0; // other issuer is never contacted (no stub exists)
      chk(`fetches ${k} <= ${v}`, n <= v, n);
    }
    if (exp.audit) {
      if (exp.audit.events_min) chk('audit events_min', newEvents.length >= exp.audit.events_min, newEvents.length);
      for (const fld of exp.audit.fields || []) chk(`audit field ${fld}`, newEvents.some((e) => fld.split('.').reduce((o, k) => o?.[k], e) !== undefined), null);
      for (const s of exp.audit.must_not_contain || []) {
        if (s === 'corr.txn') chk('audit must not contain corr.txn', !newEvents.some((e) => e.corr?.txn), null);
        else chk(`must_not_contain ${s}`, !JSON.stringify(newEvents).includes(s) && !JSON.stringify(w.pdp.calls.slice(pc0)).includes(`"${s}"`), null);
      }
    }
    if (c.case_id === 'CV-060d' && !variantNote) { const last = w.pdp.calls.at(-1); chk('re-check subject.type is saved core/user', last?.body.subject.type === 'core/user', last?.body.subject.type); }
    if (c.case_id === 'CV-061f') chk('revokeExternalGrantsByAnchor called once', w.xg.calls.filter((x) => x.url.endsWith('/revoke-by-anchor')).length === 1, null);
    fs.mkdirSync(path.join(here, '..', 'out'), { recursive: true });
    fs.appendFileSync(path.join(here, '..', 'out', 'audit-vectors.jsonl'), newEvents.map((e) => JSON.stringify(e) + '\n').join(''));
  } catch (e) {
    chk('runner error', false, String(e.stack || e));
  } finally {
    await w.stopAll();
  }
  return out;
}

fs.mkdirSync(path.join(here, '..', 'out'), { recursive: true });
fs.writeFileSync(path.join(here, '..', 'out', 'audit-vectors.jsonl'), '');
const files = fs.readdirSync(VDIR).filter((x) => /^CV-\d+\.json$/.test(x)).sort();
for (const file of files) {
  const vec = JSON.parse(fs.readFileSync(path.join(VDIR, file), 'utf8'));
  for (const c of vec.cases) {
    if (NA[c.case_id]) { results.push({ id: c.case_id, vector: vec.id, na: NA[c.case_id] }); continue; }
    test(`${c.case_id} ${(c.description || "").slice(0, 60)}`, async () => {
      const o = await runCase(vec, c); results.push(o);
      const failed = o.checks.filter((x) => !x.ok);
      assert.deepEqual(failed, []);
    });
    if (VARIANTS[c.case_id]) {
      test(`${c.case_id} (variant)`, async () => {
        const cc = JSON.parse(JSON.stringify(c)); const note = VARIANTS[c.case_id](cc);
        const o = await runCase(vec, cc, note); results.push(o);
        assert.deepEqual(o.checks.filter((x) => !x.ok), []);
      });
    }
  }
}

after(() => {
  // same_as_group: every response in a group must be identical
  const groupRes = {};
  for (const [g, m] of groups) groupRes[g] = { members: m.size, identical: new Set(m.values()).size === 1 };
  const summary = {
    run_at: new Date().toISOString(), node: process.version,
    total: results.length, na: results.filter((r) => r.na).length,
    pass: results.filter((r) => !r.na && r.checks?.every((x) => x.ok)).length,
    fail: results.filter((r) => !r.na && r.checks?.some((x) => !x.ok)).map((r) => ({ id: r.id, status: r.status, code: r.code, failed: r.checks.filter((x) => !x.ok) })),
    groups: groupRes, results,
  };
  fs.writeFileSync(path.join(here, '..', 'out', 'vectors-result.json'), JSON.stringify(summary, null, 2));
});
