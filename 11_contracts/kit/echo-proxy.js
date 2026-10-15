#!/usr/bin/env node
// echo-proxy.js -- CON-11 v1.1 (I-1, P-01). Test-only reverse proxy placed in front of a generic mock
// (Prism etc.) that was started from the 11_contracts OpenAPI files.
//
// WHY: a generic mock answers with static examples. A PEP that follows the contracts faithfully then
// fails closed on every positive request (13_integration-trial/report.md P-01): the X-Request-ID echo
// does not match, a `Deprecation: string` placeholder breaks the header pattern, the allow example is
// weaker than the consistency the write path requested, `evaluations` has a fixed length, and the PDP
// metadata names a placeholder host instead of the URL the PEP fetched it from. This proxy repairs only
// those transport-level gaps so that the SUT's own checks can stay ON. It never invents a decision:
// `decision` values are copied from the mock's examples (R5 only repeats existing items).
//
// IT IS NOT A MOCK OF THE PLATFORM AND NOT A KIT RESULT. Results obtained through this proxy are
// "positive-shape checks" only (CON-11 §4.10, §16.2 #8). Negative vectors run against MK-01..MK-08
// (DL-120) or against your own stubs (kit/README.md).
//
// Safety: listens on loopback only and refuses non-loopback upstreams, so it cannot be pointed at a
// shared sandbox, the PoC platform or production. Business ports get no extra paths or headers
// (CON-11 MK-P4); every rewrite is written as one JSON line to the log (stderr or --log file).
//
// Usage (Node.js >= 22, no dependencies):
//   node echo-proxy.js --target http://127.0.0.1:4010 --listen 127.0.0.1:4110 [options]
// Options:
//   --target URL            upstream generic mock (loopback only)                     [required]
//   --listen HOST:PORT      where the SUT connects (loopback only)              [127.0.0.1:0]
//   --public-base URL       base URL the SUT uses for this proxy (R3)       [http://<listen>]
//   --log FILE              append JSON-lines rewrite log to FILE                    [stderr]
//   --fill cycle|first      R5: how to extend a short `evaluations` array             [cycle]
//   --prefer "METHOD PATH=VALUE"  add `Prefer: VALUE` upstream for that route (repeatable),
//                           e.g. --prefer "POST /access/v1/evaluation=example=allowWrite"
//   --no-echo --no-placeholder-headers --no-metadata --no-consistency --no-fill
//   --no-fresh-decision-id  disable R1/R2/R3/R4/R5/R6 individually
//   --no-search-type        disable R8 (v1.1 sync: search results[].type follows the request type)
//   --no-txn-remint         disable R9 (v1.2, M-2: re-mint the CON-05 /txn-token example with the test key)
//   --no-acceptance         disable R10 (v1.2, M-2: fresh job_run_id / origin_txn on /acceptance-records)
//
// v1.2 (13_integration-trial/room-booking/report.md M-2): a generic mock started from CON-05 returns the
// static Txn-Token example, which is already expired (exp = iat + 60) and whose tid/sub/ptxn do not match the
// request, so the internal-start positive path could not pass. R10 records the identity carried by the
// Txn-Token presented to registerAcceptanceRecord and returns a fresh job_run_id; R9 re-mints the /txn-token
// example (fresh iat/exp/txn, aud/scope from the request, sub/tid/root_jti/gref/ptxn from the subject_token or
// from the R10 record) and signs it with the CON-05 info.x-test-signing-key (kid test-only-tts-c07-01), which
// the CON-05 /txn-token-jwks example already publishes. The test key is public, so these signatures prove
// nothing; production profiles reject kid test-only-* (CON-05 section 8). The proxy never verifies tokens --
// that is the SUT's job -- and it never logs a whole token (only kid and txn).
// Environment: ECHO_PROXY_ARGS may hold the same options (split on whitespace) for CI files.

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';

const VERSION = '0.3.0'; // kit/echo-proxy.js version (CON-11 v1.1; 0.2.0 adds R8 in the v1.1 sync, CON-03 §12 N-2 (c); 0.3.0 adds R9/R10 in v1.2, room-booking M-2). Not the kit (DL-120) version.

