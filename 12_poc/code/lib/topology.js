// Run topology: ports, URLs, logical identifiers, workload identities, PKI and per-run secrets.
// One topology = one "cell" (c1) of the line-1 PoC. Each TC gets a fixed port block (config/ports.js).
// Secrets (private keys, HMAC keys) live under 12_poc/code/.run/<run-id>/ (git-ignored); raw data under 12_poc/data/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateKeyPair, exportJWK } from 'jose';
import { buildRunPki } from './pki.js';
import { syntheticId, seededRng } from './ids.js';
import { OFFSETS } from '../config/ports.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CODE_DIR = path.resolve(here, '..');
export const POC_DIR = path.resolve(CODE_DIR, '..');
export const DATA_DIR = path.join(POC_DIR, 'data');
export const RUN_SECRETS_DIR = path.join(CODE_DIR, '.run');
export const OPENFGA_BIN = path.join(POC_DIR, 'tools', 'openfga', 'openfga.exe');

export const WORKLOADS = [
  'as-a', 'as-b', 'sts', 'pdp', 'state-store', 'journal', 'edge', 'bff', 'tool-service', 'file-service', 'label-service',
  'inject-proxy', 'admin', 'harness',
];

/** Deterministic opaque subject for a workload / client name (26 chars, base32, "syn" prefix = synthetic). */
export function wlSub(name) { return syntheticId(seededRng(`wl:${name}`)); }
export function clientId(name) { return syntheticId(seededRng(`client:${name}`)); }

/**
 * Create (or load) a topology.
 * opts: { tc: 'TC-001'|'smoke'|..., portBase, runId?, engine: 'openfga'|'cedar', dataDir?, accessTokenTtl?, extra? }
 */
