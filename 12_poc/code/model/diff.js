// CAM model differential (ADR-016 D16-31 段 2 の「権限が広がる差分の検出」, relationship-model-registry
// validateModelChange). Used by the façade registration gate (PDP_MODEL_GATE=1) and the CI script
// (tests/revocation-consistency/ci-model-guard.js, TC-012 (4)).
//   evaluator : a JS port of the reference semantics (ref/ref_eval.py): relations = direct + userset tuples,
//               permissions = expressions over name | ts->name | a|b | a&b | a-b, conditions c.not_expired
//   search    : bounded random universes generated from the union of both schemas; tuples are filtered by each
//               model's own schema (a subject type the base does not allow cannot exist under the base)
//   result    : widening (candidate allows, base denies) / narrowing witnesses per (type, permission), and
//               permissions whose definition changed without any witness ("unproven", treated as needing approval)
import { parseExpr } from './cam.js';
import { seededRng } from '../lib/ids.js';

function schemaOf(raw) {
  const types = new Map();
  for (const t of raw.types) {
    types.set(t.name, {
      rels: new Map((t.relations || []).map((r) => [r.name, r])),
      perms: new Map((t.permissions || []).map((p) => [p.name, { expr: p.expression, ast: parseExpr(p.expression) }])),
    });
  }
  return types;
}

export class CamEvaluator {
  constructor(raw, tuples, now = Date.now()) {
    this.types = schemaOf(raw);
    this.now = now;
    this.idx = new Map();
    for (const t of tuples) {
      if (!this.valid(t)) continue;
      const k = `${t.resource.type}|${t.resource.id}|${t.relation}`;
      if (!this.idx.has(k)) this.idx.set(k, []);
      this.idx.get(k).push(t);
    }
  }

  valid(t) {
    const ty = this.types.get(t.resource.type);
    const rel = ty && ty.rels.get(t.relation);
    if (!rel) return false;
    const st = t.subject.relation ? `${t.subject.type}#${t.subject.relation}` : t.subject.type;
    if (!rel.directly_related.includes(st)) return false;
    if ((rel.conditions || []).length && !t.condition) return false;
    if (!(rel.conditions || []).length && t.condition) return false;
    return true;
  }

  condOk(t) {
    if (!t.condition) return true;
    if (t.condition.name === 'c.not_expired') return this.now < Date.parse(t.condition.context.expires_at);
    return false;
  }

  defines(type, name) { const t = this.types.get(type); return !!t && (t.rels.has(name) || t.perms.has(name)); }

  check(type, id, name, user, visiting = new Set()) {
    const key = `${type}|${id}|${name}`;
    if (visiting.has(key)) return false;
    const v = new Set(visiting); v.add(key);
    const t = this.types.get(type);
    if (!t) return false;
    if (t.rels.has(name)) {
      for (const tu of this.idx.get(key) || []) {
        if (!this.condOk(tu)) continue;
        const s = tu.subject;
        if (s.relation) { if (this.defines(s.type, s.relation) && this.check(s.type, s.id, s.relation, user, v)) return true; }
        else if (s.type === 'core/user' && s.id === user) return true;
      }
      return false;
    }
    const p = t.perms.get(name);
    if (!p) return false;
    return this.ev(p.ast, type, id, user, v);
  }

  ev(a, type, id, user, v) {
    switch (a.op) {
      case 'ref': return this.check(type, id, a.name, user, v);
      case 'ttu':
        for (const tu of this.idx.get(`${type}|${id}|${a.ts}`) || []) {
          const s = tu.subject;
          if (s.relation || !this.condOk(tu)) continue;
          if (this.defines(s.type, a.rel) && this.check(s.type, s.id, a.rel, user, v)) return true;
        }
        return false;
      case 'or': return a.args.some((x) => this.ev(x, type, id, user, v));
      case 'and': return a.args.every((x) => this.ev(x, type, id, user, v));
      case 'but': return this.ev(a.base, type, id, user, v) && !this.ev(a.sub, type, id, user, v);
      default: throw new Error(a.op);
    }
  }
}

