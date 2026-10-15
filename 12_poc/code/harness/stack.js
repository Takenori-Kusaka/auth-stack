// Start / stop a complete line-1 stack for one TC on its fixed port block, seed synthetic data, and expose
// helpers for tests (login as a synthetic user via the BFF or as the public DPoP CLI client, call the edge,
// revoke, suspend, inject faults, restart components).
//
//   const s = await startStack({ tc: 'TC-004', run, engine: 'openfga', profile: 'small', seed: 1 });
//   const u = await s.login({ sub, tid, amr: 'pwd,otp' });      // BFF session (cert-bound token)
//   const r = await u.call('GET', `/t/${tid}/files/${id}`);
//   await s.stop();
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createTopology, clientTls, CODE_DIR } from '../lib/topology.js';
import { portBase } from '../config/ports.js';
import { ProcGroup } from './proc.js';
import { execFileSync } from 'node:child_process';
import { request } from '../lib/http.js';
import { generate } from '../data/gen-synthetic.js';
import { Run } from './run.js';
import { UserAgent, discover, codeFlow, tokenRequest } from '../lib/oauth-client.js';
import { newDpopKey, createProof } from '../lib/dpop.js';
import { newTraceparent } from '../lib/ids.js';

const node = process.execPath;
const C = (p) => path.join(CODE_DIR, p);

/**
 * opts: {
 *   tc, run (harness/run.js Run, optional; else a pre-freeze dir is used), engine ('openfga'|'cedar'),
 *   profile ('smoke'|'small'|'medium'), seed, dataset (pre-built object), datasetOpts,
 *   settings (topology settings overrides), openfgaFlags (extra CLI flags, e.g. check cache),
 *   injectPep (bool), injectEngine (bool), faultAdmin (bool), components (subset), env (extra env per component)
 * }
 */
