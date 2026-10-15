// Verification-point harness for TC-014 / TC-015 (resilience-keys): in-process verification points built from the
// same verifier as the PEP SDK (lib/jwt.js verifyInternalToken + JwksCache + RevocationClient), a switchable TCP
// redirector in front of the STS JWKS endpoints (to model JWKS outage and distribution-path substitution), an
// attacker HTTPS JWKS server, and a test-only signer that reads the run's STS/TTS key stores (git-ignored secrets).
import fs from 'node:fs';
import net from 'node:net';
import https from 'node:https';
import crypto from 'node:crypto';
import path from 'node:path';
import { importJWK, CompactSign } from 'jose';
import { verifyInternalToken, JwksCache } from '../../lib/jwt.js';
import { RevocationClient } from '../../lib/revocation.js';
import { opaqueId } from '../../lib/ids.js';
import { x5tS256 } from '../../lib/pki.js';
import { request } from '../../lib/http.js';

/** TCP redirector: target 'sts' | 'attacker' | 'blackhole'. Switching drops established connections. */
export class Redirector {
  constructor({ port, stsPort, attackerPort }) { Object.assign(this, { port, stsPort, attackerPort, mode: 'sts', socks: new Set(), log: [] }); }
  start() {
    this.server = net.createServer((c) => {
      this.socks.add(c);
      c.on('close', () => this.socks.delete(c));
      c.on('error', () => {});
      if (this.mode === 'blackhole') { c.on('data', () => {}); return; }
      const up = net.connect(this.mode === 'attacker' ? this.attackerPort : this.stsPort, '127.0.0.1');
      this.socks.add(up);
      up.on('close', () => this.socks.delete(up));
      up.on('error', () => c.destroy());
      c.on('close', () => up.destroy());
      c.pipe(up).pipe(c);
    });
    return new Promise((ok, ko) => { this.server.once('error', ko); this.server.listen(this.port, '127.0.0.1', ok); });
  }
  set(mode) { this.mode = mode; for (const s of this.socks) s.destroy(); this.log.push({ t: new Date().toISOString(), mode }); }
  stop() { for (const s of this.socks) s.destroy(); return new Promise((r) => this.server.close(() => r())); }
}

/** Attacker HTTPS server publishing a JWK Set; certificate chosen per variant (restart to change it). */
export class AttackerJwks {
  constructor({ port }) { this.port = port; this.body = { keys: [] }; this.hits = 0; }
  async start({ cert, key }) {
    if (this.server) await this.stop();
    this.server = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key), requestCert: false }, (req, res) => {
      this.hits++;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(this.body));
    });
    await new Promise((ok, ko) => { this.server.once('error', ko); this.server.listen(this.port, '127.0.0.1', ok); });
  }
  stop() { const s = this.server; this.server = null; return s ? new Promise((r) => { s.closeAllConnections?.(); s.close(() => r()); }) : Promise.resolve(); }
}

/** Test-only signer over the run's key stores (sts-at-keys.json / tts-txn-keys.json). */
export class StoreSigner {
  constructor(topo) { this.topo = topo; this.cache = new Map(); this.snap = { at: null, txn: null }; }
  file(store) { return path.join(this.topo.secretsDir, store === 'txn' ? 'tts-txn-keys.json' : 'sts-at-keys.json'); }
  async refresh(store) {
    try {
      const raw = fs.readFileSync(this.file(store), 'utf8');
      const saved = JSON.parse(raw);
      this.snap[store] = saved.keys.map(({ kid, alg, state, retain, privateJwk }) => ({ kid, alg, state, retain, privateJwk }));
    } catch { /* partially written: keep the previous snapshot */ }
    return this.snap[store];
  }
  async keyObj(k) {
    if (!this.cache.has(k.kid)) this.cache.set(k.kid, await importJWK(k.privateJwk, k.alg));
    return this.cache.get(k.kid);
  }
  async active(store) { const ks = await this.refresh(store); return ks.find((k) => k.state === 'active'); }
  async byKid(store, kid) { const ks = (this.snap[store] || await this.refresh(store)); return ks.find((k) => k.kid === kid) || (await this.refresh(store)).find((k) => k.kid === kid); }
  async sign(store, k, payload, extraHeader = {}) {
    const header = { alg: k.alg, typ: store === 'txn' ? 'txntoken+jwt' : 'at+jwt', kid: k.kid, ...extraHeader };
    return new CompactSign(Buffer.from(JSON.stringify(payload))).setProtectedHeader(header).sign(await this.keyObj(k));
  }
}