// ---------- options ----------
function parseArgs(argv) {
  const o = {
    target: null, listen: '127.0.0.1:0', publicBase: null, log: null, fill: 'cycle', prefer: [],
    echo: true, placeholderHeaders: true, metadata: true, consistency: true, fillOn: true, freshDecisionId: true, searchType: true, txnRemint: true, acceptance: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(`missing value for ${a}`); return v; };
    switch (a) {
      case '--target': o.target = next(); break;
      case '--listen': o.listen = next(); break;
      case '--public-base': o.publicBase = next(); break;
      case '--log': o.log = next(); break;
      case '--fill': o.fill = next(); break;
      case '--prefer': {
        const v = next(); const eq = v.indexOf('=');
        if (eq < 0) throw new Error(`--prefer expects "METHOD PATH=VALUE": ${v}`);
        const [method, path] = v.slice(0, eq).trim().split(/\s+/);
        o.prefer.push({ method: method.toUpperCase(), path, value: v.slice(eq + 1) });
        break;
      }
      case '--no-echo': o.echo = false; break;
      case '--no-placeholder-headers': o.placeholderHeaders = false; break;
      case '--no-metadata': o.metadata = false; break;
      case '--no-consistency': o.consistency = false; break;
      case '--no-fill': o.fillOn = false; break;
      case '--no-fresh-decision-id': o.freshDecisionId = false; break;
      case '--no-search-type': o.searchType = false; break;
      case '--no-txn-remint': o.txnRemint = false; break;
      case '--no-acceptance': o.acceptance = false; break;
      case '--version': console.log(VERSION); process.exit(0); break;
      case '-h': case '--help': console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').filter((l) => l.startsWith('//')).join('\n')); process.exit(0); break;
      default: throw new Error(`unknown option ${a}`);
    }
  }
  if (!o.target) throw new Error('--target is required');
  if (!['cycle', 'first'].includes(o.fill)) throw new Error('--fill must be cycle or first');
  return o;
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
function assertLoopbackHost(host, what) {
  if (!LOOPBACK.has(host)) throw new Error(`${what} must be loopback (got ${host}); this proxy is for local generic mocks only`);
}

// ---------- helpers ----------
const MODE_RANK = { minimize_latency: 0, at_least_as_fresh: 1, fully_consistent: 2 }; // CON-03 ConsistencyMode
const WRITE_OR_ABOVE = /^(write|privileged|break-glass)/; // CON-02 OperationTier
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
// 26 chars of lower base32: fits CON-02 OpaqueId (printable ASCII 1..64) and the shape of the CON-03 examples.
function opaqueId() { const b = crypto.randomBytes(26); let s = ''; for (const x of b) s += B32[x & 31]; return s; }
const DEPRECATION_RE = /^@-?[0-9]{1,15}$/; // CON-03 components.headers / x-conditional-response-headers
const isHttpDate = (v) => /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(v) && !Number.isNaN(Date.parse(v));
const HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'content-length', 'proxy-connection', 'upgrade', 'te', 'trailer']);


