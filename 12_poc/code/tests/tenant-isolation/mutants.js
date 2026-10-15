// TC-002 step (4): mutants with one tenant-isolation defect each, k = 3 per class (TC-002.params.json).
// Classes (test plan §4.2): PEP call removed / tenant scope removed / DB row condition removed.
// Each mutant is materialised as a test-only copy under 12_poc/code/.run/mutants/ (common.js materialiseMutant);
// the base code is never modified.
const NO_PEP_GUARD = (resolverArgs) => `const g = await (async () => { /* MUTANT: PEP decision removed (authentication only) */
    const u2 = new URL(req.url, 'https://local');
    const f = pep.findEntryPoint(req.method, u2.pathname);
    if (!f) { send(res, 404, { error: 'not_found' }); return { ok: false }; }
    const a = await pep.authenticate(req, f.ep);
    if (a.error) { send(res, 401, { error: 'unauthorized' }); return { ok: false }; }
    const tp = req.headers.traceparent; const tId = (tp || '').split('-')[1];
    pep.local({ ep: f.ep.id, result: 'permitted', internal_reason: 'MUTANT_no_pep_decision', trace_id: tId });
    void (${resolverArgs});
    return { ok: true, ctx: { ep: f.ep, params: f.params, principal: a.principal, tid: a.principal.tid, decision: { decision_id: 'mutant-no-decision' }, traceparent: tp, traceId: tId } };
  })();`;

const SERVICES = {
  'file-service': 'services/file-service.js',
  'tool-service': 'services/tool-service.js',
  'label-service': 'services/label-service.js',
};

export const MUTANTS = [
  // ---- class P: PEP call removed -------------------------------------------------------------------
  {
    id: 'P1-file-service-no-pep', class: 'pep_removed', index: 1,
    files: [{ path: 'services/file-service.js', replace: [['const g = await pep.guard(req, res, { resolver, consistencyToken: ctoken });', NO_PEP_GUARD('resolver, ctoken')]] }],
    components: { 'file-service': 'services/file-service.js' },
  },
  {
    id: 'P2-label-service-no-pep', class: 'pep_removed', index: 2,
    files: [{ path: 'services/label-service.js', replace: [['const g = await pep.guard(req, res, { resolver });', NO_PEP_GUARD('resolver')]] }],
    components: { 'label-service': 'services/label-service.js' },
  },
  {
    id: 'P3-tool-service-no-pep', class: 'pep_removed', index: 3,
    files: [{ path: 'services/tool-service.js', replace: [['const g = await pep.guard(req, res, { resolver });', NO_PEP_GUARD('resolver')]] }],
    components: { 'tool-service': 'services/tool-service.js' },
  },
  // ---- class T: tenant scope removed ------------------------------------------------------------------
  {
    id: 'T1-pep-sdk-no-l0-resource-tenant', class: 'tenant_scope_removed', index: 4,
    files: [
      { path: 'pep/sdk.js', replace: [["    if (tRes !== tTok) return { deny: 'l0:mismatch' };", '    /* MUTANT: L0 resource-derived tenant comparison removed */']] },
      { path: SERVICES['file-service'] }, { path: SERVICES['tool-service'] }, { path: SERVICES['label-service'] },
    ],
    components: { ...SERVICES },
  },
  {
    id: 'T2-facade-no-g1-tenant-match', class: 'tenant_scope_removed', index: 5,
    files: [
      { path: 'pdp/guardrails.js', replace: [[
        "  if (sTid !== rTid) return deny('g1_tenant_mismatch', 'subject tid != resource tid');\n  const known = objTenant.get(`${resource.type}:${resource.id}`);\n  if (known && known !== rTid) return deny('g1_tenant_mismatch', 'resource-derived tenant differs from façade registry');",
        '  /* MUTANT: G-stage rule 1 part 1 (tid equality and resource-derived tenant) removed */ void objTenant;',
      ]] },
      { path: 'pdp/facade.js' },
    ],
    components: { pdp: 'pdp/facade.js' },
  },
  {
    id: 'T3-edge-no-route-tenant', class: 'tenant_scope_removed', index: 6,
    files: [{ path: 'services/edge.js', replace: [["  if (params.tid !== undefined && params.tid !== intro.tid) { L({ status: 404, reason: 'route_tenant_mismatch' }); return deny(res, 404); }", '  /* MUTANT: route tenant == token tenant check removed */']] }],
    components: { edge: 'services/edge.js' },
  },
  // ---- class D: DB row condition removed -------------------------------------------------------------
  {
    id: 'D1-file-list-no-tid-condition', class: 'db_row_condition_removed', index: 7,
    files: [{ path: 'services/file-service.js', replace: [["filesIn: db.prepare('SELECT id FROM files WHERE folder = ? AND tid = ? ORDER BY id'),", "filesIn: db.prepare('SELECT id FROM files WHERE folder = ? AND (tid = ? OR 1) ORDER BY id'), /* MUTANT: tenant row condition removed */"]] }],
    components: { 'file-service': 'services/file-service.js' },
  },
  {
    id: 'D2-file-move-no-target-tenant', class: 'db_row_condition_removed', index: 8,
    files: [{ path: 'services/file-service.js', replace: [["      if (!tf || tf.tid !== tid) return send(res, 404, { error: 'not_found' });", "      if (!tf) return send(res, 404, { error: 'not_found' }); /* MUTANT: target folder tenant condition removed */"]] }],
    components: { 'file-service': 'services/file-service.js' },
  },
  {
    id: 'D3-file-lookup-trusts-route-tenant', class: 'db_row_condition_removed', index: 9,
    files: [{ path: 'services/file-service.js', replace: [
      ['  return { tid: row.tid };\n};', '  return { tid: currentPathTid }; /* MUTANT: owner tenant column ignored, route tenant trusted */\n};\nlet currentPathTid;'],
      ['  const g = await pep.guard(req, res, { resolver, consistencyToken: ctoken });', '  currentPathTid = (/^\\/t\\/([^/]+)\\//.exec(url.pathname) || [])[1];\n  const g = await pep.guard(req, res, { resolver, consistencyToken: ctoken });'],
    ] }],
    components: { 'file-service': 'services/file-service.js' },
  },
];