export async function startStack(opts) {
  const tc = opts.tc || 'smoke';
  const engine = opts.engine || process.env.PDP_ENGINE || 'openfga';
  // every stack writes into a run directory with run.json / env.json / SHA256SUMS (§2.9); ad-hoc stacks get a pre-freeze run
  const ownRun = !opts.run;
  if (ownRun) opts.run = new Run({ tc, purpose: opts.purpose || 'adhoc-harness-check', seed: opts.seed ?? 1 });
  const topo = await createTopology({ tc, portBase: opts.portBase || portBase(tc), engine, settings: opts.settings, dataDir: opts.run ? opts.run.dir : undefined, runId: opts.run ? opts.run.runId : undefined });
  const ds = opts.dataset || generate({ seed: opts.seed ?? 1, profile: opts.profile || 'smoke', ...(opts.datasetOpts || {}) });
  fs.writeFileSync(topo.files.dataset, JSON.stringify(ds));
  fs.writeFileSync(path.join(topo.dataDir, 'dataset.json'), JSON.stringify(ds)); // synthetic only (DEC-4)
  const topoFile = path.join(topo.secretsDir, 'topology.json');
  const procs = new ProcGroup({ logDir: path.join(topo.dataDir, 'logs') });
  const want = new Set(opts.components || ['openfga', 'state-store', 'journal', 'as-a', 'as-b', 'sts', 'pdp', 'label-service', 'file-service', 'tool-service', 'edge', 'bff']);
  const ready = { line: /READY /, };
  const envFor = (name) => ({ POC_TOPOLOGY: topoFile, PDP_ENGINE: engine, ...(opts.env?.[name] || {}) });
  // opts.scripts { <component>: <absolute path> } replaces a component's entry script (test-only mutants, TC-002 §4.2 (4))
  const startNode = (name, script, extra = []) => procs.start(name, node, [opts.scripts?.[name] || C(script), '--topology', topoFile, '--name', name, ...extra], { env: envFor(name), ready, cwd: CODE_DIR, timeoutMs: 30_000 });

  // OpenFGA datastore: sqlite by default (test plan §3.1), memory on request (opts.openfgaDatastore = 'memory')
  const fgaDb = path.join(topo.secretsDir, 'openfga.db');
  const fgaDatastore = () => {
    if ((opts.openfgaDatastore || 'sqlite') === 'memory') return ['--datastore-engine', 'memory'];
    if (!fs.existsSync(fgaDb)) execFileSync(topo.files.openfgaBin, ['migrate', '--datastore-engine', 'sqlite', '--datastore-uri', `file:${fgaDb}`], { stdio: 'ignore' });
    return ['--datastore-engine', 'sqlite', '--datastore-uri', `file:${fgaDb}`];
  };
  const starters = {
    openfga: () => procs.start('openfga', topo.files.openfgaBin, [
      'run', ...fgaDatastore(),
      '--http-addr', `127.0.0.1:${topo.ports.openfgaHttp}`, '--grpc-addr', `127.0.0.1:${topo.ports.openfgaGrpc}`,
      '--playground-enabled=false', '--metrics-enabled=false', '--log-level', 'warn', '--log-format', 'json',
      ...(opts.openfgaFlags || []),
    ], { ready: { url: `http://127.0.0.1:${topo.ports.openfgaHttp}/healthz` }, timeoutMs: 30_000 }),
    'state-store': () => startNode('state-store', 'state/server.js'),
    journal: () => startNode('journal', 'audit/journal.js'),
    'as-a': () => startNode('as-a', 'as/server.js'),
    'as-b': () => startNode('as-b', 'as/server.js'),
    sts: () => startNode('sts', 'sts/server.js'),
    'inj-engine': () => startNode('inj-engine', 'inject/proxy.js', ['--listen', String(topo.ports.injEngine), '--upstream', `127.0.0.1:${topo.ports.openfgaHttp}`, '--mode', 'http']),
    pdp: () => startNode('pdp', 'pdp/facade.js'),
    'inj-pep': () => startNode('inj-pep', 'inject/proxy.js', ['--listen', String(topo.ports.injPep), '--upstream', `127.0.0.1:${topo.ports.pdp}`, '--mode', 'tcp']),
    'label-service': () => startNode('label-service', 'services/label-service.js'),
    'file-service': () => startNode('file-service', 'services/file-service.js'),
    'tool-service': () => startNode('tool-service', 'services/tool-service.js'),
    edge: () => startNode('edge', 'services/edge.js'),
    bff: () => startNode('bff', 'services/bff.js'),
  };
  if (opts.injectEngine) { want.add('inj-engine'); (opts.env ||= {}).pdp = { ...(opts.env.pdp || {}), PDP_ENGINE_URL: topo.urls.injEngine }; }
  if (opts.injectPep) {
    want.add('inj-pep');
    for (const s of ['file-service', 'tool-service', 'label-service']) (opts.env ||= {})[s] = { ...(opts.env[s] || {}), PEP_PDP_URL: topo.urls.injPep };
  }
  if (opts.faultAdmin) (opts.env ||= {}).pdp = { ...(opts.env.pdp || {}), POC_FAULT_ADMIN: '1' };

  const order = ['openfga', 'state-store', 'journal', 'as-a', 'as-b', 'sts', 'inj-engine', 'pdp', 'inj-pep', 'label-service', 'file-service', 'tool-service', 'edge', 'bff'];
  const s = { topo, topoFile, procs, dataset: ds, engine };
  const htls = clientTls(topo, 'harness');
  s.tls = htls;
  s.req = (url, o = {}) => request(url, { tls: htls, ...o });
  try {
    for (const n of order) {
      if (!want.has(n)) continue;
      if (n === 'openfga' && engine !== 'openfga') continue;
      await starters[n]();
      if (n === 'pdp') await seed(s);
    }
  } catch (e) {
    await procs.stopAll();
    throw e;
  }

  s.start = (name) => starters[name]();
  s.restart = async (name) => { await procs.stop(name); await starters[name](); };
  s.kill = (name) => procs.kill(name);
  s.run = opts.run;
  s.stop = async () => { await procs.stopAll(); if (ownRun) opts.run.finish('completed', { engine }); };
  // ---- control helpers ----
  s.revoke = (scope, value, extra = {}) => s.req(`${topo.urls.state}/revocations`, { body: { scope, value, ...extra } });
  s.setStatus = (kind, id, status) => s.req(`${topo.urls.state}/status`, { body: { kind, id, status } });
  s.inject = (name, cfg) => fs.writeFileSync(path.join(topo.secretsDir, `inject-${name}.json`), JSON.stringify(cfg));
  s.facadeFault = (cfg) => s.req(`${topo.urls.pdp}/admin/fault`, { body: cfg });
  s.journalOutage = (down) => s.req(`${topo.urls.journal}/admin/outage`, { body: { down } });
  s.writeTuples = (tid, body) => s.req(`${topo.urls.pdp}/v1/tenants/${tid}/relationships/write`, { body });
  s.deleteTuples = (tid, deletes) => s.req(`${topo.urls.pdp}/v1/tenants/${tid}/relationships/delete`, { body: { deletes } });
  s.evaluate = (body, headers = {}) => s.req(`${topo.urls.pdp}/access/v1/evaluation`, { body, headers: { 'x-request-id': crypto.randomBytes(13).toString('hex'), ...headers } });
  s.keys = (store, op, body = {}) => s.req(`${topo.urls.sts}/admin/keys/${store}/${op}`, { body });
  s.asMeta = await discover(topo.urls.asA, htls);
  s.asMetaB = await discover(topo.urls.asB, htls).catch(() => null);

  /** Login through the BFF (confidential client, PAR+PKCE, cert-bound token). Returns a session helper. */
  s.login = async ({ sub, tid, amr = 'pwd,otp', as = 'a' }) => {
    const ua = new UserAgent({ tls: htls });
    const r1 = await ua.go(`${topo.urls.bff}/login?as=${as}`);
    if (r1.status !== 302) throw new Error(`bff /login ${r1.status} ${r1.text}`);
    let url = r1.headers.location;
    for (let i = 0; i < 10; i++) {
      const r = await ua.go(url);
      if (process.env.DEBUG_LOGIN) console.error('login hop', r.status, url.slice(0, 120), r.headers.location?.slice(0, 120), r.status >= 400 ? r.text.slice(0, 300) : '');
      if (r.status !== 302 && r.status !== 303) {
        if (url.startsWith(topo.urls.bff)) return { ok: r.status === 200, status: r.status, body: r.json(), ua, call: makeBffCall(ua) };
        throw new Error(`login flow stopped at ${url} with ${r.status}: ${r.text.slice(0, 300)}`);
      }
      const loc = new URL(r.headers.location, url).toString();
      if (/\/interaction\/[^/]+$/.test(new URL(loc).pathname)) {
        const idet = await ua.go(loc);
        if (process.env.DEBUG_LOGIN) console.error('interaction', idet.status, idet.text.slice(0, 400), JSON.stringify([...ua.cookies.entries()].map(([h, j]) => [h, [...j.keys()]])));
        const lr = await ua.go(`${loc}/login`, { method: 'POST', form: { sub, tid, amr } });
        if (process.env.DEBUG_LOGIN) console.error('login post', lr.status, lr.headers.location, lr.text.slice(0, 300));
        url = new URL(lr.headers.location, loc).toString();
        continue;
      }
      url = loc;
    }
    throw new Error('login: too many redirects');
  };
  const makeBffCall = (ua) => async (method, p, body, headers = {}) => {
    const r = await ua.go(`${topo.urls.bff}/api${p}`, { method, body, headers: { traceparent: newTraceparent(), ...headers } });
    return { status: r.status, body: r.json() ?? r.text, headers: r.headers };
  };

  /** Login as the public CLI client (PKCE + DPoP with nonce); calls go straight to the edge with DPoP proofs. */
  s.loginCli = async ({ sub, tid, amr = 'pwd,otp', dpopKey }) => {
    const key = dpopKey || await newDpopKey();
    const ua = new UserAgent({ tls: htls });
    const r = await codeFlow({ meta: s.asMeta, auth: { type: 'none', clientId: topo.clients.cli.clientId }, tls: htls, dpopKey: key, ua, login: { sub, tid, amr }, redirectUri: topo.clients.cli.redirectUri, scope: 'openid offline_access files.read files.write files.share tools.use tools.config', resource: topo.audiences.api });
    if (r.error) return { ok: false, ...r };
    let nonce;
    const call = async (method, p, body, { scheme = 'DPoP', proof, token = r.tokens.access_token } = {}) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const url = `${topo.urls.edge}${p}`;
        const headers = { authorization: `${scheme} ${token}`, traceparent: newTraceparent() };
        if (scheme === 'DPoP') headers.dpop = proof || await createProof(key, { htm: method, htu: url, accessToken: token, nonce });
        const res = await request(url, { method, body, headers, tls: { ca: topo.pki.ca } });
        if (res.status === 401 && res.headers['dpop-nonce'] && !proof && attempt === 0 && /use_dpop_nonce/.test(res.headers['www-authenticate'] || '')) { nonce = res.headers['dpop-nonce']; continue; }
        return { status: res.status, body: res.json() ?? res.text, headers: res.headers };
      }
    };
    const refresh = async (rt = r.tokens.refresh_token, k = key) => tokenRequest(s.asMeta, s.asMeta.token_endpoint, { grant_type: 'refresh_token', refresh_token: rt }, { auth: { type: 'none', clientId: topo.clients.cli.clientId }, tls: htls, dpopKey: k });
    return { ok: true, tokens: r.tokens, key, call, refresh, nonce: () => nonce };
  };
  return s;
}

