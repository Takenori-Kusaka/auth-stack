// TC-013 (5): evaluate the authorization requirement catalog (G-108) on both engines.
// Each entry is compiled from CAM (model/cam.js compileCam -> toOpenFga / toCedar). OpenFGA: one store per entry,
// Check with the request context passed directly (engine capability). Cedar: CedarAdapter (PIP snapshot) with the
// request context added to the condition context (subclass below), conditions implemented in the adapter's
// condition catalog. An entry is "表せる（検証済み）" only when the model compiles on both engines and every check
// returns the expected decision on both.
import { request } from '../../../lib/http.js';
import { compileCam, toOpenFga } from '../../../model/cam.js';
import { CedarAdapter, CONDITIONS } from '../../../pdp/adapters/cedar.js';

export const T0 = '2026-10-15T00:00:00.000Z';

// condition catalog implementations for the Cedar adapter (mirror the CEL expressions of the catalog file)
const need = (o, k) => { if (o === undefined || o[k] === undefined) throw new Error(`condition input ${k} missing`); return o[k]; };
export const CATALOG_CONDITIONS = {
  'c.network_zone': (t, r) => need(r, 'request_zone') === need(t, 'allowed_zone'),
  'c.time_window': (t, r) => { const c = Date.parse(need(r, 'current_time')); return c >= Date.parse(need(t, 'window_start')) && c < Date.parse(need(t, 'window_end')); },
  'c.device_managed': (t, r) => need(r, 'device_managed') === true,
  'c.min_acr': (t, r) => Number(need(r, 'acr_rank')) >= Number(need(t, 'min_rank')),
  'c.purpose_in': (t, r) => need(r, 'purpose') === need(t, 'allowed_purpose'),
};

class ContextCedar extends CedarAdapter {
  // same as CedarAdapter.check, but condition evaluation sees the full request context
  async checkWithContext(args, reqCtx) {
    const orig = this.condOk.bind(this);
    this.condOk = (t, rc) => orig(t, { ...rc, ...reqCtx });
    try { return await this.check({ ...args, now: Date.parse(reqCtx.current_time) }); } finally { this.condOk = orig; }
  }
}

function camOf(entry, conditions) {
  const declared = new Set(entry.types.map((t) => t.name));
  const extra = new Set(['core/user']);
  for (const t of entry.types) for (const r of t.relations || []) for (const d of r.directly_related) extra.add(d.split('#')[0]);
  const types = [...[...extra].filter((x) => !declared.has(x)).map((name) => ({ name })), ...entry.types];
  const used = new Set();
  for (const t of entry.types) for (const r of t.relations || []) for (const c of r.conditions || []) used.add(c);
  return { cam_version: '0.1.0', guardrail_catalog_version: 'g-1', conditions: Object.fromEntries([...used].map((c) => [c, conditions[c]])), types };
}
const tupleOf = ([ot, oid, rel, st, sid, srel, cond, cctx]) => ({ resource: { type: ot, id: oid }, relation: rel, subject: srel ? { type: st, id: sid, relation: srel } : { type: st, id: sid }, ...(cond ? { condition: { name: cond, context: cctx || {} } } : {}) });
const subjKey = (s) => `${s.type}:${s.id}${s.relation ? '#' + s.relation : ''}`;

