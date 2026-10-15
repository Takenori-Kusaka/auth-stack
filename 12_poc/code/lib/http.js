// Minimal HTTP(S) server/client helpers on node:http / node:https (no framework).
import http from 'node:http';
import https from 'node:https';
import tlsMod from 'node:tls';
import fs from 'node:fs';
import { URL } from 'node:url';

const MAX_BODY = 1024 * 1024;

export function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function readJson(req) {
  const t = await readBody(req);
  if (!t) return undefined;
  try { return JSON.parse(t); } catch { throw Object.assign(new Error('invalid JSON'), { status: 400 }); }
}

export async function readForm(req) {
  const t = await readBody(req);
  const params = new URLSearchParams(t);
  const out = {};
  for (const [k, v] of params) {
    if (k in out) out[k] = Array.isArray(out[k]) ? [...out[k], v] : [out[k], v];
    else out[k] = v;
  }
  return out;
}

export function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  const isBuf = Buffer.isBuffer(body);
  const payload = body === undefined ? '' : isBuf || typeof body === 'string' ? body : JSON.stringify(body);
  const h = { ...headers };
  if (!h['content-type'] && body !== undefined) {
    h['content-type'] = isBuf ? 'application/octet-stream' : typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json';
  }
  res.writeHead(status, h);
  res.end(payload);
}

/** Tiny router: add(method, '/a/:x/b', handler). Handler gets (req, res, params, url). */
export function router() {
  const routes = [];
  const r = {
    add(method, pattern, handler) {
      const keys = [];
      const re = new RegExp('^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }).replace(/\*$/, '.*') + '$');
      routes.push({ method, re, keys, handler });
      return r;
    },
    async handle(req, res) {
      const url = new URL(req.url, 'https://local');
      for (const rt of routes) {
        if (rt.method !== req.method && rt.method !== '*') continue;
        const m = rt.re.exec(url.pathname);
        if (!m) continue;
        const params = {};
        rt.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return rt.handler(req, res, params, url);
      }
      return send(res, 404, 'not found');
    },
  };
  return r;
}

/**
 * Create a server. tls: { key, cert, ca, mtls: 'required'|'optional'|'none' } (paths). Without tls -> plain http.
 */
export function createServer({ tls, handler, onError }) {
  const wrapped = async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      if (onError) onError(e, req);
      if (!res.headersSent) send(res, e.status || 500, e.status ? e.message : 'internal error');
    }
  };
  if (!tls) return http.createServer(wrapped);
  const mtls = tls.mtls || 'none';
  const srv = https.createServer({
    key: fs.readFileSync(tls.key),
    cert: fs.readFileSync(tls.cert),
    ca: tls.ca ? [].concat(tls.ca).map((p) => fs.readFileSync(p)) : undefined,
    requestCert: mtls !== 'none',
    rejectUnauthorized: mtls === 'required',
    minVersion: 'TLSv1.2',
  }, wrapped);
  srv.keepAliveTimeout = 5000;
  return srv;
}

export function listen(server, port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

const agents = new Map();
function agentFor(tls, expectSpiffeId) {
  const key = JSON.stringify(tls || {}) + (expectSpiffeId ? `|pin:${expectSpiffeId}` : '');
  if (!agents.has(key)) {
    const opts = { keepAlive: true, maxSockets: 256 };
    if (tls) {
      if (tls.ca) opts.ca = [].concat(tls.ca).map((p) => fs.readFileSync(p));
      if (tls.key) opts.key = fs.readFileSync(tls.key);
      if (tls.cert) opts.cert = fs.readFileSync(tls.cert);
      if (tls.insecure) opts.rejectUnauthorized = false;
    }
    // RK-03 server identity pin, checked during the full TLS handshake. A separate agent per pin keeps the TLS
    // session cache per verified identity, so resumed sessions (no peer certificate available) stay pinned.
    if (expectSpiffeId) {
      opts.checkServerIdentity = (host, cert) => {
        const err = tlsMod.checkServerIdentity(host, cert);
        if (err) return err;
        const uris = String(cert.subjectaltname || '').split(', ').filter((x) => x.startsWith('URI:')).map((x) => x.slice(4));
        if (uris.length !== 1 || uris[0] !== expectSpiffeId) return Object.assign(new Error(`peer identity mismatch (${uris.join(',') || 'none'})`), { code: 'EPEERID' });
        return undefined;
      };
    }
    agents.set(key, new https.Agent(opts));
  }
  return agents.get(key);
}

/**
 * HTTP(S) request. Returns { status, headers, text, json() }.
 * opts: { method, headers, body (string|Buffer|object -> JSON), form (object -> urlencoded), tls, timeoutMs }
 */
export function request(urlStr, opts = {}) {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;
  const headers = { ...(opts.headers || {}) };
  let body = opts.body;
  if (opts.form) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.form)) {
      if (v === undefined || v === null) continue;
      for (const vv of [].concat(v)) p.append(k, String(vv));
    }
    body = p.toString();
    headers['content-type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined && typeof body === 'object' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
    headers['content-type'] = headers['content-type'] || 'application/json';
  }
  if (body !== undefined) headers['content-length'] = Buffer.byteLength(body);
  return new Promise((resolve, reject) => {
    const req = lib.request({
      method: opts.method || (body !== undefined ? 'POST' : 'GET'),
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers,
      agent: isHttps ? agentFor(opts.tls, opts.expectSpiffeId) : undefined,
      servername: isHttps && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ? url.hostname : undefined,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const text = buf.toString('utf8');
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text,
          buffer: buf,
          json() { try { return JSON.parse(text); } catch { return undefined; } },
        });
      });
      res.on('error', reject);
    });
    if (opts.timeoutMs) {
      req.setTimeout(opts.timeoutMs, () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
      // RK-08: overall deadline. ClientRequest#setTimeout only starts once the socket is connected, so a slow
      // connection set-up (FM-01 on the PEP -> PDP link) was not bounded by the deadline D(t).
      const deadline = setTimeout(() => req.destroy(Object.assign(new Error('deadline exceeded'), { code: 'ETIMEDOUT' })), opts.timeoutMs);
      deadline.unref?.();
      req.on('close', () => clearTimeout(deadline));
    }
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

/** Peer certificate of an incoming mTLS connection (or null). */
export function peerCert(req) {
  const sock = req.socket;
  if (!sock || typeof sock.getPeerCertificate !== 'function') return null;
  const c = sock.getPeerCertificate(false);
  if (!c || !c.raw) return null;
  return { ...c, authorized: sock.authorized };
}
