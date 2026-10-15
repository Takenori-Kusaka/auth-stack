// Configuration from the CON-11 §11.4 substitution points only. No defaults that fail open.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const DISCOVERY_SUFFIX = '/.well-known/openid-configuration';

async function readDoc(url) {
  if (url.startsWith('file:')) return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
  const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!r.ok) throw new Error(`config fetch failed ${r.status}`);
  return r.json();
}

function req(env, name) {
  const v = env[name];
  if (!v) throw new Error(`missing required setting ${name}`);
  return v;
}

function checkVerifierConfig(c, envName) {
  const ok = c && c.schema === 'verifier-config/1' && c.env === envName
    && Array.isArray(c.alg_allowlist) && c.alg_allowlist.length > 0
    && c.alg_allowlist.every((a) => /^(ES256|ES384|ES512|EdDSA|ML-DSA-44|ML-DSA-65|ML-DSA-87|PS256|PS384|PS512|RS256)$/.test(a))
    && /^(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})$/.test(c.min_profile_version)
    && Number.isInteger(c.clock_skew_seconds) && c.clock_skew_seconds >= 0 && c.clock_skew_seconds <= 60
    && c.jwks && c.jwks.refetch_on_unknown_kid === true;
  if (!ok) throw new Error('verifier-config/1 invalid or env mismatch');
}

function checkFailmodeConfig(c, envName) {
  const tiers = ['read-sensitive', 'write', 'privileged'];
  const ok = c && c.schema === 'failmode-config/1' && c.env === envName
    && c.decision_cache_max_age_ms === 0
    && tiers.every((t) => c.pdp?.[t] && Number.isInteger(c.pdp[t].deadline_ms) && c.pdp[t].deadline_ms >= 1
      && c.pdp[t].on_no_decision?.status === 503 && c.pdp[t].known_good?.enabled === false);
  if (!ok) throw new Error('failmode-config/1 invalid or env mismatch');
  if (envName === 'production' && c.values_status === 'provisional') throw new Error('provisional fail-mode values in production');
}

export async function loadConfig(env = process.env) {
  const discoveryUrl = req(env, 'AUTH_OIDC_DISCOVERY_URL');
  if (!discoveryUrl.endsWith(DISCOVERY_SUFFIX)) throw new Error('AUTH_OIDC_DISCOVERY_URL must end with ' + DISCOVERY_SUFFIX);
  const environment = req(env, 'AUTH_ENVIRONMENT');
  const verifier = await readDoc(req(env, 'AUTH_VERIFIER_CONFIG_URL'));
  checkVerifierConfig(verifier, environment);
  const failmode = await readDoc(req(env, 'AUTHZ_FAILMODE_CONFIG_URL'));
  checkFailmodeConfig(failmode, environment);
  return Object.freeze({
    environment,
    discoveryUrl,
    // V4 / CON-11 §11.4 (v1.2 L-3): expected issuer is derived from the configured URL, never from the response.
    issuer: discoveryUrl.slice(0, -DISCOVERY_SUFFIX.length),
    audience: req(env, 'AUTH_SERVICE_AUDIENCE'),
    verifier,
    failmode,
    maxJwtBytes: 6144,
    pdpBaseUrl: req(env, 'AUTHZ_PDP_BASE_URL'),
    tts: {
      issuer: req(env, 'AUTH_TTS_ISSUER'),
      audience: req(env, 'AUTH_TTS_AUDIENCE'),
      jwksUrl: req(env, 'AUTH_TTS_JWKS_URL'),
      url: req(env, 'AUTH_TTS_URL'),
    },
    jobLedgerUrl: req(env, 'AUTH_JOB_LEDGER_URL'),
    externalGrantUrl: req(env, 'EXTERNAL_GRANT_API_URL'),
    registryUrl: req(env, 'AUTHZ_REGISTRY_BASE_URL'),
    auditSinkUrl: req(env, 'AUDIT_SINK_URL'),
    cellId: req(env, 'AUTH_CELL_ID'),
    jurisdiction: req(env, 'AUTH_JURISDICTION'),
    spiffeId: req(env, 'WORKLOAD_SPIFFE_ID'),
    approvalConsumeUrl: env.AGENT_APPROVAL_CONSUME_URL || null,
    profileVersion: '1.0',
  });
}