// ---------- v1.2: CON-05 test key (R9/R10) ----------
// Copied from 11_contracts/token-exchange.openapi.yaml info.x-test-signing-key (CON-05 v1.1, I-9). Test only:
// the private part is published in the contract, so a signature made with it is not evidence of anything.
const TTS_TEST_KID = 'test-only-tts-c07-01';
const TTS_TEST_JWK = { kty: 'EC', crv: 'P-256', x: 'quEADo3I33Cyq9_fQEwLm_QZaVL38FDQNEshjig6rkg', y: 'eM9udSIVg2klnfEAZl0X6_YwTZuUYS-zz0Xy8R35vpw', d: 'SVVvB-LrBoh6-w4hi2OxS2BuGG2Jej3c69CQcDx1Srk' };
const URN_ACCESS_TOKEN = 'urn:ietf:params:oauth:token-type:access_token';
const URN_INTERNAL_START = 'urn:uuid:569d2793-a1dc-493e-a1ef-ca2904f77173'; // CON-05 v1.1 internal-start subject_token_type
let ttsKey = null;
function ttsPrivateKey() { if (!ttsKey) ttsKey = crypto.createPrivateKey({ key: TTS_TEST_JWK, format: 'jwk' }); return ttsKey; }
const b64u = (buf) => Buffer.from(buf).toString('base64url');
function decodeJwtPart(tok, i) { try { return JSON.parse(Buffer.from(String(tok).split('.')[i], 'base64url').toString('utf8')); } catch { return null; } }
function signEs256(header, payload) {
  const input = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const sig = crypto.sign('sha256', Buffer.from(input), { key: ttsPrivateKey(), dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64u(sig)}`;
}
const nowSec = () => Math.floor(Date.now() / 1000);

function profileOf(o) { return o && typeof o === 'object' ? o.context?.['x-authz-profile'] : undefined; }

function wantedMode(reqItem, reqTop) {
  // Per item first (evaluations[i].context), then the top-level context; fall back to the tier default
  // only for write-or-above (CON-03 §7 / ADR-011 D6-3: write and above are fully_consistent).
  const p = profileOf(reqItem) || {}; const t = profileOf(reqTop) || {};
  const mode = p.consistency?.mode || t.consistency?.mode;
  if (mode && mode in MODE_RANK) return mode;
  const tier = p.operation_tier || t.operation_tier || reqItem?.operation_tier || reqTop?.operation_tier;
  if (typeof tier === 'string' && WRITE_OR_ABOVE.test(tier)) return 'fully_consistent';
  return null;
}

// ---------- main ----------
function main() {
  const envArgs = (process.env.ECHO_PROXY_ARGS || '').split(/\s+/).filter(Boolean);
  let opt;
  try { opt = parseArgs([...envArgs, ...process.argv.slice(2)]); } catch (e) { console.error(`echo-proxy: ${e.message}`); process.exit(2); }
  const target = new URL(opt.target);
  const [lhost, lportStr] = opt.listen.startsWith('[') ? [opt.listen.slice(0, opt.listen.indexOf(']') + 1), opt.listen.split(']:')[1]] : opt.listen.split(':');
  try { assertLoopbackHost(target.hostname, '--target'); assertLoopbackHost(lhost, '--listen'); } catch (e) { console.error(`echo-proxy: ${e.message}`); process.exit(2); }

  const logStream = opt.log ? fs.createWriteStream(opt.log, { flags: 'a' }) : process.stderr;
  const log = (rec) => logStream.write(JSON.stringify({ t: new Date().toISOString(), proxy: 'kit/echo-proxy.js', v: VERSION, ...rec }) + '\n');

  let publicBase = opt.publicBase;
  // R10 -> R9: job_run_id -> identity taken from the Txn-Token presented to registerAcceptanceRecord (memory only)
  const acceptance = new Map();

  const server = http.createServer(async (req, res) => {
    const rid = crypto.randomUUID();
    const rewrites = [];
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      const reqBuf = Buffer.concat(chunks);
      let reqJson = null; try { reqJson = reqBuf.length ? JSON.parse(reqBuf.toString('utf8')) : null; } catch { /* not JSON */ }
      const url = new URL(req.url, 'http://x');
      const path = url.pathname;

      // upstream request: same method, path, headers and body (+ optional Prefer)
      const headers = {};
      for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k) && k !== 'host') headers[k] = v;
      const pref = opt.prefer.find((p) => p.method === req.method && p.path === path);
      if (pref && !headers.prefer) { headers.prefer = pref.value; rewrites.push({ rule: 'R7-prefer', value: pref.value }); }
      const up = await fetch(new URL(req.url, target), { method: req.method, headers, body: reqBuf.length ? reqBuf : undefined, redirect: 'manual' });

      const out = {};
      // fetch() already decoded any content-encoding, so the header must not be forwarded
      up.headers.forEach((v, k) => { if (!HOP.has(k) && k !== 'content-encoding') out[k] = v; });
      let body = Buffer.from(await up.arrayBuffer());

      // R1: X-Request-ID echo (AuthZEN 1.0 §10.1.3 MUST; CON-03 XRequestIdEcho)
      if (opt.echo) {
        const sent = req.headers['x-request-id'];
        if (sent !== undefined && out['x-request-id'] !== sent) { rewrites.push({ rule: 'R1-echo', from: out['x-request-id'] ?? null, to: sent }); out['x-request-id'] = sent; }
        if (sent === undefined && out['x-request-id'] !== undefined) { rewrites.push({ rule: 'R1-echo-drop', from: out['x-request-id'] }); delete out['x-request-id']; }
      }
      // R2: placeholder headers generated from schemas without examples (e.g. `Deprecation: string`)
      if (opt.placeholderHeaders) {
        for (const k of Object.keys(out)) {
          const v = out[k];
          const bad = (k === 'deprecation' && !DEPRECATION_RE.test(v)) || (k === 'sunset' && !isHttpDate(v)) || (v === 'string' && k !== 'content-type');
          if (bad) { rewrites.push({ rule: 'R2-placeholder-header', header: k, value: v }); delete out[k]; }
        }
      }

      const isJson = (out['content-type'] || '').includes('json');
      let json = null; if (isJson && body.length) { try { json = JSON.parse(body.toString('utf8')); } catch { /* leave as is */ } }

      // R3: PDP metadata -- policy_decision_point must equal the identifier the PEP used (AuthZEN 1.0 §9.2.3)
      if (opt.metadata && json && req.method === 'GET' && path === '/.well-known/authzen-configuration' && up.status === 200) {
        const base = publicBase || `http://${req.headers.host}`;
        const old = json.policy_decision_point;
        if (typeof old === 'string' && old !== base) {
          for (const [k, v] of Object.entries(json)) {
            if (typeof v === 'string' && (v === old || v.startsWith(old.replace(/\/$/, '') + '/'))) {
              const nv = base.replace(/\/$/, '') + v.slice(old.replace(/\/$/, '').length);
              rewrites.push({ rule: 'R3-metadata', field: k, from: v, to: k === 'policy_decision_point' ? base : nv });
              json[k] = k === 'policy_decision_point' ? base : nv;
            }
          }
        }
      }

      const isEval = req.method === 'POST' && /\/access\/v1\/evaluations?$/.test(path) && up.status === 200 && json && reqJson;
      if (isEval) {
        const batch = path.endsWith('/evaluations') && Array.isArray(reqJson.evaluations) && reqJson.evaluations.length > 0;
        // R5: evaluations length must equal the request's (AuthZEN 1.0 §7: one decision per request item, in order)
        if (opt.fillOn && batch && Array.isArray(json.evaluations) && json.evaluations.length > 0 && json.evaluations.length !== reqJson.evaluations.length) {
          const src = json.evaluations; const n = reqJson.evaluations.length;
          json.evaluations = Array.from({ length: n }, (_, i) => structuredClone(opt.fill === 'first' ? src[0] : src[i % src.length]));
          rewrites.push({ rule: 'R5-evaluations-length', from: src.length, to: n, fill: opt.fill });
        }
        const items = batch && Array.isArray(json.evaluations) ? json.evaluations.map((d, i) => [d, reqJson.evaluations[i] || {}]) : [[json, reqJson]];
        for (const [i, [dec, reqItem]] of items.entries()) {
          const p = profileOf(dec); if (!p) continue;
          // R4: never weaker than requested (CON-03 §7: a weaker effective mode is "no decision";
          // the facade upgrades, never downgrades -- ADR-011 D6-3)
          if (opt.consistency && p.consistency?.mode in MODE_RANK) {
            const want = wantedMode(reqItem, reqJson);
            if (want && MODE_RANK[p.consistency.mode] < MODE_RANK[want]) { rewrites.push({ rule: 'R4-consistency', item: i, from: p.consistency.mode, to: want }); p.consistency.mode = want; }
          }
          // R6: a fresh decision_id per decision (static examples repeat one id; audit keys must be unique)
          if (opt.freshDecisionId && typeof p.decision_id === 'string') { const nid = opaqueId(); rewrites.push({ rule: 'R6-decision-id', item: i, from: p.decision_id, to: nid }); p.decision_id = nid; }
        }
        const bp = profileOf(json);
        if (opt.freshDecisionId && batch && bp && typeof bp.batch_decision_id === 'string') { const nid = opaqueId(); rewrites.push({ rule: 'R6-batch-decision-id', from: bp.batch_decision_id, to: nid }); bp.batch_decision_id = nid; }
      }

      // R8 (v1.1 sync, CON-03 §12 N-2 (c)): a generic mock returns the static example type (`docs/document`)
      // for any resource search. CON-03 requires results[].type == request resource.type (P-20), and a
      // faithful list helper drops mismatching items, so the positive-shape check would see 0 items.
      // Only the `type` is rewritten; ids and decisions are left as in the example.
      if (opt.searchType && req.method === 'POST' && path === '/access/v1/search/resource' && up.status === 200 && json && reqJson
        && typeof reqJson.resource?.type === 'string' && Array.isArray(json.results)) {
        for (const [i, r] of json.results.entries()) {
          if (r && typeof r === 'object' && r.type !== reqJson.resource.type) { rewrites.push({ rule: 'R8-search-type', item: i, from: r.type ?? null, to: reqJson.resource.type }); r.type = reqJson.resource.type; }
        }
      }


      // R10 (v1.2, M-2): registerAcceptanceRecord on a generic mock returns a static job_run_id. Return a fresh
      // one, set origin_txn from the presented Txn-Token, and remember the identity for R9. The real ledger
      // verifies the Txn-Token (CON-05 J02); this proxy does not, so it only copies what the SUT itself sent.
      let mutated = false;
      if (opt.acceptance && req.method === 'POST' && /\/acceptance-records$/.test(path) && (up.status === 201 || up.status === 200) && json && typeof json.job_run_id === 'string') {
        const tt = req.headers['txn-token'];
        const p = tt ? decodeJwtPart(tt, 1) : null;
        const nid = opaqueId();
        rewrites.push({ rule: 'R10-job-run-id', from: json.job_run_id, to: nid, origin_txn: p?.txn ?? null });
        json.job_run_id = nid;
        if (p && typeof p.txn === 'string') json.origin_txn = p.txn;
        json.accepted_at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        if (p) acceptance.set(nid, { sub: p.sub, tid: p.tctx?.tid, root_jti: p.tctx?.root_jti, gref: p.tctx?.gref, txn: p.txn });
        mutated = true;
      }

      // R9 (v1.2, M-2): re-mint the static /txn-token example so that a faithful PEP can verify it: fresh
      // iat/exp/txn, aud and scope from the request, identity from the subject_token (edge sync) or from the
      // R10 record (internal start). Only examples signed with the CON-05 test key are re-signed. An unknown
      // job_run_id leaves the identity as in the example (the SUT should then fail L0 -- never forge a match).
      if (opt.txnRemint && req.method === 'POST' && /\/txn-token$/.test(path) && up.status === 200 && json && typeof json.access_token === 'string') {
        const h = decodeJwtPart(json.access_token, 0); const p = decodeJwtPart(json.access_token, 1);
        if (!h || !p || h.kid !== TTS_TEST_KID) { rewrites.push({ rule: 'R9-skip', reason: 'not a CON-05 test-key example', kid: h?.kid ?? null }); }
        else {
          const form = new URLSearchParams(reqBuf.toString('utf8'));
          const ttl = Number.isInteger(json.expires_in) && json.expires_in > 0 ? json.expires_in : (Number.isInteger(p.exp - p.iat) && p.exp > p.iat ? p.exp - p.iat : 60);
          const iat = nowSec(); const fromTxn = p.txn;
          p.iat = iat; p.exp = iat + ttl; p.txn = opaqueId();
          if (form.get('audience')) p.aud = form.get('audience');
          if (form.get('scope')) p.scope = form.get('scope');
          p.tctx = p.tctx && typeof p.tctx === 'object' ? p.tctx : {};
          const stt = form.get('subject_token_type'); const st = form.get('subject_token');
          let source = 'example';
          if (stt === URN_ACCESS_TOKEN && st) {
            const at = decodeJwtPart(st, 1);
            if (at) {
              source = 'subject_token';
              if (typeof at.sub === 'string') p.sub = at.sub;
              if (typeof at.tid === 'string') p.tctx.tid = at.tid;
              if (typeof at.jti === 'string') p.tctx.root_jti = at.jti;
              if (typeof at.sid === 'string') p.tctx.sid = at.sid; else delete p.tctx.sid;
              if (typeof at.gref === 'string') p.tctx.gref = at.gref;
              delete p.tctx.ptxn;
            }
          } else if (stt === URN_INTERNAL_START && st) {
            const rec = acceptance.get(st);
            if (rec) {
              source = 'acceptance_record';
              if (rec.sub) p.sub = rec.sub;
              if (rec.tid) p.tctx.tid = rec.tid;
              if (rec.root_jti) p.tctx.root_jti = rec.root_jti;
              if (rec.gref) p.tctx.gref = rec.gref; else delete p.tctx.gref;
              if (rec.txn) p.tctx.ptxn = rec.txn;
              delete p.tctx.sid;
            } else rewrites.push({ rule: 'R9-unknown-job-run', job_run_id_known: false });
          }
          json.access_token = signEs256({ typ: h.typ, alg: 'ES256', kid: TTS_TEST_KID }, p);
          rewrites.push({ rule: 'R9-txn-remint', kid: TTS_TEST_KID, from_txn: fromTxn, txn: p.txn, exp: p.exp, identity_from: source });
          mutated = true;
        }
      }

      if (json && (mutated || rewrites.some((r) => /^R[3-68]/.test(r.rule)))) body = Buffer.from(JSON.stringify(json));
      res.writeHead(up.status, out);
      res.end(body);
      log({ id: rid, method: req.method, path, status: up.status, rewrites });
    } catch (e) {
      log({ id: rid, method: req.method, path: req.url, error: String(e?.message || e) });
      // fail closed toward the SUT: the proxy never fabricates a success
      if (!res.headersSent) { res.writeHead(502, { 'content-type': 'text/plain' }); res.end('echo-proxy: upstream error'); } else res.destroy();
    }
  });

  server.listen(Number(lportStr || 0), lhost.replace(/^\[|\]$/g, ''), () => {
    const a = server.address();
    const host = a.family === 'IPv6' ? `[${a.address}]` : a.address;
    if (!publicBase) publicBase = `http://${host}:${a.port}`;
    log({ event: 'listening', listen: `${host}:${a.port}`, target: target.origin, public_base: publicBase, options: { ...opt, target: undefined } });
    if (process.stdout.isTTY || process.env.ECHO_PROXY_PRINT_URL) console.log(publicBase);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}

main();
