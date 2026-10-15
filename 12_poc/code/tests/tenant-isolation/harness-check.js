// Pre-freeze harness check for the tenant-isolation group (§2.5: smoke only, no pass/fail metrics).
// Confirms that the positive (same-tenant) paths used by TC-002 / TC-003 work: forged-tid direct write with a
// Txn-Token, and every edge entry point for an allowed subject.
import fs from 'node:fs';
import { startStack } from '../../harness/stack.js';
import { Run } from '../../harness/run.js';
import { request } from '../../lib/http.js';
import { clientTls } from '../../lib/topology.js';
import { x5tS256 } from '../../lib/pki.js';
import { opaqueId } from '../../lib/ids.js';
import { loadIssuerKeys, signRaw, atPayload } from '../../harness/forge.js';

const run = new Run({ tc: 'TC-002', purpose: 'harness-check (tenant-isolation)', seed: 1 });
const s = await startStack({ tc: 'TC-002', run, engine: 'openfga', profile: 'small', seed: 5 });
const out = [];
try {
  const ds = s.dataset;
  const f = ds.files[0];
  const atKey = (await loadIssuerKeys(s.topo, 'at')).find((k) => k.state === 'active');
  const txnKey = (await loadIssuerKeys(s.topo, 'txn')).find((k) => k.state === 'active');
  const x5t = x5tS256(fs.readFileSync(s.topo.workloads.harness.cert, 'utf8'));
  const payload = atPayload(s.topo, { sub: f.owner, tid: f.tid, aud: s.topo.audiences.file, scope: 'files.write', cnfX5t: x5t, acr: 'L2-PR', amr: ['pwd', 'fido'] });
  const tok = await signRaw({ alg: atKey.alg, typ: 'at+jwt', kid: atKey.kid }, payload, atKey.privateKey);
  const nowS = Math.floor(Date.now() / 1000);
  const txn = { iss: s.topo.issuers.tts, aud: s.topo.txnAudience, iat: nowS, exp: nowS + 60, txn: opaqueId(), sub: f.owner, scope: 'op.file.write', req_wl: s.topo.workloads.harness.spiffeId, tctx: { tid: f.tid, root_jti: payload.jti, tier: 'write', ver: '1.0', sid: payload.sid, gref: payload.gref } };
  const tt = await signRaw({ alg: txnKey.alg, typ: 'txntoken+jwt', kid: txnKey.kid }, txn, txnKey.privateKey);
  const r = await request(`${s.topo.urls.file}/t/${f.tid}/files/${f.id}`, { method: 'PUT', headers: { authorization: `Bearer ${tok}`, 'txn-token': tt }, body: { content: 'x' }, tls: clientTls(s.topo, 'harness') });
  out.push({ check: 'direct forged write (owner)', status: r.status, body: r.text.slice(0, 200) });
  const u = await s.login({ sub: f.owner, tid: f.tid, amr: 'pwd,fido' });
  const folder = ds.folders.find((x) => x.id === f.folder);
  for (const [m, p, b] of [['GET', `/t/${f.tid}/files/${f.id}`], ['PUT', `/t/${f.tid}/files/${f.id}`, { content: 'y' }], ['POST', `/t/${f.tid}/files/${f.id}/url`], ['GET', `/t/${f.tid}/folders/${folder.id}/files`], ['GET', `/t/${f.tid}/files?limit=50`], ['GET', `/t/${f.tid}/labels/${f.id}`]]) {
    const rr = await u.call(m, p, b);
    out.push({ check: `edge ${m} ${p.replace(/syn[a-z0-9]+/g, '<id>')}`, status: rr.status, body: JSON.stringify(rr.body).slice(0, 160) });
  }
} finally {
  await s.stop();
  run.finish('completed', { checks: out });
}
console.log(JSON.stringify(out, null, 1));
