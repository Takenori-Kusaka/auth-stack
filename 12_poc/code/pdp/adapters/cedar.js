// Cedar adapter (R 段 engine #2, NA-POC-4: contract-swap only, not a production candidate).
// Cedar is not a relationship engine, so the adapter holds a PIP snapshot (the tuple store, persisted as an
// append-only op log) and materialises, per request, the minimal entity slice: the principal, the `cam::rel`
// usersets on paths from the principal to the resource's attribute targets, and the resource entity with all
// attributes required by the generated schema. Cedar then evaluates the CAM-generated policies.
// - errors in the Cedar response (skip-on-error) are mapped to deny_indeterminate (ADR-011 D3-3).
// - conditional tuples (c.* catalog) are evaluated by the adapter's condition catalog when building the slice.
// Fault hooks for TC-010 (façade /admin/fault {cedar:{...}}): dropAttr (remove a resource attribute),
// dropEntityPrefix (remove slice entities whose id starts with the prefix), noSchema (evaluate without schema).
import fs from 'node:fs';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import { toCedar, cedarType, relAttr, ttuAttr, actionId, cedarResourceAttrs } from '../../model/cam.js';

const objKey = (type, id) => `${type}:${id}`;
const relKey = (type, id, name) => `${type}:${id}#${name}`;
const subjKey = (s) => `${s.type}:${s.id}${s.relation ? '#' + s.relation : ''}`;
const tKey = (t) => `${t.resource.type}:${t.resource.id}#${t.relation}@${subjKey(t.subject)}`;

export const CONDITIONS = {
  // returns true / false, or throws when the input is missing (-> indeterminate)
  'c.not_expired': (tupleCtx, reqCtx) => {
    if (!tupleCtx || tupleCtx.expires_at === undefined) throw new Error('c.not_expired: expires_at missing');
    if (reqCtx.current_time === undefined) throw new Error('c.not_expired: current_time missing');
    return Date.parse(reqCtx.current_time) < Date.parse(tupleCtx.expires_at);
  },
};

export class TupleStore {
  constructor(file) {
    this.file = file;
    this.tuples = new Map();
    this.byObjectRel = new Map(); // "T:O#rel" -> Set(tkey)
    this.bySubject = new Map(); // subjKey -> Set(tkey)
    this.byType = new Map(); // type -> Set(objId)
    if (file && fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line) continue;
        const op = JSON.parse(line);
        for (const t of op.d || []) this._del(t);
        for (const t of op.w || []) this._add(t);
      }
    }
  }
  _idx(map, k, v, add) {
    let s = map.get(k);
    if (add) { if (!s) map.set(k, (s = new Set())); s.add(v); } else if (s) { s.delete(v); if (!s.size) map.delete(k); }
  }
  _add(t) {
    const k = tKey(t);
    this.tuples.set(k, t);
    this._idx(this.byObjectRel, relKey(t.resource.type, t.resource.id, t.relation), k, true);
    this._idx(this.bySubject, subjKey(t.subject), k, true);
    this._idx(this.byType, t.resource.type, t.resource.id, true);
  }
  _del(t) {
    const k = tKey(t);
    const old = this.tuples.get(k);
    if (!old) return false;
    this.tuples.delete(k);
    this._idx(this.byObjectRel, relKey(t.resource.type, t.resource.id, t.relation), k, false);
    this._idx(this.bySubject, subjKey(t.subject), k, false);
    return true;
  }
  /** Atomic apply (validate all first). */
  apply(writes, deletes, { onDuplicate, onMissing } = {}) {
    if (onDuplicate === 'ignore') writes = writes.filter((t) => !this.tuples.has(tKey(t)));
    if (onMissing === 'ignore') deletes = deletes.filter((t) => this.tuples.has(tKey(t)));
    for (const t of writes) if (this.tuples.has(tKey(t))) return { error: 'rejected', detail: `duplicate ${tKey(t)}` };
    for (const t of deletes) if (!this.tuples.has(tKey(t))) return { error: 'rejected', detail: `missing ${tKey(t)}` };
    for (const t of deletes) this._del(t);
    for (const t of writes) this._add(t);
    if (this.file) fs.appendFileSync(this.file, JSON.stringify({ w: writes, d: deletes }) + '\n');
    return { ok: true };
  }
  objectRel(type, id, rel) { return [...(this.byObjectRel.get(relKey(type, id, rel)) || [])].map((k) => this.tuples.get(k)); }
}

export class CedarAdapter {
  constructor({ storeFile, log }) {
    this.store = new TupleStore(storeFile);
    this.log = log;
    this.models = new Map(); // revision -> { cam, policySetId, schemaName, attrs }
    this.engine_id = 'cedar';
    this.engine_version = cedar.getCedarVersion();
    this.fault = null; // { dropAttr?, dropEntityPrefix?, noSchema? }
  }

  async init() { return this; }