/** Seed the façade with the dataset tuples (batches of ≤ 100, X-8 writer = harness). */
export async function seed(s) {
  const byTenant = new Map();
  for (const t of s.dataset.tuples) {
    if (!byTenant.has(t.tid)) byTenant.set(t.tid, []);
    const { tid, ...rest } = t;
    byTenant.get(t.tid).push(rest);
  }
  const htls = clientTls(s.topo, 'harness');
  for (const [tid, tuples] of byTenant) {
    // tenant root first so that core/tenant:<tid> is registered to the tenant
    tuples.sort((a, b) => (a.resource.type === 'core/tenant' ? -1 : 0) - (b.resource.type === 'core/tenant' ? -1 : 0));
    for (let i = 0; i < tuples.length; i += 100) {
      const r = await request(`${s.topo.urls.pdp}/v1/tenants/${tid}/relationships/write`, { body: { writes: tuples.slice(i, i + 100) }, tls: htls, timeoutMs: 30_000 });
      if (r.status !== 200) throw new Error(`seed failed for ${tid}: ${r.status} ${r.text.slice(0, 300)}`);
    }
  }
  // register objects that exist in service stores but may have no tuples (resource-derived tenant for search)
  const objects = [
    ...s.dataset.files.map((f) => ({ type: 'files/file', id: f.id, tid: f.tid })),
    ...s.dataset.folders.map((f) => ({ type: 'files/folder', id: f.id, tid: f.tid })),
    ...s.dataset.tools.map((t) => ({ type: 'proj/tool_instance', id: t.id, tid: t.tid })),
  ];
  for (let i = 0; i < objects.length; i += 1000) {
    await request(`${s.topo.urls.pdp}/v1/register-objects`, { body: { objects: objects.slice(i, i + 1000) }, tls: htls });
  }
}
