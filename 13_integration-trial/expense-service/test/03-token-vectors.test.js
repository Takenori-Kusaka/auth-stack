// CON-11 §6.2 mandatory vectors CV-001..CV-014 that apply to CR-1 (resource server), hand-built from the
// kit spec table (the machine-readable vectors of DL-120 do not exist yet), plus CON-06 x-negative-examples
// (NE-01..NE-06, NE-12, NE-14) signed with our own key.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { C, startIdp, startPdpStub, buildApp, serve, call, fixtureReport, ISS_A, ISS_B, T1, genEc, sign, AUD } from './harness.js';

let idp, idpB, pdp, ctx, base, rid;
before(async () => {
  idp = await startIdp(ISS_A); idpB = await startIdp(ISS_B); pdp = await startPdpStub();
  ctx = buildApp({ idp, pdpUrl: pdp.url });
  base = await serve(ctx.app);
  rid = fixtureReport(ctx.store);
});
after(async () => { ctx.app.server.close(); await pdp.close(); await idp.close(); await idpB.close(); });

const get = (tok) => call(base, 'GET', `/t/${T1}/expenses/${rid}`, tok);
const rejected = async (tok, label) => { const r = await get(tok); assert.equal(r.status, 401, `${label}: ${r.status} ${r.text}`); return r; };

test('baseline: valid token -> 200', async () => { assert.equal((await get(idp.mint())).status, 200); });
test('CV-001 aud of another API -> reject', () => rejected(idp.mint({ aud: 'https://svc.trial.invalid/s/other' }), 'CV-001'));
test('CV-002 typ confusion: txntoken+jwt / secevent+jwt / JWT (ID Token style) -> reject', async () => {
  for (const typ of ['txntoken+jwt', 'secevent+jwt', 'JWT']) await rejected(idp.mint({}, { typ }), typ);
});
test('CV-003 issuer mix-up (iss differs from discovery issuer) -> reject', () => rejected(idp.mint({ iss: 'https://evil.trial.invalid' }), 'CV-003'));
test('CV-004 alg=none / HS256 (not allowlisted) / ES384 header on P-256 key -> reject', async () => {
  await rejected(idp.mint({}, {}, { alg: 'none' }), 'none');
  await rejected(idp.mint({}, {}, { alg: 'HS256' }), 'HS256');
  const t = idp.mint(); const [h, p, s] = t.split('.');
  const h2 = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(h, 'base64url')), alg: 'ES384' })).toString('base64url');
  await rejected(`${h2}.${p}.${s}`, 'ES384');
});
test('CV-005 unknown kid: found after JWKS re-fetch -> accept; not found -> reject', async () => {
  const kp = idp.add('k-a2');
  assert.equal((await get(idp.mint({}, {}, { kid: 'k-a2', key: kp.privateKey }))).status, 200);
  await rejected(idp.mint({}, {}, { kid: 'k-zz', key: genEc().privateKey }), 'unknown kid');
});
test('CV-006 unknown crit -> reject', () => rejected(idp.mint({}, { crit: ['x-unknown'], 'x-unknown': 1 }), 'CV-006'));
test('CV-007 expired -> reject', () => rejected(idp.mint({ exp: Math.floor(Date.now() / 1000) - 3600, iat: Math.floor(Date.now() / 1000) - 7200 }), 'CV-007'));
test('CV-010 Txn-Token presented in Authorization -> reject', () => rejected(idp.mint({}, { typ: 'txntoken+jwt' }), 'CV-010'));
test('CV-011 sandbox issuer (issuer B, validly signed by B) at the production-role verifier -> reject', () => rejected(idpB.mint({ iss: ISS_B }), 'CV-011'));
test('CV-013 unknown claim -> ACCEPT and continue (mandatory compatibility test)', async () => {
  assert.equal((await get(idp.mint({ x_future_claim: { a: 1 }, dept: 'sales' }))).status, 200);
});
test('CV-014 older profile major (ver 0.9) -> reject (unsupported_profile)', () => rejected(idp.mint({ ver: '0.9' }), 'CV-014'));
test('CV-009 DPoP replay: NOT APPLICABLE (manifest options.sender_constrained=false)', { skip: 'not applicable to this service' }, () => {});

// CON-06 x-negative-examples: header/payload pairs signed with our own key (schema negatives that a verifier must also reject)
test('CON-06 NE-01..06, NE-12, NE-14 signed with own key -> all rejected by the verifier', async () => {
  const neg = Object.fromEntries(C.docs['CON-06']['x-negative-examples'].map((n) => [n.id, n]));
  const now = Math.floor(Date.now() / 1000);
  const basePayload = { iss: ISS_A, sub: 'u-requester', aud: AUD, exp: now + 300, iat: now, jti: 'j1', client_id: 'c1', tid: T1, ptype: 'human', ver: '1.0' };
  const key = idp.keys.get('k-a1').privateKey;
  const cases = {
    'NE-01': [{ alg: 'ES256', kid: 'k-a1' }, basePayload],
    'NE-02': [{ ...neg['NE-02'].instance, kid: 'k-a1' }, basePayload],
    'NE-03': [{ ...neg['NE-03'].instance, kid: 'k-a1' }, basePayload],
    'NE-04': [{ ...neg['NE-04'].instance, kid: 'k-a1' }, basePayload],
    'NE-05': [{ typ: 'at+jwt', alg: 'ES256', kid: 'k-a1' }, { ...basePayload, aud: [AUD, 'common'] }],
    'NE-06': [{ typ: 'at+jwt', alg: 'ES256', kid: 'k-a1' }, { ...basePayload, tid: [T1, 'x'] }],
    'NE-12': [{ typ: 'at+jwt', alg: 'ES256', kid: 'k-a1' }, { ...basePayload, txn: 'x1t2r3a4n5s6a7c8t9i0o1n2id', tctx: { tid: T1 } }],
    'NE-14': [{ typ: 'at+jwt', alg: 'ES256', kid: 'k-a1' }, { ...basePayload, exp: String(now + 300) }],
  };
  for (const [id, [h, p]] of Object.entries(cases)) await rejected(sign(h, p, key, h.alg === 'none' ? 'none' : 'ES256'), id);
});

test('NE-07 / NE-09 (roles, email, unregistered dept) are receiver-ignorable: accepted, never used for authz', async () => {
  // CON-06 says these fail the ISSUER-side check; RFC 7519 makes the receiver ignore unknown claims (CV-013).
  assert.equal((await get(idp.mint({ roles: ['admin'], email: 'a@example.com', dept: 'sales' }))).status, 200);
  const lastEval = pdp.state.calls.at(-1).body;
  assert.ok(!JSON.stringify(lastEval).includes('admin') && !JSON.stringify(lastEval).includes('sales'));
});
