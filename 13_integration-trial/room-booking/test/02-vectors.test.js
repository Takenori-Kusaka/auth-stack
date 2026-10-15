// Runs the kit's machine-readable vectors (11_contracts/kit/negative-vectors, CV-001..CV-014, CV-045) against
// the SUT with own stubs (kit/README.md §5). Pass/fail here is NOT the kit (DL-120) judgement.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startStack, T1, T2, AUD, OTHER_AUD } from './harness.js';
import { mintAccessToken } from './stubs.js';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const vecDir = path.resolve(here, '..', '..', '..', '11_contracts', 'kit', 'negative-vectors');
const vectors = fs.readdirSync(vecDir).filter((f) => /^CV-\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(vecDir, f), 'utf8')));

export const results = [];
let S;
before(async () => { S = await startStack(); if (S.startupError) throw S.startupError; });
after(async () => {
  await S?.close();
  fs.writeFileSync(path.join(here, '..', 'vector-results.json'), JSON.stringify(results, null, 2));
});

function subst(v, ctx) {
  if (typeof v === 'string') {
    const m = v.match(/^\{\{(.+)\}\}$/);
    if (!m) return v;
    const k = m[1];
    const now = Math.floor(Date.now() / 1000);
    const t = k.match(/^now([+-]\d+)$/);
    if (t) return now + Number(t[1]);
    const map = {
      'sut.audience': AUD, 'other.audience': OTHER_AUD, 'tenant.1': T1, 'tenant.2': T2,
      'resource.t1.own': ctx.fx.b1, 'resource.t2.existing': ctx.fx.b2, 'resource.absent': ctx.fx.absent,
      'manifest.operation.read': 'read', 'manifest.operation.write': 'write', 'profile.below_min': '0.9',
      'key.A.current.kid': ctx.stubs.A.keys.current.kid, 'issuer.other': ctx.stubs.OTHER.issuer,
    };
    if (!(k in map)) throw new Error(`unknown placeholder ${k}`);
    return map[k];
  }
  if (Array.isArray(v)) return v.map((x) => subst(x, ctx));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, subst(b, ctx)]));
  return v;
}

function signerKey(stubs, signer) {
  const [iss, k] = signer.split('.');
  return stubs[iss].keys[k];
}

function mintFor(ctx, mint) {
  const { stubs } = ctx;
  const claims = subst(mint.claims ?? {}, ctx);
  const header = subst(mint.header ?? {}, ctx);
  const issuerSt = mint.claimed_issuer === 'other' ? stubs.OTHER : stubs[mint.claimed_issuer];
  if (mint.base === 'txn_token') {
    // Vector says signer A.current (the access-token issuer key) although K5 uses the TTS key family (CON-16 §1.6).
    const key = mint.signer === 'TTS.current' ? stubs.tts.key : signerKey(stubs, mint.signer);
    return stubs.tts.mint({ sub: ctx.fx.alice, tid: T1, ...claims }, { key });
  }
  if (mint.base === 'id_token') {
    return mintAccessToken({ issuerSt, signerKey: stubs.A.keys.current, audience: 'c-rsv-web-0001', tid: T1, header: { typ: 'JWT' }, claims: { nonce: 'n-1' } });
  }
  const signer = mint.signer === 'unsigned' ? 'unsigned' : mint.signer === 'hmac_with_A_public_key' ? 'hmac' : 'key';
  const sk = signer === 'key' ? signerKey(stubs, mint.signer) : stubs.A.keys.current;
  return mintAccessToken({ issuerSt, signerKey: sk, signer, audience: AUD, tid: T1, sub: ctx.fx.alice, claims, header });
}

async function send(ctx, stim, tokens) {
  const r = subst(stim.request, ctx);
  const resource = r.resource;
  const tier = r.tier;
  // read -> EP-RSV-02 view, write -> EP-RSV-03 cancel. Harness choice: write requests carry a valid Txn-Token
  // unless the case presents its own (vectors CV-012 do not say how the write precondition is met).
  const isWrite = tier !== 'read-sensitive';
  const headers = {};
  if (tokens.authorization) headers.authorization = `Bearer ${tokens.authorization}`;
  const txn = tokens.txn ?? (isWrite ? ctx.mintTxn({ tid: T1 }) : undefined);
  if (txn) headers['txn-token'] = txn;
  const before = { biz: ctx.app.store.businessExecutions, pdp: ctx.stubs.pdp.calls, A: { ...ctx.stubs.A.access }, B: { ...ctx.stubs.B.access }, O: { ...ctx.stubs.OTHER.access }, ev: ctx.stubs.sink.events.length };
  const res = await fetch(`${ctx.base}/v1/bookings/${resource}`, { method: isWrite ? 'DELETE' : 'GET', headers });
  const text = await res.text();
  if (isWrite && res.status === 200) ctx.app.store.bookings.get(resource).status = 'active'; // undo for next case
  return {
    status: res.status, headers: Object.fromEntries(res.headers), text,
    biz: ctx.app.store.businessExecutions - before.biz, pdp: ctx.stubs.pdp.calls - before.pdp,
    fetches: {
      'issuer_A.jwks': ctx.stubs.A.access.jwks - before.A.jwks, 'issuer_B.discovery': ctx.stubs.B.access.discovery - before.B.discovery,
      'issuer_B.jwks': ctx.stubs.B.access.jwks - before.B.jwks, 'issuer_other.discovery': ctx.stubs.OTHER.access.discovery - before.O.discovery,
      'issuer_other.jwks': ctx.stubs.OTHER.access.jwks - before.O.jwks,
    },
    events: ctx.stubs.sink.events.length - before.ev,
  };
}

