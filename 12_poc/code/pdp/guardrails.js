// G 段 (基盤ガードレール, ADR-011 D1-2): fixed catalog × tenant settings, evaluated by the façade before the
// engine. A G-stage deny cannot be overridden by any R-stage permit (ADR-011 D3-2, D3-5).
// Rule IDs (reason = deny_guardrail:<id>):
//   g1_tenant_mismatch  subject tid != resource tid, or resource-derived tenant known to the façade differs
//   g1_not_member       tids match but the subject has neither internal membership nor external grant in the tenant (ADR-024 D24-08)
//   g2_subject_suspended, g3_tenant_suspended  state distributed by the cell state store
//   g4_insufficient_acr  authentication strength below the tier floor (ADR-002)
//   g6_cell_mismatch    tenant not placed in this cell; g6_frozen: emergency freeze blocks write and above
// Rule 5 (network / device conditions) has no tenant settings in this PoC and is not evaluated (README gap list).
export const ACR_ORDER = { L1: 1, L2: 2, 'L2-PR': 3, L3: 4 };
export const TIER_MIN_ACR = { 'read-sensitive': 'L2', write: 'L2', privileged: 'L2-PR', 'privileged/T': 'L2-PR', 'privileged/P': 'L3', 'break-glass': 'L2' };
export const GUARDRAIL_CATALOG_VERSION = 'g-1';

/**
 * Returns null (no deny) or { reason, rule, detail }.
 * membership(): async engine check of core/tenant:<tid>#belongs for the subject.
 */
export async function evaluateGuardrails({ subject, resource, tier, sTid, rTid, cell, rev, objTenant, membership }) {
  const deny = (rule, detail) => ({ reason: `deny_guardrail:${rule}`, rule, detail });
  // rule 1 (part 1): tenant mismatch – deterministic, independent of the engine
  if (sTid !== rTid) return deny('g1_tenant_mismatch', 'subject tid != resource tid');
  const known = objTenant.get(`${resource.type}:${resource.id}`);
  if (known && known !== rTid) return deny('g1_tenant_mismatch', 'resource-derived tenant differs from façade registry');
  // rule 6: placement / freeze
  const placed = rev.tenantCell(rTid);
  if (placed && placed !== cell) return deny('g6_cell_mismatch', `tenant placed in ${placed}`);
  if (rev.frozen() && tier !== 'read-sensitive' && tier !== 'public') return deny('g6_frozen');
  // rules 3, 2
  if (rev.tenantSuspended(rTid)) return deny('g3_tenant_suspended');
  if (rev.subjectSuspended(subject.id)) return deny('g2_subject_suspended');
  // rule 4: authentication strength for human principals
  const ptype = subject.properties?.principal_type || 'human';
  if (ptype === 'human') {
    const acr = subject.properties?.acr;
    if (!acr || !ACR_ORDER[acr]) return { reason: 'deny_indeterminate', rule: 'g4', detail: 'acr missing' };
    const floor = TIER_MIN_ACR[tier] || 'L2';
    if (ACR_ORDER[acr] < ACR_ORDER[floor]) return deny('g4_insufficient_acr', `${acr} < ${floor}`);
  }
  // rule 1 (part 2): membership or external grant in the resource tenant (ADR-024 D24-08)
  if (subject.type === 'core/user') {
    const m = await membership();
    if (m.error === 'unavailable') return { reason: 'deny_unavailable', rule: 'g1', detail: m.detail };
    if (m.error) return { reason: 'deny_indeterminate', rule: 'g1', detail: m.detail };
    if (!m.allowed) return deny('g1_not_member');
  }
  return null;
}