/** Random small universe over the union of the two schemas. */
export function randomUniverse(rawA, rawB, rng, { objectsPerType = 2, users = 3, p = 0.3, now = Date.now() } = {}) {
  const typeNames = [...new Set([...rawA.types, ...rawB.types].map((t) => t.name))].filter((n) => n !== 'core/user');
  const objs = Object.fromEntries(typeNames.map((n) => [n, Array.from({ length: objectsPerType }, (_, i) => `o${i}`)]));
  const us = Array.from({ length: users }, (_, i) => `u${i}`);
  const rels = new Map();
  for (const raw of [rawA, rawB]) for (const t of raw.types) for (const r of t.relations || []) {
    const k = `${t.name}#${r.name}`;
    const prev = rels.get(k) || { type: t.name, name: r.name, dr: new Set(), conditions: new Set() };
    r.directly_related.forEach((d) => prev.dr.add(d));
    (r.conditions || []).forEach((c) => prev.conditions.add(c));
    rels.set(k, prev);
  }
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const tuples = [];
  for (const r of rels.values()) {
    for (const oid of objs[r.type] || []) {
      for (const d of r.dr) {
        if (rng() >= p) continue;
        const [st, srel] = d.split('#');
        const subject = st === 'core/user' ? { type: st, id: pick(us) } : { type: st, id: pick(objs[st] || ['o0']), ...(srel ? { relation: srel } : {}) };
        const t = { resource: { type: r.type, id: oid }, relation: r.name, subject };
        if (r.conditions.size && rng() < 0.85) t.condition = { name: [...r.conditions][0], context: { expires_at: new Date(now + (rng() < 0.5 ? -3600_000 : 3600_000)).toISOString() } };
        tuples.push(t);
        if (st !== 'core/user' && rng() < 0.3) tuples.push({ ...t, subject: { ...subject, id: pick(objs[st] || ['o0']) } });
      }
    }
  }
  return { tuples, users: us, objs };
}

const permDefs = (raw) => new Map(raw.types.flatMap((t) => (t.permissions || []).map((p) => [`${t.name}#${p.name}`, p.expression])));
const relDefs = (raw) => new Map(raw.types.flatMap((t) => (t.relations || []).map((r) => [`${t.name}#${r.name}`, JSON.stringify({ d: [...r.directly_related].sort(), c: r.conditions || [] })])));

/**
 * Differential between a base and a candidate CAM.
 * Returns { widening: [{type, permission, witnesses}], narrowing: [...], unproven: [...], changed_definitions: [...], universes }
 */
export function diffModels(baseRaw, candRaw, { seed = 'model-diff', universes = 300, now = Date.now() } = {}) {
  const rng = seededRng(`diff:${seed}`);
  const bPerm = permDefs(baseRaw), cPerm = permDefs(candRaw), bRel = relDefs(baseRaw), cRel = relDefs(candRaw);
  const changed = [];
  for (const [k, e] of cPerm) if (bPerm.get(k) !== e) changed.push({ key: k, kind: bPerm.has(k) ? 'permission_changed' : 'permission_added', base: bPerm.get(k) ?? null, candidate: e });
  for (const [k, e] of bPerm) if (!cPerm.has(k)) changed.push({ key: k, kind: 'permission_removed', base: e, candidate: null });
  for (const [k, e] of cRel) if (bRel.get(k) !== e) changed.push({ key: k, kind: bRel.has(k) ? 'relation_changed' : 'relation_added', base: bRel.get(k) ?? null, candidate: e });
  for (const [k, e] of bRel) if (!cRel.has(k)) changed.push({ key: k, kind: 'relation_removed', base: e, candidate: null });
  const W = new Map(), N = new Map();
  const add = (m, k, w) => { if (!m.has(k)) m.set(k, []); if (m.get(k).length < 3) m.get(k).push(w); };
  const shared = [...cPerm.keys()].filter((k) => bPerm.has(k));
  if (changed.length) {
    for (let u = 0; u < universes; u++) {
      const uni = randomUniverse(baseRaw, candRaw, rng, { now });
      const eb = new CamEvaluator(baseRaw, uni.tuples, now), ec = new CamEvaluator(candRaw, uni.tuples, now);
      for (const k of shared) {
        const [type, perm] = k.split('#');
        for (const oid of uni.objs[type] || []) for (const user of uni.users) {
          const b = eb.check(type, oid, perm, user), c = ec.check(type, oid, perm, user);
          if (c && !b) add(W, k, { universe: u, object: `${type}:${oid}`, user, tuples: uni.tuples.length });
          else if (b && !c) add(N, k, { universe: u, object: `${type}:${oid}`, user });
        }
      }
    }
  }
  const widening = [...W].map(([k, w]) => ({ type: k.split('#')[0], permission: k.split('#')[1], witnesses: w }));
  const narrowing = [...N].map(([k, w]) => ({ type: k.split('#')[0], permission: k.split('#')[1], witnesses: w }));
  const directlyChangedPerms = changed.filter((c) => c.kind === 'permission_changed').map((c) => c.key);
  const unproven = directlyChangedPerms.filter((k) => !W.has(k) && !N.has(k));
  const added = changed.filter((c) => c.kind === 'permission_added' || c.kind === 'relation_added' || c.kind === 'relation_changed').map((c) => c.key);
  return {
    universes: changed.length ? universes : 0,
    changed_definitions: changed,
    widening, narrowing, unproven,
    // a new permission or a relation that accepts more subject types can only grant more: it needs approval too
    requires_approval: widening.length > 0 || unproven.length > 0 || added.length > 0,
    approval_reasons: [...widening.map((w) => `widening:${w.type}#${w.permission}`), ...unproven.map((k) => `unproven:${k}`), ...added.map((k) => `added_or_extended:${k}`)],
  };
}
