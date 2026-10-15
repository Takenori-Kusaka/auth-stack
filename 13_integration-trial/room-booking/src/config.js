// Configuration from the CON-11 §11.4 switch points only (no URLs or numbers hard-coded in business code).
// Startup fails (throws) on any missing / malformed value: no defaults that open the gate (CON-11 §11.4 last bullet).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const WELL_KNOWN = '/.well-known/openid-configuration';

async function fetchDoc(url) {
  if (url.startsWith('file:')) return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
  const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (r.status !== 200) throw new Error(`config fetch ${url}: ${r.status}`);
  return r.json();
}

function need(env, name) {
  const v = env[name];
  if (!v) throw new Error(`missing switch point ${name}`);
  return v;
}

function checkVerifierConfig(doc, envName) {
  const allowed = new Set(['schema', 'config_version', 'env', 'crypto_profile_version', 'alg_allowlist', 'min_profile_version', 'clock_skew_seconds', 'jwks']);
  for (const k of Object.keys(doc)) if (!allowed.has(k)) throw new Error(`verifier-config: unknown field ${k}`);
  if (doc.schema !== 'verifier-config/1') throw new Error('verifier-config: unknown schema');
  if (doc.env !== envName) throw new Error('verifier-config: env mismatch');
  if (!Array.isArray(doc.alg_allowlist) || doc.alg_allowlist.length === 0) throw new Error('verifier-config: alg_allowlist');
  for (const a of doc.alg_allowlist) if (!/^(ES256|ES384|ES512|EdDSA|ML-DSA-44|ML-DSA-65|ML-DSA-87|PS256|PS384|PS512|RS256)$/.test(a)) throw new Error(`verifier-config: alg ${a}`);
  if (!/^(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})$/.test(doc.min_profile_version)) throw new Error('verifier-config: min_profile_version');
  if (!Number.isInteger(doc.clock_skew_seconds) || doc.clock_skew_seconds < 0 || doc.clock_skew_seconds > 60) throw new Error('verifier-config: clock_skew_seconds');
  if (!doc.jwks || doc.jwks.refetch_on_unknown_kid !== true) throw new Error('verifier-config: jwks');
  return doc;
}

function checkFailmodeConfig(doc, envName) {
  if (doc.schema !== 'failmode-config/1') throw new Error('failmode-config: unknown schema');
  if (doc.env !== envName) throw new Error('failmode-config: env mismatch');
  if (envName === 'production' && doc.values_status === 'provisional') throw new Error('failmode-config: provisional values in production');
  if (doc.decision_cache_max_age_ms !== 0) throw new Error('failmode-config: decision cache must be 0');
  for (const t of ['read-sensitive', 'write', 'privileged']) {
    const p = doc.pdp?.[t];
    if (!p || !Number.isInteger(p.deadline_ms) || p.deadline_ms < 1) throw new Error(`failmode-config: pdp.${t}`);
    if (p.on_no_decision?.status !== 503) throw new Error(`failmode-config: pdp.${t}.on_no_decision`);
    if (p.known_good?.enabled !== false) throw new Error(`failmode-config: known_good must be disabled (KD13-6)`);
  }
  if (!(doc.audit_spool.write_max_events < doc.audit_spool.read_sensitive_max_events)) throw new Error('failmode-config: Q_w < Q_r');
  return doc;
}

export async function loadConfig(env = process.env) {
  const environment = need(env, 'AUTH_ENVIRONMENT');
  const discoveryUrl = need(env, 'AUTH_OIDC_DISCOVERY_URL');
  if (!discoveryUrl.endsWith(WELL_KNOWN)) throw new Error('AUTH_OIDC_DISCOVERY_URL must end with ' + WELL_KNOWN);
  // V4 / EN-2: the expected issuer is taken from OUR configuration (the configured discovery URL),
  // never from the discovery response. CON-11 §11.6.2 says the issuer is "passed via AUTH_OIDC_DISCOVERY_URL".
  const expectedIssuer = discoveryUrl.slice(0, -WELL_KNOWN.length);
  const verifier = checkVerifierConfig(await fetchDoc(need(env, 'AUTH_VERIFIER_CONFIG_URL')), environment);
  const failmode = checkFailmodeConfig(await fetchDoc(need(env, 'AUTHZ_FAILMODE_CONFIG_URL')), environment);
  return {
    environment,
    serviceId: 'rsv-api',
    pepVersion: '0.1.0',
    workloadSpiffeId: need(env, 'WORKLOAD_SPIFFE_ID'),
    issuer: { expected: expectedIssuer, discoveryUrl },
    audience: need(env, 'AUTH_SERVICE_AUDIENCE'),
    verifier,
    failmode,
    pdpBaseUrl: need(env, 'AUTHZ_PDP_BASE_URL').replace(/\/$/, ''),
    tts: {
      url: need(env, 'AUTH_TTS_URL').replace(/\/$/, ''),
      issuer: need(env, 'AUTH_TTS_ISSUER'),
      audience: need(env, 'AUTH_TTS_AUDIENCE'),
      jwksUrl: need(env, 'AUTH_TTS_JWKS_URL'),
    },
    // Not a CON-11 §11.4 switch point: the job ledger (CON-05 registerAcceptanceRecord) has no
    // environment-variable name there. Invented name (report.md finding M-6).
    jobLedgerUrl: need(env, 'AUTH_JOB_LEDGER_URL').replace(/\/$/, ''),
    auditSinkUrl: need(env, 'AUDIT_SINK_URL'),
    maxJwtBytes: 6144,
  };
}
