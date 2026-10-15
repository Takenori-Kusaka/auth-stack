// TC-026 minimal contract-test kit (11_contracts/mock-contract-test-kit.md, DL-80) for the CR-1 consumer role:
//   MK-02 (STS/TTS JWKS + test-key minting), MK-03 (PDP façade mock: AuthZEN + profile, G-stage tenant rule that the
//   control API cannot disable, allow table, injections), MK-07 (audit sink, accepts and counts).
// The same vectors (CV-001..CV-014 that apply to CR-1, plus a positive) are driven against the PoC platform and
// against the mocks; the consumer (the file-service reference service with the PEP SDK) is the same code.
import fs from 'node:fs';
import https from 'node:https';
import crypto from 'node:crypto';
import { generateKeyPair, exportJWK } from 'jose';
import { opaqueId } from '../../../lib/ids.js';

function server(cert, key, ca, handler) { return https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key), ca: [fs.readFileSync(ca)], requestCert: true, rejectUnauthorized: false }, handler); }
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => ok(b)); });
const json = (res, status, obj, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };

export class MockPlatform {
  constructor({ topo, dataset, stsPort, pdpPort }) {
    Object.assign(this, { topo, ds: dataset, stsPort, pdpPort });
    this.allow = new Set(); // `${sub}|${type}:${id}|${action}`
    this.inject = { mode: 'none' };
    this.objTenant = new Map(dataset.files.map((f) => [`files/file:${f.id}`, f.tid]));
    this.calls = { evaluation: 0, events: 0 };
  }
  async start() {
    const mk = async (prefix) => { const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true }); return { kid: `${prefix}-${crypto.randomBytes(3).toString('hex')}`, privateKey, publicJwk: { ...(await exportJWK(publicKey)), alg: 'ES256', use: 'sig' } }; };
    this.atKeys = [await mk('mock-at')];
    this.txnKeys = [await mk('mock-txn')];
    const w = this.topo.workloads;
    this.sts = server(w.sts.cert, w.sts.key, this.topo.pki.ca, (req, res) => {
      if (req.url === '/jwks') return json(res, 200, { keys: this.atKeys.map((k) => ({ ...k.publicJwk, kid: k.kid })) });
      if (req.url === '/tts/jwks') return json(res, 200, { keys: this.txnKeys.map((k) => ({ ...k.publicJwk, kid: k.kid })) });
      return json(res, 404, {});
    });
    this.pdp = server(w.pdp.cert, w.pdp.key, this.topo.pki.ca, (req, res) => this.pdpHandler(req, res).catch(() => json(res, 500, {})));
    await new Promise((ok) => this.sts.listen(this.stsPort, '127.0.0.1', ok));
    await new Promise((ok) => this.pdp.listen(this.pdpPort, '127.0.0.1', ok));
    return this;
  }
  async addAtKey() { const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true }); const k = { kid: `mock-at-${crypto.randomBytes(3).toString('hex')}`, privateKey, publicJwk: { ...(await exportJWK(publicKey)), alg: 'ES256', use: 'sig' } }; this.atKeys.push(k); return k; }
  decide(it) {
    const s = it.subject || {}, r = it.resource || {}, a = it.action || {};
    const prof = it.context?.['x-authz-profile'] || {};
    if (Number(String(prof.profile_version || '1.0').split('.')[0]) !== 1) return 'unsupported_profile';
    const sT = s.properties?.tid, rT = r.properties?.tid;
    if (!sT || !rT) return 'deny_indeterminate';
    if (sT !== rT) return 'deny_guardrail:g1_tenant_mismatch'; // G stage: cannot be disabled through the control API
    const known = this.objTenant.get(`${r.type}:${r.id}`);
    if (known && known !== rT) return 'deny_guardrail:g1_tenant_mismatch';
    if (this.inject.mode === 'deny_unavailable') return 'deny_unavailable';
    return this.allow.has(`${s.id}|${r.type}:${r.id}|${a.name}`) ? 'allow' : 'deny_no_relation';
  }
  async pdpHandler(req, res) {
    const rid = req.headers['x-request-id'];
    const echo = () => (this.inject.mode === 'drop_request_id' ? {} : rid ? { 'x-request-id': this.inject.mode === 'wrong_request_id' ? opaqueId() : rid } : {});
    if (req.url === '/.well-known/authzen-configuration') return json(res, 200, { policy_decision_point: this.topo.issuers.pdp, access_evaluation_endpoint: `https://127.0.0.1:${this.pdpPort}/access/v1/evaluation`, access_evaluations_endpoint: `https://127.0.0.1:${this.pdpPort}/access/v1/evaluations` }, echo());
    if (req.url === '/events') { const b = JSON.parse(await body(req) || '{}'); this.calls.events += (b.records || []).length; return json(res, 200, { accepted: (b.records || []).length, invalid: 0 }); }
    if (req.url === '/access/v1/evaluation' && req.method === 'POST') {
      this.calls.evaluation++;
      const it = JSON.parse(await body(req));
      if (this.inject.mode === 'timeout') return; // keep the connection open beyond the consumer timeout
      if (this.inject.mode === 'status503') return json(res, 503, { error: 'unavailable' }, { 'retry-after': '1', ...echo() });
      const reason = this.decide(it);
      const prof = { decision_id: opaqueId(), reason, model_revision: { model_revision: 'm-mock0000000000', guardrail_catalog_version: 'g-1' }, consistency: { mode: 'fully_consistent' } };
      if (this.inject.mode === 'drop_decision_id') delete prof.decision_id;
      return json(res, 200, { decision: reason === 'allow', context: { 'x-authz-profile': prof } }, echo());
    }
    return json(res, 404, {});
  }
  async stop() { for (const srv of [this.sts, this.pdp]) { srv.closeAllConnections?.(); await new Promise((ok) => srv.close(ok)); } }
}