  async registerModel(cam) {
    if (this.models.has(cam.revision)) return cam.revision;
    const { policies, schema } = toCedar(cam);
    const ps = cedar.preparsePolicySet(cam.revision, { staticPolicies: policies });
    if (ps.type !== 'success') throw new Error('cedar policy parse failed: ' + JSON.stringify(ps.errors));
    const sc = cedar.preparseSchema(cam.revision, schema);
    if (sc.type !== 'success') throw new Error('cedar schema parse failed: ' + JSON.stringify(sc.errors));
    const attrs = new Map();
    for (const t of cam.types.values()) attrs.set(t.name, cedarResourceAttrs(t));
    // index for the backward search: which monotonic permissions contain (ref name) or (ttu ts->name)
    const perms = new Map();
    for (const t of cam.types.values()) {
      const m = new Map();
      for (const p of t.perms.values()) if (p.monotonic) m.set(p.name, flatten(p.ast));
      perms.set(t.name, m);
    }
    this.models.set(cam.revision, { cam, attrs, perms });
    return cam.revision;
  }

  async write({ writes = [], deletes = [], onDuplicate, onMissing }) { return this.store.apply(writes, deletes, { onDuplicate, onMissing }); }

  condOk(t, reqCtx) {
    if (!t.condition) return true;
    const fn = CONDITIONS[t.condition.name];
    if (!fn) throw new Error(`unknown condition ${t.condition.name}`);
    return fn(t.condition.context, reqCtx);
  }

  /**
   * Backward search from the resource attribute targets to the principal. Returns parentsOf (child -> Set(parent))
   * restricted to nodes that can reach a target; user subjects other than the principal are pruned.
   */
  slice(model, principalKey, resource, reqCtx) {
    const { attrs, perms, cam } = model;
    const a = attrs.get(resource.type);
    const targets = new Set();
    const attrVals = {};
    for (const r of a.refs) { const k = relKey(resource.type, resource.id, r); targets.add(k); attrVals[relAttr(r)] = k; }
    for (const [ts, r] of a.ttus) {
      const list = [];
      for (const t of this.store.objectRel(resource.type, resource.id, ts)) {
        if (t.subject.relation) continue;
        if (!this.condOk(t, reqCtx)) continue;
        const k = relKey(t.subject.type, t.subject.id, r);
        targets.add(k);
        list.push(k);
      }
      attrVals[ttuAttr(ts, r)] = list;
    }
    const parentsOf = new Map();
    const seen = new Set(targets);
    const queue = [...targets];
    const link = (child, parent) => {
      let s = parentsOf.get(child);
      if (!s) parentsOf.set(child, (s = new Set()));
      s.add(parent);
      if (!seen.has(child)) { seen.add(child); if (child.includes('#')) queue.push(child); }
    };
    while (queue.length) {
      const node = queue.shift();
      const hash = node.lastIndexOf('#');
      const obj = node.slice(0, hash), name = node.slice(hash + 1);
      const colon = obj.indexOf(':');
      const type = obj.slice(0, colon), id = obj.slice(colon + 1);
      const ct = cam.types.get(type);
      if (!ct) continue;
      if (ct.rels.has(name)) {
        for (const t of this.store.objectRel(type, id, name)) {
          if (!this.condOk(t, reqCtx)) continue;
          const sk = subjKey(t.subject);
          if (t.subject.relation) link(sk, node);
          else if (sk === principalKey) link(sk, node);
          // plain non-principal objects are not members of usersets for user principals
        }
      }
      const items = perms.get(type).get(name);
      if (items) {
        for (const it of items) {
          if (it.op === 'ref') link(relKey(type, id, it.name), node);
          else if (it.op === 'ttu') {
            for (const t of this.store.objectRel(type, id, it.ts)) {
              if (t.subject.relation || !this.condOk(t, reqCtx)) continue;
              link(relKey(t.subject.type, t.subject.id, it.rel), node);
            }
          }
        }
      }
    }
    return { parentsOf, attrVals };
  }