export async function createTopology(opts) {
  const runId = opts.runId || `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z')}-${crypto.randomBytes(3).toString('hex')}`;
  const secretsDir = path.join(RUN_SECRETS_DIR, `${opts.tc || 'adhoc'}-${runId}`);
  fs.mkdirSync(secretsDir, { recursive: true });
  const base = opts.portBase;
  const ports = Object.fromEntries(Object.entries(OFFSETS).map(([k, off]) => [k, base + off]));
  const u = (p) => `https://127.0.0.1:${p}`;
  const pki = buildRunPki(path.join(secretsDir, 'pki'), WORKLOADS);
  const td = pki.trustDomain;
  const certOf = (name, domain = td) => pki.domains[domain].certs[name];

  const workloads = {};
  for (const w of WORKLOADS) {
    const c = certOf(w);
    workloads[w] = { name: w, spiffeId: c.spiffeId, sub: wlSub(w), cert: c.cert, key: c.key };
  }
  const sandbox = {};
  for (const [w, c] of Object.entries(pki.domains['sandbox.test'].certs)) sandbox[w] = { name: w, spiffeId: c.spiffeId, sub: wlSub(`sandbox:${w}`), cert: c.cert, key: c.key };

  // OAuth client keys (private_key_jwt) generated per run.
  const clientKeys = {};
  for (const name of ['bff', 'edge', 'sts', 'attacker-client']) {
    const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
    const kid = `ck-${name}-${crypto.randomBytes(3).toString('hex')}`;
    const priv = { ...(await exportJWK(privateKey)), kid, alg: 'ES256' };
    const pub = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
    const f = path.join(secretsDir, `client-${name}.jwk.json`);
    fs.writeFileSync(f, JSON.stringify(priv), { mode: 0o600 });
    clientKeys[name] = { privateJwkFile: f, publicJwk: pub };
  }

  const secrets = {
    kCorr: crypto.randomBytes(32).toString('hex'), // jti_ref HMAC key (ADR-014 D14-21)
    kSubj: crypto.randomBytes(32).toString('hex'), // subj_ref pseudonym key
    kRes: crypto.randomBytes(32).toString('hex'), // res_ref key
    kMap: crypto.randomBytes(32).toString('hex'), // AS foreign id -> opaque id mapping (sid, grant)
    kCursor: crypto.randomBytes(32).toString('hex'), // façade page-token MAC
    kCtoken: crypto.randomBytes(32).toString('hex'), // façade consistency-token MAC
    kSignedUrl: crypto.randomBytes(32).toString('hex'),
  };
  fs.writeFileSync(path.join(secretsDir, 'secrets.json'), JSON.stringify(secrets), { mode: 0o600 });

  const dataDir = opts.dataDir || path.join(DATA_DIR, '_prefreeze', opts.tc || 'adhoc', runId);
  fs.mkdirSync(dataDir, { recursive: true });

  const topo = {
    runId,
    tc: opts.tc || 'adhoc',
    createdAt: new Date().toISOString(),
    cellId: 'pc01', // audit-event cell_id pattern ^[a-z0-9]{4,16}$
    jurisdiction: 'jp',
    trustDomain: td,
    txnAudience: 'td-c1', // TTS trust-domain value of the cell (ADR-009 D09-09), not the SPIFFE trust domain
    engine: opts.engine || process.env.PDP_ENGINE || 'openfga',
    ports,
    urls: {
      asA: u(ports.asA), asB: u(ports.asB), sts: u(ports.sts), pdp: u(ports.pdp),
      openfga: `http://127.0.0.1:${ports.openfgaHttp}`, state: u(ports.state), journal: u(ports.journal),
      edge: u(ports.edge), bff: u(ports.bff), tool: u(ports.tool), file: u(ports.file), label: u(ports.label),
      injPep: u(ports.injPep), injEngine: `http://127.0.0.1:${ports.injEngine}`,
    },
    issuers: {
      asA: 'https://as-a.poc.test',
      asB: 'https://as-b.poc.test',
      sts: 'https://sts.c1.poc.test',
      tts: 'https://tts.c1.poc.test',
      pdp: 'https://pdp.c1.poc.test',
    },
    audiences: {
      api: 'https://api.poc.test/', // external resource (opaque AT audience at the edge)
      tool: 'https://svc.poc.test/s/tool',
      file: 'https://svc.poc.test/s/file',
      label: 'https://svc.poc.test/s/label',
    },
    clients: {
      bff: { clientId: clientId('bff'), ...clientKeys.bff, redirectUri: `${u(ports.bff)}/cb` },
      cli: { clientId: clientId('cli'), redirectUri: 'https://cli.poc.test/cb' },
      edge: { clientId: clientId('edge'), ...clientKeys.edge },
      sts: { clientId: clientId('sts'), ...clientKeys.sts },
      attacker: { clientId: clientId('attacker-client'), ...clientKeys['attacker-client'], redirectUri: 'https://attacker.poc.test/cb' },
    },
    pki: {
      ca: pki.domains[td].ca,
      sandboxCa: pki.domains['sandbox.test'].ca,
    },
    workloads,
    sandbox,
    secretsDir,
    secretsFile: path.join(secretsDir, 'secrets.json'),
    dataDir,
    files: {
      cam: path.join(CODE_DIR, 'model', 'cam.json'),
      ledger: path.join(CODE_DIR, 'config', 'ledger.json'),
      dataset: opts.dataset || path.join(secretsDir, 'dataset.json'),
      openfgaBin: OPENFGA_BIN,
    },
    settings: {
      accessTokenTtlSec: opts.accessTokenTtl || 300,
      internalTokenTtlSec: opts.internalTokenTtl || 120,
      txnTokenTtlSec: opts.txnTokenTtl || 60,
      revocationPollMs: 200,
      mRevMs: 5_000, // M_rev (stale revocation state bound) – PoC configured value, real value TBD (ADR-006/DL-20)
      skewSec: 10,
      nAct: 3,
      ...(opts.settings || {}),
    },
  };
  fs.writeFileSync(path.join(secretsDir, 'topology.json'), JSON.stringify(topo, null, 2));
  return topo;
}

export function loadTopology(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadSecrets(topo) {
  return JSON.parse(fs.readFileSync(topo.secretsFile, 'utf8'));
}

/** TLS options for a workload acting as client (mTLS) or server. */
export function tlsFor(topo, name, { mtls = 'required', sandbox = false } = {}) {
  const w = sandbox ? topo.sandbox[name] : topo.workloads[name];
  return { key: w.key, cert: w.cert, ca: topo.pki.ca, mtls };
}
export function clientTls(topo, name, { sandbox = false } = {}) {
  const w = sandbox ? topo.sandbox[name] : topo.workloads[name];
  return { key: w.key, cert: w.cert, ca: topo.pki.ca };
}
