// P-14 reference implementation (integration-patterns.md P-14, ADR-006 D6-14): a WebSocket stream gateway (the
// SDK-side termination, PP-7) and a minimal WebSocket client. RFC 6455 framing is implemented directly (no
// dependency). The gateway authenticates the connection with an internal access token (V1–V14 via lib/jwt.js,
// audience = label-service, sender-constrained to the mTLS client certificate), binds the tenant (token tid =
// resource-derived tenant), authorizes the subscription at the PDP façade, and then
//   - closes the connection when the revocation state matches the token (state-store epoch subscription),
//   - re-authorizes the subscription every iConnMs at the façade (read-sensitive),
//   - closes at min(token exp, L_conn).
import fs from 'node:fs';
import https from 'node:https';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { request } from '../../../lib/http.js';
import { verifyInternalToken, JwksCache } from '../../../lib/jwt.js';
import { RevocationClient } from '../../../lib/revocation.js';
import { clientTls } from '../../../lib/topology.js';
import { x5tS256 } from '../../../lib/pki.js';
import { opaqueId, jtiRef } from '../../../lib/ids.js';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC11B65';
function frame(opcode, payload) {
  const p = Buffer.from(payload);
  let h;
  if (p.length < 126) h = Buffer.from([0x80 | opcode, p.length]);
  else { h = Buffer.alloc(4); h[0] = 0x80 | opcode; h[1] = 126; h.writeUInt16BE(p.length, 2); }
  return Buffer.concat([h, p]);
}
const closeFrame = (code, reason) => { const b = Buffer.alloc(2 + Buffer.byteLength(reason)); b.writeUInt16BE(code, 0); b.write(reason, 2); return frame(0x8, b); };