  async check({ subject, relation, resource, modelRevision, now }) {
    const model = this.models.get(modelRevision);
    if (!model) return { error: 'indeterminate', detail: 'unknown model revision' };
    const ct = model.cam.types.get(resource.type);
    if (!ct || !ct.perms.has(relation)) {
      // relations (not permissions) are not exposed as actions in Cedar
      return { error: 'indeterminate', detail: `no action ${resource.type}#${relation}` };
    }
    if (subject.type !== 'core/user') return { error: 'indeterminate', detail: 'principal type' };
    const reqCtx = { current_time: new Date(now).toISOString() };
    const principalKey = `${subject.type}:${subject.id}`;
    let sl;
    try { sl = this.slice(model, principalKey, resource, reqCtx); } catch (e) { return { error: 'indeterminate', detail: e.message }; }
    const rel = (k) => ({ __entity: { type: 'cam::rel', id: k } });
    const entities = [];
    for (const [child, parents] of sl.parentsOf) {
      const uid = child === principalKey ? { type: 'core::user', id: subject.id } : { type: 'cam::rel', id: child };
      entities.push({ uid, attrs: {}, parents: [...parents].map((p) => ({ type: 'cam::rel', id: p })) });
    }
    if (!sl.parentsOf.has(principalKey)) entities.push({ uid: { type: 'core::user', id: subject.id }, attrs: {}, parents: [] });
    const rattrs = {};
    for (const [k, v] of Object.entries(sl.attrVals)) rattrs[k] = Array.isArray(v) ? v.map(rel) : rel(v);
    if (this.fault?.dropAttr) delete rattrs[this.fault.dropAttr];
    // RK-01 entity completeness (ADR-011 D3-x: Cedar 利用時は schema 検証と entity 完全性検査も必須; RS-07#40/#41).
    // Every entity the request references (resource attributes and parents) is materialised explicitly (a userset
    // with no members is an entity without parents; `in` semantics are unchanged), and after the slice is final the
    // adapter refuses to evaluate when any referenced entity is absent, because Cedar treats a missing entity as an
    // empty set and an exclusion (`!(principal in X)`) or forbid could then silently stop applying.
    const refIds = new Set();
    for (const v of Object.values(rattrs)) for (const x of [].concat(v)) refIds.add(x.__entity.id);
    for (const e of entities) for (const p of e.parents) refIds.add(p.id);
    const haveRel = new Set(entities.filter((e) => e.uid.type === 'cam::rel').map((e) => e.uid.id));
    for (const id of refIds) if (!haveRel.has(id)) { entities.push({ uid: { type: 'cam::rel', id }, attrs: {}, parents: [] }); haveRel.add(id); }
    entities.push({ uid: { type: cedarType(resource.type), id: resource.id }, attrs: rattrs, parents: [] });
    const pfx = this.fault?.dropEntityPrefix;
    const finalEntities = pfx ? entities.filter((e) => !String(e.uid.id).startsWith(pfx)) : entities;
    {
      const present = new Set(finalEntities.map((e) => `${e.uid.type}::${e.uid.id}`));
      const missing = [...refIds].map((id) => `cam::rel::${id}`).concat([`core::user::${subject.id}`, `${cedarType(resource.type)}::${resource.id}`]).filter((k) => !present.has(k));
      if (missing.length) return { error: 'indeterminate', detail: `entity_incomplete: ${missing.length} referenced entities missing` }; // RK-01
    }
    const ans = cedar.statefulIsAuthorized({
      principal: { type: 'core::user', id: subject.id },
      action: { type: 'cam::Action', id: actionId(resource.type, relation) },
      resource: { type: cedarType(resource.type), id: resource.id },
      context: {},
      preparsedPolicySetId: modelRevision,
      preparsedSchemaName: this.fault?.noSchema ? undefined : modelRevision,
      validateRequest: !this.fault?.noSchema,
      entities: finalEntities,
    });
    if (ans.type !== 'success') return { error: 'indeterminate', detail: ans.errors.map((e) => e.message).join('; ') };
    if (ans.response.diagnostics.errors.length) {
      return { error: 'indeterminate', detail: ans.response.diagnostics.errors.map((e) => `${e.policyId}: ${e.error.message}`).join('; ') };
    }
    return { allowed: ans.response.decision === 'allow', slice: entities.length };
  }

  async listObjects({ type, relation, subject, modelRevision, now, candidates, max = 1000, deadlineMs = 3000 }) {
    const t0 = Date.now();
    const ids = candidates || [...(this.store.byType.get(type) || [])];
    const out = [];
    let truncated = false;
    for (const id of ids) {
      if (out.length >= max || Date.now() - t0 > deadlineMs) { truncated = true; break; }
      const r = await this.check({ subject, relation, resource: { type, id }, modelRevision, now });
      if (r.error === 'unavailable') return r;
      if (r.error) return { error: 'indeterminate', detail: r.detail }; // RK-09: an item that cannot be evaluated makes the enumeration fail (never a silently shorter / empty list, ADR-025 D25-19)
      if (r.allowed) out.push(id);
    }
    return { objects: out, truncated };
  }

  async read({ resource, relation, subject } = {}) {
    const out = [];
    for (const t of this.store.tuples.values()) {
      if (resource && (t.resource.type !== resource.type || (resource.id && t.resource.id !== resource.id))) continue;
      if (relation && t.relation !== relation) continue;
      if (subject && subjKey(t.subject) !== subjKey(subject)) continue;
      out.push({ user: subjKey(t.subject), relation: t.relation, object: `${t.resource.type}:${t.resource.id}`, condition: t.condition });
    }
    return { tuples: out };
  }
}

function flatten(a) {
  if (a.op === 'or') return a.args.flatMap(flatten);
  return [a];
}