const groups = {};
function checkExpect(c, exp, got) {
  const errs = [];
  if (exp.outcome === 'reject' && !(got.status === 401 || got.status === 404 || got.status === 403)) errs.push(`status ${got.status} not reject`);
  if (exp.outcome === 'accept' && got.status !== 200) errs.push(`status ${got.status} not accept`);
  if (exp.outcome === 'no_decision' && got.status !== 503) errs.push(`status ${got.status} not 503`);
  const prof = exp.response_profile;
  if (prof === 'auth_failure' && (got.status !== 401 || !/^Bearer error="invalid_token"/.test(got.headers['www-authenticate'] ?? ''))) errs.push('auth_failure profile');
  if (prof === 'resource_denied' && got.status !== 404) errs.push('resource_denied profile');
  if (prof === 'no_decision' && (got.status !== 503 || !got.headers['retry-after'])) errs.push('no_decision profile');
  const se = exp.side_effects ?? {};
  if ('business_execution' in se && got.biz > se.business_execution) errs.push(`business_execution ${got.biz}`);
  if ('pdp_calls_max' in se && got.pdp > se.pdp_calls_max) errs.push(`pdp_calls ${got.pdp}`);
  for (const [k, max] of Object.entries(se.fetches ?? {})) if (got.fetches[k] > max) errs.push(`fetch ${k}=${got.fetches[k]}`);
  if (exp.audit?.events_min && got.events < exp.audit.events_min) errs.push('audit events');
  if (exp.same_as_group) {
    const sig = JSON.stringify({ s: got.status, b: got.text, w: got.headers['www-authenticate'] ?? null, ct: got.headers['content-type'] });
    groups[exp.same_as_group] ??= sig;
    if (groups[exp.same_as_group] !== sig) errs.push(`differs from group ${exp.same_as_group}`);
  }
  return errs;
}

const NOT_APPLICABLE = {
  'CV-003b': 'CR-4（RP）の役割を持たない。本サービスは RP ではない',
  'CV-009a': 'conditional（sender_constrained=false。DPoP を使わない）',
  'CV-011c': 'CR-10（client 登録）の役割を持たない',
  'CV-012c': 'TLS を使わない試験構成（mTLS・TLS のスタブなし。CON-16 §4.4）',
};