export class StreamGateway {
  constructor({ topo, secrets, port, files, iConnMs = 500, lConnMs = 60_000, tickMs = 100, allowedOrigins = ['https://app.poc.test'], log = () => {} }) {
    Object.assign(this, { topo, secrets, port, files, iConnMs, lConnMs, tickMs, allowedOrigins, log });
    this.tls = clientTls(topo, 'label-service');
    this.jwks = new JwksCache({ tls: this.tls, ttlMs: 300_000 });
    this.rev = new RevocationClient({ url: topo.urls.state, tls: this.tls, pollMs: topo.settings.revocationPollMs, onEpoch: () => this.onEpoch() });
    this.conns = new Set();
    this.events = [];
    this.kCorr = Buffer.from(secrets.kCorr, 'hex');
  }
  ev(e) { this.events.push({ t: Date.now(), ...e }); }
  async start() {
    await this.rev.start();
    this.server = https.createServer({ key: fs.readFileSync(this.topo.workloads['label-service'].key), cert: fs.readFileSync(this.topo.workloads['label-service'].cert), ca: [fs.readFileSync(this.topo.pki.ca)], requestCert: true, rejectUnauthorized: false });
    this.server.on('request', (req, res) => { res.writeHead(426); res.end(); });
    this.server.on('upgrade', (req, socket) => this.onUpgrade(req, socket).catch((e) => { this.ev({ ev: 'error', e: e.message }); socket.destroy(); }));
    await new Promise((ok) => this.server.listen(this.port, '127.0.0.1', ok));
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.reauth = setInterval(() => this.reauthorize(), this.iConnMs);
    return this;
  }
  reject(socket, status, why) { this.ev({ ev: 'handshake_rejected', status, why }); socket.end(`HTTP/1.1 ${status} ${status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found' : 'Service Unavailable'}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n`); }
  async evaluate(c) {
    const rid = opaqueId();
    try {
      const r = await request(`${this.topo.urls.pdp}/access/v1/evaluation`, { tls: this.tls, timeoutMs: 2000, headers: { 'x-request-id': rid }, body: { subject: { type: 'core/user', id: c.claims.sub, properties: { tid: c.tid, principal_type: c.claims.ptype, acr: c.claims.acr, auth_time: c.claims.auth_time } }, action: { name: 'read' }, resource: { type: 'files/file', id: c.fileId, properties: { tid: c.tid } }, context: { 'x-authz-profile': { profile_version: '1.0' } } } });
      const p = r.json()?.context?.['x-authz-profile'];
      if (r.status !== 200 || r.headers['x-request-id'] !== rid || !p?.decision_id) return { allow: false, unavailable: true };
      return { allow: r.json().decision === true && p.reason === 'allow', reason: p.reason };
    } catch { return { allow: false, unavailable: true }; }
  }
  async onUpgrade(req, socket) {
    const url = new URL(req.url, 'https://local');
    if (url.searchParams.has('access_token')) return this.reject(socket, 401, 'token_in_query'); // NP14-4
    if (!this.allowedOrigins.includes(req.headers.origin)) return this.reject(socket, 403, 'origin'); // NP14-3
    const m = /^\/t\/([^/]+)\/files\/([^/]+)\/stream$/.exec(url.pathname);
    if (!m) return this.reject(socket, 404, 'no_route');
    const [, routeTid, fileId] = m;
    const tok = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!tok) return this.reject(socket, 401, 'no_token');
    const pc = socket.getPeerCertificate && socket.getPeerCertificate();
    let v;
    try {
      v = await verifyInternalToken(tok, { kind: 'at', audience: this.topo.audiences.label, issuers: { [this.topo.issuers.sts]: { jwksUrl: `${this.topo.urls.sts}/jwks`, algs: ['ES256'], cell: this.topo.cellId } }, jwks: this.jwks, skewSec: 10, acceptedMajors: [1], requireCnf: true, isKidRevoked: (k) => this.rev.kidRevoked(k), tenantCell: (t) => this.rev.tenantCell(t) }, { peerX5t: pc && pc.raw ? x5tS256(pc.raw) : undefined });
    } catch (e) { return this.reject(socket, 401, `verify:${e.code}`); }
    const claims = v.payload;
    const jref = jtiRef(this.kCorr, claims.iss, claims.jti);
    if (this.rev.revoked({ sub: claims.sub, sid: claims.sid, gref: claims.gref, client_id: claims.client_id, tid: claims.tid, jti_ref: jref }, claims.iat)) return this.reject(socket, 401, 'revoked');
    const f = this.files.get(fileId);
    if (!f) return this.reject(socket, 404, 'l0_not_found');
    if (routeTid !== claims.tid || f.tid !== claims.tid) return this.reject(socket, 404, 'l0_mismatch');
    const c = { id: opaqueId(8), claims, jref, tid: claims.tid, fileId, socket, openedAt: Date.now(), maxUntil: Math.min(claims.exp * 1000, Date.now() + this.lConnMs), seq: 0, open: true };
    const d = await this.evaluate(c);
    if (!d.allow) return this.reject(socket, d.unavailable ? 503 : 404, d.unavailable ? 'pdp_unavailable' : `deny:${d.reason}`);
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nupgrade: websocket\r\nconnection: Upgrade\r\nsec-websocket-accept: ${accept}\r\n\r\n`);
    socket.on('data', () => {}); socket.on('error', () => {}); socket.on('close', () => { c.open = false; this.conns.delete(c); });
    this.conns.add(c);
    this.ev({ ev: 'connected', conn: c.id });
  }
  close(c, code, reason) { if (!c.open) return; c.open = false; this.conns.delete(c); try { c.socket.write(closeFrame(code, reason)); c.socket.end(); } catch { /* gone */ } this.ev({ ev: 'closed', conn: c.id, code, reason }); }
  tick() { const now = Date.now(); for (const c of [...this.conns]) { if (now >= c.maxUntil) { this.close(c, 4001, 'expired'); continue; } try { c.socket.write(frame(0x1, JSON.stringify({ seq: c.seq++, t: now, file: c.fileId }))); } catch { this.close(c, 1011, 'write_failed'); } } }
  onEpoch() { for (const c of [...this.conns]) { const cl = c.claims; if (this.rev.revoked({ sub: cl.sub, sid: cl.sid, gref: cl.gref, client_id: cl.client_id, tid: cl.tid, jti_ref: c.jref }, cl.iat) || this.rev.subjectSuspended(cl.sub) || this.rev.tenantSuspended(c.tid)) this.close(c, 4002, 'revoked'); } }
  async reauthorize() { for (const c of [...this.conns]) { if (this.rev.stale(this.topo.settings.mRevMs)) { this.close(c, 4004, 'revocation_state_stale'); continue; } const d = await this.evaluate(c); if (!c.open) continue; if (!d.allow) this.close(c, d.unavailable ? 1013 : 4003, d.unavailable ? 'pdp_unavailable' : 'reauthorization_denied'); } }
  async stop() { clearInterval(this.timer); clearInterval(this.reauth); this.rev.stop(); for (const c of [...this.conns]) this.close(c, 1001, 'shutdown'); await new Promise((ok) => this.server.close(ok)); }
}

/** Minimal WebSocket client over mTLS. Returns { status, messages: [{t, seq}], closed: {t, code, reason} | null, close() } */
export function wsConnect({ port, path, token, tlsOpts, origin = 'https://app.poc.test', extraHeaders = {} }) {
  return new Promise((resolve) => {
    const sock = tls.connect({ host: '127.0.0.1', port, key: fs.readFileSync(tlsOpts.key), cert: fs.readFileSync(tlsOpts.cert), ca: [fs.readFileSync(tlsOpts.ca)], servername: undefined, rejectUnauthorized: true, checkServerIdentity: () => undefined });
    const key = crypto.randomBytes(16).toString('base64');
    const out = { status: null, messages: [], closed: null, close: () => sock.destroy() };
    let buf = Buffer.alloc(0), upgraded = false, settled = false;
    const settle = () => { if (!settled) { settled = true; resolve(out); } };
    sock.on('secureConnect', () => {
      const h = { host: `127.0.0.1:${port}`, upgrade: 'websocket', connection: 'Upgrade', 'sec-websocket-key': key, 'sec-websocket-version': '13', origin, ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders };
      sock.write(`GET ${path} HTTP/1.1\r\n${Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
    });
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const i = buf.indexOf('\r\n\r\n');
        if (i < 0) return;
        out.status = Number(/^HTTP\/1\.1 (\d+)/.exec(buf.slice(0, i).toString())?.[1]);
        buf = buf.slice(i + 4);
        if (out.status !== 101) { settle(); sock.destroy(); return; }
        upgraded = true;
        settle();
      }
      while (buf.length >= 2) {
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        if (op === 0x1) { const j = JSON.parse(payload.toString()); out.messages.push({ t: Date.now(), seq: j.seq, sent_t: j.t }); }
        else if (op === 0x8) { out.closed = { t: Date.now(), code: payload.length >= 2 ? payload.readUInt16BE(0) : null, reason: payload.slice(2).toString() }; sock.end(); }
      }
    });
    sock.on('error', () => settle());
    sock.on('close', () => { if (!out.closed && upgraded) out.closed = { t: Date.now(), code: null, reason: 'socket_closed' }; settle(); });
  });
}