export function harnessX5t(topo) { return x5tS256(new crypto.X509Certificate(fs.readFileSync(topo.workloads.harness.cert)).raw); }

export function atClaims(topo, { sub, tid, aud, cnfX5t, ttl = 10 }) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: topo.issuers.sts, sub, aud, exp: now + ttl, iat: now, jti: opaqueId(), client_id: topo.clients.bff.clientId,
    scope: 'files.read', tid, ptype: 'human', acr: 'L2', amr: ['pwd', 'otp'], auth_time: now - 10, sid: opaqueId(), gref: opaqueId(),
    ...(cnfX5t ? { cnf: { 'x5t#S256': cnfX5t } } : {}), ver: '1.0',
  };
}

export function txnClaims(topo, { sub, tid, ttl = 10 }) {
  const now = Math.floor(Date.now() / 1000);
  return { iss: topo.issuers.tts, aud: topo.txnAudience, iat: now, exp: now + ttl, txn: opaqueId(), sub, scope: 'op.file.read', req_wl: topo.workloads.edge.spiffeId, tctx: { tid, root_jti: opaqueId(), tier: 'read-sensitive', ver: '1.0', gref: opaqueId(), sid: opaqueId() } };
}

/**
 * In-process verification point. kind 'at' | 'txn'; push: use the revocation state (kid revocation, placement);
 * pin: JWKS server identity pin (RK-03). JWKS is fetched through `jwksBase` (the redirector).
 */
export function makeVerifier({ topo, tls, name, kind, ttlMs, push, pin = true, rev, jwksBase, algs }) {
  const jwks = new JwksCache({ tls, ttlMs, unknownKidMinIntervalMs: 500 });
  const iss = kind === 'txn' ? topo.issuers.tts : topo.issuers.sts;
  const jwksUrl = `${jwksBase}${kind === 'txn' ? '/tts/jwks' : '/jwks'}`;
  return {
    name, kind, ttlMs, push, pin, jwks,
    async verify(token) {
      try {
        await verifyInternalToken(token, {
          kind, audience: kind === 'txn' ? topo.txnAudience : topo.audiences.file,
          issuers: { [iss]: { jwksUrl, jwksPeer: pin ? topo.workloads.sts.spiffeId : undefined, algs: typeof algs === 'function' ? algs(kind) : (algs || ['ES256']), cell: topo.cellId } },
          jwks, skewSec: 10, acceptedMajors: [1],
          ...(push ? { isKidRevoked: (kid) => rev.kidRevoked(kid), tenantCell: (tid) => rev.tenantCell(tid) } : {}),
        });
        return { ok: true };
      } catch (e) { return { ok: false, code: e.code || e.message }; }
    },
  };
}

export function makeRevocation(topo, tls) { return new RevocationClient({ url: topo.urls.state, tls, pollMs: 200 }); }

/** Present an at+jwt directly to the file-service PEP (harness mTLS; token cnf bound to the harness certificate). */
export async function presentToPep(topo, tls, token, { tid, fileId }) {
  try {
    const r = await request(`${topo.urls.file}/t/${tid}/files/${fileId}`, { tls, headers: { authorization: `Bearer ${token}` }, timeoutMs: 5000 });
    return r.status;
  } catch (e) { return 0; }
}

/** Last N lines of the file-service PEP local enforcement log (for reject reasons). */
export function pepLog(runDir, svc = 'file-service') {
  const f = path.join(runDir, 'pep', `${svc}-enforce.jsonl`);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