for (const v of vectors) {
  for (const c of v.cases) {
    test(`${c.case_id} ${c.description ?? v.title}`, async (t) => {
      const ctx = { ...S };
      if (NOT_APPLICABLE[c.case_id]) { results.push({ id: c.case_id, result: 'n/a', note: NOT_APPLICABLE[c.case_id] }); t.skip(NOT_APPLICABLE[c.case_id]); return; }
      const st = c.stimulus;
      // CV-003c: separate SUT start with discovery returning another issuer
      if (st.setup?.some((s) => s.discovery_override)) {
        const other = await startStack({ discoveryOverride: { issuer: 'https://other.stub.test.invalid' } });
        const ok = !!other.startupError;
        if (!other.startupError) await other.close();
        results.push({ id: c.case_id, result: ok ? 'pass' : 'fail', note: ok ? `startup refused: ${other.startupError.message}` : 'started' });
        assert.ok(ok, 'SUT must not start');
        return;
      }
      S.stubs.pdp.inject = null; S.stubs.pdp.revoked.clear(); S.stubs.pdp.allow.clear();
      S.stubs.pdp.grant(S.fx.alice, 'view', 'rsv/booking', S.fx.b1);
      S.stubs.pdp.grant(S.fx.alice, 'cancel', 'rsv/booking', S.fx.b1);
      let note = '';
      if (st.setup?.some((s) => s.op === 'keys.publish_after')) S.stubs.A.published.add('next_unpublished');
      const tokens = {};
      if (st.setup?.some((s) => s.op === 'fixtures' && s.access_token)) {
        const f = st.setup.find((s) => s.access_token).access_token;
        tokens.authorization = mintFor(ctx, { base: 'access_token', ...f });
      }
      let tok = st.mint ? mintFor(ctx, st.mint) : undefined;
      if (st.setup?.some((s) => s.txn_token_tamper === 'signature_byte_flip')) {
        const parts = tok.split('.'); const sig = Buffer.from(parts[2], 'base64url'); sig[5] ^= 0x01; parts[2] = sig.toString('base64url'); tok = parts.join('.');
      }
      if (st.present?.as === 'authorization_bearer') tokens.authorization = tok;
      if (st.present?.as === 'txn_token_header') tokens.txn = tok;
      const tiers = /write と read-sensitive の操作の両方/.test(c.description ?? '') ? ['write', 'read-sensitive'] : [st.request.tier];
      const errs = [];
      for (const tier of tiers) {
        const stim = { ...st, request: { ...st.request, tier, operation: tier === 'write' ? '{{manifest.operation.write}}' : '{{manifest.operation.read}}' } };
        if (st.inject) S.stubs.pdp.inject = st.inject.kind === 'revoked' ? null : st.inject.kind;
        if (st.setup?.some((s) => s.op === 'revoke')) {
          const first = await send(ctx, stim, tokens);
          if (first.status !== 200) errs.push(`pre-revoke allow expected, got ${first.status}`);
          S.stubs.pdp.revoked.add(`${S.fx.alice}|view|rsv/booking|${S.fx.b1}`);
        }
        let connectSwap = null;
        if (st.inject?.kind === 'connect_delay') {
          // Real connect delay: point the evaluation URL at a non-routable address (blackhole). Test-only swap of the URL
          // the PdpClient resolved from metadata; the SUT's deadline logic is unchanged (report.md: CV-012b note).
          connectSwap = [S.app.pep.pdp.evalUrl, S.app.pep.pdp.evalsUrl];
          S.app.pep.pdp.evalUrl = 'http://10.255.255.1:9/access/v1/evaluation';
          note += ' connect: non-routable address (Windows returns unreachable at once, so this is NOT a true connect delay);';
        }
        const t0 = Date.now();
        const got = await send(ctx, stim, tokens);
        const elapsed = Date.now() - t0;
        if (connectSwap) [S.app.pep.pdp.evalUrl, S.app.pep.pdp.evalsUrl] = connectSwap;
        const e = checkExpect(c, c.expect, got);
        if (c.expect.side_effects?.allow_used_after_deadline === 0 && got.status === 200) e.push('allow used after deadline');
        if (c.expect.audit?.must_not_contain) {
          const pdpBodies = S.stubs.pdp.requests.slice(-3).map((r) => r.raw).join('');
          const aud = JSON.stringify(S.stubs.sink.events.slice(-3));
          for (const s of c.expect.audit.must_not_contain) if (pdpBodies.includes(s) || aud.includes(s)) e.push(`leaked ${s}`);
        }
        errs.push(...e.map((x) => `[${tier}] ${x}`));
        note += ` [${tier}] status=${got.status} pdp=${got.pdp} ${elapsed}ms`;
        S.stubs.pdp.inject = null;
      }
      S.stubs.A.published.delete('next_unpublished');
      // Internal reason for CV-045a (vector notes expect l0_mismatch)
      if (c.case_id.startsWith('CV-045')) {
        const last = S.stubs.sink.events.at(-1);
        note += ` audit.reason=${last?.reason_code}`;
      }
      results.push({ id: c.case_id, result: errs.length ? 'fail' : 'pass', note: (errs.join('; ') + note).trim() });
      assert.deepEqual(errs, []);
    });
  }
}

// Own additional case (report.md M-3): the CV-045a intent with a Txn-Token signed by the TTS key family.
test('CV-045a-own Txn-Token signed by the TTS key with tctx.tid=t2 -> l0_mismatch', async () => {
  S.stubs.pdp.inject = null;
  const before = S.stubs.pdp.calls;
  const r = await S.call('DELETE', `/v1/bookings/${S.fx.b1}`, { token: S.mint(), txn: S.mintTxn({ tid: T1, tctx: { tid: T2 } }) });
  const last = S.stubs.sink.events.at(-1);
  const ok = r.status === 404 && S.stubs.pdp.calls === before && last.reason_code === 'deny_l0:mismatch';
  results.push({ id: 'CV-045a-own', result: ok ? 'pass' : 'fail', note: `status=${r.status} reason=${last.reason_code}` });
  assert.ok(ok);
});
