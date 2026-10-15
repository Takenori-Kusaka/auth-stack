// Configuration points (CON-11 §11.4, INT-00 §5.3). No URL / numeric value is hard-coded in business code.
// Environment variable names are the provisional names of CON-11 §11.4 (to be frozen by DL-120 / DEC-8).
// Values that the contracts leave TBD (D(t), skew, etc.) are read from env; the defaults below are
// trial-only placeholders and are NOT values from any contract (DL-19/DL-20 are TBD).

function req(env, name) {
  const v = env[name];
  if (!v) throw new Error(`missing configuration: ${name}`);
  return v;
}

export function loadConfig(env = process.env) {
  return {
    // token verification (ARC-02 V1-V14 is not available to us; we follow CON-06 + INT-00 §5.2 row (1))
    oidcDiscoveryUrl: req(env, 'AUTH_OIDC_DISCOVERY_URL'),
    // The audience of this service (CON-06 serviceAudience: one string). Not listed in CON-11 §11.4 -> see report P-list.
    serviceAudience: req(env, 'EXPENSE_SERVICE_AUDIENCE'),
    // alg allowlist must be read from the versioned crypto profile (CON-06 issuedAlg $comment). No contract for it -> env.
    algAllowlist: (env.AUTH_ALG_ALLOWLIST || 'ES256').split(',').map((s) => s.trim()),
    // minimum accepted token profile major (CON-06 profileVersion: "read from verifier's versioned config")
    minProfileMajor: Number(env.AUTH_MIN_PROFILE_MAJOR || '1'),
    clockSkewSec: Number(env.AUTH_CLOCK_SKEW_SEC || '30'),
    // PDP / STS / TTS / Registry / audit (CON-11 §11.4)
    pdpBaseUrl: req(env, 'AUTHZ_PDP_BASE_URL'),
    stsTokenUrl: req(env, 'AUTH_STS_TOKEN_URL'),
    ttsUrl: env.AUTH_TTS_URL || '',
    registryBaseUrl: req(env, 'AUTHZ_REGISTRY_BASE_URL'),
    auditSinkUrl: env.AUDIT_SINK_URL || 'memory:',
    // fail-mode values. CON-11 §11.4 says read them from AUTHZ_FAILMODE_CONFIG_URL, but no contract defines
    // the document format at that URL -> local env fallback (report P-list).
    pdpDeadlineMs: Number(env.AUTHZ_PDP_DEADLINE_MS || '300'),
    retryAfterSec: Number(env.EXPENSE_RETRY_AFTER_SEC || '5'),
    // K06-4 (404 vs 403) is undecided: configurable (IC-09)
    denyStatus: Number(env.EXPENSE_DENY_STATUS || '404'),
    // lifecycle (CON-11 §11.4)
    lifecycleKeyManifestUrl: env.LIFECYCLE_KEY_MANIFEST_URL || '',
    lifecycleStateQueryUrl: req(env, 'LIFECYCLE_STATE_QUERY_URL'),
    lifecycleEnv: env.LIFECYCLE_ENV || 'sandbox',
    lifecycleGraceMs: Number(env.LIFECYCLE_GRACE_MS || '0'),
    // downstream (P-03) callee identifier. Issued by namespace ledger (ADR-021) -> unknown, env.
    paymentServiceResource: env.PAYMENT_SERVICE_RESOURCE || '',
    // this service's own workload id (SPIFFE ID is issued by platform; CON-14 §4A) -> env
    workloadId: env.WORKLOAD_ID || 'spiffe://sandbox.invalid/ns/expense/sa/api',
    // keyed HMAC for subj_ref / res_ref (CON-08 KeyedRef; key distribution is DL-77, not available) -> env
    auditRefKey: env.AUDIT_REF_KEY || 'trial-only-not-a-real-key',
  };
}