export async function evaluateCatalog(catalog, fgaUrl, log = () => {}) {
  Object.assign(CONDITIONS, CATALOG_CONDITIONS);
  const results = [];
  for (const e of catalog.entries) {
    if (!e.types) { results.push({ id: e.id, category: e.category, desk: e.desk, cam: false, verdict: '表せない', alternative: e.alternative, checks: [] }); continue; }
    const out = { id: e.id, category: e.category, desk: e.desk, cam: true, alternative: e.alternative || null, openfga: { compiled: false }, cedar: { compiled: false }, checks: [] };
    let cam;
    try { cam = compileCam(camOf(e, catalog.conditions)); out.cam_revision = cam.revision; } catch (err) { out.cam_error = err.message; out.verdict = '表せない（CAM 不可）'; results.push(out); continue; }
    const tuples = e.tuples.map(tupleOf);
    // OpenFGA
    let storeId, modelId;
    try {
      const st = await request(`${fgaUrl}/stores`, { body: { name: `cat-${e.id}` } });
      storeId = st.json().id;
      const m = await request(`${fgaUrl}/stores/${storeId}/authorization-models`, { body: toOpenFga(cam) });
      if (m.status !== 201) throw new Error(m.text.slice(0, 300));
      modelId = m.json().authorization_model_id;
      const w = await request(`${fgaUrl}/stores/${storeId}/write`, { body: { authorization_model_id: modelId, writes: { tuple_keys: tuples.map((t) => ({ user: subjKey(t.subject), relation: t.relation, object: `${t.resource.type}:${t.resource.id}`, ...(t.condition ? { condition: { name: t.condition.name.replace(/\./g, '_'), context: t.condition.context } } : {}) })) } } });
      if (w.status !== 200) throw new Error('write: ' + w.text.slice(0, 300));
      out.openfga.compiled = true;
    } catch (err) { out.openfga.error = err.message; }
    // Cedar
    const ced = new ContextCedar({ storeFile: null });
    try {
      await ced.registerModel(cam);
      const r = await ced.write({ writes: tuples });
      if (!r.ok) throw new Error(JSON.stringify(r));
      out.cedar.compiled = true;
    } catch (err) { out.cedar.error = err.message; }
    for (const [user, type, id, perm, expect, ctx] of e.checks) {
      const reqCtx = { current_time: T0, ...(ctx || {}) };
      const c = { user, type, id, perm, expect, ctx: reqCtx };
      if (out.openfga.compiled) {
        const r = await request(`${fgaUrl}/stores/${storeId}/check`, { body: { authorization_model_id: modelId, tuple_key: { user: `core/user:${user}`, relation: perm, object: `${type}:${id}` }, context: reqCtx } });
        c.openfga = r.status === 200 ? r.json().allowed : `error ${r.status}: ${r.text.slice(0, 160)}`;
      }
      if (out.cedar.compiled) {
        const r = await ced.checkWithContext({ subject: { type: 'core/user', id: user }, relation: perm, resource: { type, id }, modelRevision: cam.revision }, reqCtx);
        c.cedar = r.error ? `error: ${r.detail}` : r.allowed;
      }
      c.ok = c.openfga === expect && c.cedar === expect;
      c.engines_agree = c.openfga === c.cedar;
      out.checks.push(c);
    }
    out.all_ok = out.openfga.compiled && out.cedar.compiled && out.checks.every((c) => c.ok);
    out.verdict = out.all_ok ? (String(e.desk).startsWith('一部') ? '一部（R 段部分を検証済み）' : '表せる（検証済み）') : '検証で不一致・不可';
    out.desk_agrees = (out.verdict.startsWith('表せる') && String(e.desk).startsWith('表せる')) || (out.verdict.startsWith('一部') && String(e.desk).startsWith('一部'));
    log(`${e.id} ${out.verdict}`);
    results.push(out);
  }
  const n = results.length;
  const representable = results.filter((r) => r.verdict.startsWith('表せる')).length;
  const partial = results.filter((r) => r.verdict.startsWith('一部')).length;
  const notRep = results.filter((r) => r.verdict.startsWith('表せない')).length;
  const failed = results.filter((r) => r.verdict.startsWith('検証で')).length;
  const engineDisagreements = results.flatMap((r) => r.checks.filter((c) => !c.engines_agree).map((c) => ({ id: r.id, ...c })));
  return {
    entries: n, representable_verified: representable, partial_verified: partial, not_representable: notRep, verification_failed: failed,
    representability_rate: representable / n, categories: [...new Set(results.map((r) => r.category))].length,
    alternatives_for_non_representable: results.filter((r) => !r.verdict.startsWith('表せる')).every((r) => !!r.alternative),
    engine_disagreements: engineDisagreements, results,
  };
}
