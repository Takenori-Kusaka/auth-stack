// Fixed port plan (README "ポート表"). Every TC owns a block of 20 ports starting at portBase(tc):
//   smoke = 42000, TC-0nn = 42000 + nn*20  (TC-001 = 42020 … TC-028 = 42560)
// Blocks avoid the Windows excluded ranges observed on the build host (47001, 49791–50359, 58039–58726).
export const OFFSETS = {
  asA: 0, // AS issuer A (prod 役), HTTPS
  asB: 1, // AS issuer B (sandbox / attacker 役), HTTPS
  sts: 2, // STS (RFC 8693) + TTS (Txn-Token), HTTPS mTLS
  pdp: 3, // PDP façade (AuthZEN), HTTPS mTLS
  openfgaHttp: 4, // OpenFGA HTTP API (plain, loopback only)
  openfgaGrpc: 5, // OpenFGA gRPC (unused by the façade, bound to loopback)
  state: 6, // cell state store (revocation state, issuance ledger, status, placement), HTTPS mTLS
  journal: 7, // audit journal, HTTPS mTLS
  edge: 8, // edge gateway (external entry, opaque AT + introspection + exchange), HTTPS
  bff: 9, // BFF (confidential OAuth client), HTTPS
  tool: 10, // tool-service (service A), HTTPS mTLS
  file: 11, // file-service (service B), HTTPS mTLS
  injPep: 12, // fault-injection proxy on the PEP -> façade link
  injEngine: 13, // fault-injection proxy on the façade -> engine link
  upstreamIdp1: 14, // reserved: upstream IdP mock 1 (TC-019)
  upstreamIdp2: 15, // reserved: upstream IdP mock 2 (TC-019)
  scim: 16, // reserved: SCIM receiver mock (TC-019)
  label: 17, // label-service (service C), HTTPS mTLS
  spare2: 18,
  harness: 19, // harness-owned listener (callbacks, probes)
};

export const BLOCK = 20;
export const BASE = 42000;

export function portBase(tc) {
  if (tc === 'smoke') return BASE;
  if (tc === 'selftest') return BASE + 29 * BLOCK; // 42580: platform self-tests (test/)
  const m = /^TC-0*(\d+)$/.exec(tc || '');
  if (!m) throw new Error(`no port block for ${tc}`);
  const n = Number(m[1]);
  if (n < 1 || n > 28) throw new Error(`line-1 TCs are TC-001..TC-028 (got ${tc})`);
  return BASE + n * BLOCK;
}

export function portTable() {
  const rows = [['smoke', BASE]];
  for (let n = 1; n <= 28; n++) rows.push([`TC-${String(n).padStart(3, '0')}`, BASE + n * BLOCK]);
  rows.push(['selftest', BASE + 29 * BLOCK]);
  return rows;
}
