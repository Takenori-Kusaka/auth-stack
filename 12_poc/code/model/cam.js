// CAM loader, expression parser and the two generators (OpenFGA model JSON / DSL, Cedar policies + schema).
// Expression grammar (authorization-model.md §8.1 の擬似表記):
//   expr   := term ('|' term)*                 union (lowest precedence)
//   term   := factor (('&' | '-') factor)*     intersection / exclusion, left associative
//   factor := '(' expr ')' | name '->' name | name
// Generated artifacts are derived only from the CAM (ADR-011 D2-3: DSL は CAM から生成し人が直接編集しない).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { canonical } from '../lib/canon.js';

export function loadCam(file) {
  const cam = JSON.parse(fs.readFileSync(file, 'utf8'));
  return compileCam(cam);
}

export function camRevision(cam) {
  const raw = cam.raw || cam;
  return 'm-' + crypto.createHash('sha256').update(canonical({ types: raw.types, conditions: raw.conditions })).digest('hex').slice(0, 16);
}

export function parseExpr(src) {
  const toks = src.match(/->|[|&\-()]|[a-z][a-z0-9_]*/g);
  if (!toks || toks.join('').replace(/\s/g, '') !== src.replace(/\s/g, '')) throw new Error(`bad expression: ${src}`);
  let i = 0;
  const peek = () => toks[i];
  const eat = (t) => { if (toks[i] !== t) throw new Error(`expected ${t} in ${src}`); i++; };
  function factor() {
    if (peek() === '(') { eat('('); const e = expr(); eat(')'); return e; }
    const name = toks[i++];
    if (!/^[a-z]/.test(name || '')) throw new Error(`unexpected ${name} in ${src}`);
    if (peek() === '->') { i++; const rel = toks[i++]; return { op: 'ttu', ts: name, rel }; }
    return { op: 'ref', name };
  }
  function term() {
    let l = factor();
    while (peek() === '&' || peek() === '-') {
      const o = toks[i++];
      const r = factor();
      if (o === '&') l = l.op === 'and' ? { op: 'and', args: [...l.args, r] } : { op: 'and', args: [l, r] };
      else l = { op: 'but', base: l, sub: r };
    }
    return l;
  }
  function expr() {
    let l = term();
    while (peek() === '|') { i++; const r = term(); l = l.op === 'or' ? { op: 'or', args: [...l.args, r] } : { op: 'or', args: [l, r] }; }
    return l;
  }
  const e = expr();
  if (i !== toks.length) throw new Error(`trailing tokens in ${src}`);
  return e;
}

/** Compile: index types, parse permissions, classify monotonic names, validate references. */
export function compileCam(raw) {
  const types = new Map();
  for (const t of raw.types) {
    const rels = new Map((t.relations || []).map((r) => [r.name, r]));
    const perms = new Map((t.permissions || []).map((p) => [p.name, { ...p, ast: parseExpr(p.expression) }]));
    for (const n of perms.keys()) if (rels.has(n)) throw new Error(`${t.name}: ${n} is both relation and permission`);
    types.set(t.name, { name: t.name, raw: t, rels, perms });
  }
  const isMonotonicAst = (a) => a.op === 'ref' || a.op === 'ttu' || (a.op === 'or' && a.args.every(isMonotonicAst));
  for (const t of types.values()) {
    for (const p of t.perms.values()) p.monotonic = isMonotonicAst(p.ast);
  }
  // validation: refs exist; ttu tupleset is a relation whose targets define the referenced name; referenced names inside
  // other expressions must be monotonic (needed by the Cedar hierarchy encoding)
  const has = (t, n) => t.rels.has(n) || t.perms.has(n);
  const walk = (t, a, top) => {
    if (a.op === 'ref') {
      if (!has(t, a.name)) throw new Error(`${t.name}: unknown ${a.name}`);
      const p = t.perms.get(a.name);
      if (p && !p.monotonic) throw new Error(`${t.name}: ${a.name} referenced but not monotonic`);
    } else if (a.op === 'ttu') {
      const ts = t.rels.get(a.ts);
      if (!ts) throw new Error(`${t.name}: tupleset ${a.ts} is not a relation`);
      const targets = ts.directly_related.filter((d) => !d.includes('#'));
      const ok = targets.filter((d) => types.get(d) && has(types.get(d), a.rel));
      if (ok.length === 0) throw new Error(`${t.name}: ${a.ts}->${a.rel} resolves on no target type`);
      for (const d of ok) { const p = types.get(d).perms.get(a.rel); if (p && !p.monotonic) throw new Error(`${d}.${a.rel} used via ttu but not monotonic`); }
    } else if (a.op === 'or' || a.op === 'and') a.args.forEach((x) => walk(t, x));
    else if (a.op === 'but') { walk(t, a.base); walk(t, a.sub); }
  };
  for (const t of types.values()) for (const p of t.perms.values()) walk(t, p.ast, true);
  const cam = { raw, types, revision: null, guardrailVersion: raw.guardrail_catalog_version || 'g-1', conditions: raw.conditions || {} };
  cam.revision = camRevision(raw);
  return cam;
}

export function permissionTier(cam, type, name) {
  const t = cam.types.get(type);
  const p = t && t.perms.get(name);
  if (!p) return null;
  return { read_sensitive: 'read-sensitive', break_glass: 'break-glass' }[p.tier] || p.tier;
}

// ------------------------------------------------------------------------------------------------
// OpenFGA (schema 1.1 JSON). Condition ids use '_' (c.not_expired -> c_not_expired).
// ------------------------------------------------------------------------------------------------
export const fgaCond = (c) => c.replace(/\./g, '_');

function fgaRewrite(a) {
  switch (a.op) {
    case 'ref': return { computedUserset: { relation: a.name } };
    case 'ttu': return { tupleToUserset: { tupleset: { relation: a.ts }, computedUserset: { relation: a.rel } } };
    case 'or': return { union: { child: a.args.map(fgaRewrite) } };
    case 'and': return { intersection: { child: a.args.map(fgaRewrite) } };
    case 'but': return { difference: { base: fgaRewrite(a.base), subtract: fgaRewrite(a.sub) } };
    default: throw new Error(a.op);
  }
}

export function toOpenFga(cam) {
  const type_definitions = [];
  for (const t of cam.types.values()) {
    const relations = {};
    const meta = {};
    for (const r of t.rels.values()) {
      relations[r.name] = { this: {} };
      const conds = (r.conditions || []).map(fgaCond);
      meta[r.name] = {
        directly_related_user_types: r.directly_related.flatMap((d) => {
          const [type, relation] = d.split('#');
          const base = relation ? { type, relation } : { type };
          return conds.length ? conds.map((c) => ({ ...base, condition: c })) : [base];
        }),
      };
    }
    for (const p of t.perms.values()) relations[p.name] = fgaRewrite(p.ast);
    const td = { type: t.name };
    if (Object.keys(relations).length) { td.relations = relations; td.metadata = { relations: meta }; }
    type_definitions.push(td);
  }
  const typeMap = { timestamp: 'TYPE_NAME_TIMESTAMP', string: 'TYPE_NAME_STRING', int: 'TYPE_NAME_INT', bool: 'TYPE_NAME_BOOL', list_string: 'TYPE_NAME_LIST' };
  const conditions = {};
  for (const [name, c] of Object.entries(cam.conditions)) {
    const id = fgaCond(name);
    conditions[id] = {
      name: id,
      expression: c.expression,
      parameters: Object.fromEntries(Object.entries(c.parameters).map(([k, v]) => [k, { type_name: typeMap[v] }])),
    };
  }
  return { schema_version: '1.1', type_definitions, conditions };
}

// ------------------------------------------------------------------------------------------------
// Cedar. Encoding (PoC, see README "Cedar への写像"):
//  * every (object, monotonic name) is a `cam::rel` entity "<type>:<id>#<name>"; userset membership is the entity
//    hierarchy (principal in Rel). The façade's Cedar adapter (PIP snapshot) materialises the principal's ancestors.
//  * every CAM permission becomes one permit policy on action cam::Action::"<type>#<perm>"; non-monotonic operators
//    (&, -) become boolean expressions over `principal in resource.<attr>`.
//  * resource attributes: rel_<name> (Entity cam::rel), ttu_<ts>__<name> (Set<cam::rel>).
// ------------------------------------------------------------------------------------------------
export const cedarType = (t) => t.replace('/', '::');
export const relAttr = (n) => `rel_${n}`;
export const ttuAttr = (ts, n) => `ttu_${ts}__${n}`;
export const actionId = (type, perm) => `${type}#${perm}`;

function cedarExpr(a) {
  switch (a.op) {
    case 'ref': return `(principal in resource.${relAttr(a.name)})`;
    case 'ttu': return `(principal in resource.${ttuAttr(a.ts, a.rel)})`;
    case 'or': return `(${a.args.map(cedarExpr).join(' || ')})`;
    case 'and': return `(${a.args.map(cedarExpr).join(' && ')})`;
    case 'but': return `(${cedarExpr(a.base)} && !${cedarExpr(a.sub)})`;
    default: throw new Error(a.op);
  }
}

/** Attributes a resource of type t needs (names referenced by any permission of t, plus monotonic own names). */
export function cedarResourceAttrs(t) {
  const refs = new Set(), ttus = new Set();
  const walk = (a) => {
    if (a.op === 'ref') refs.add(a.name);
    else if (a.op === 'ttu') ttus.add(`${a.ts}\u0000${a.rel}`);
    else if (a.args) a.args.forEach(walk);
    else if (a.op === 'but') { walk(a.base); walk(a.sub); }
  };
  for (const p of t.perms.values()) walk(p.ast);
  return { refs: [...refs], ttus: [...ttus].map((s) => s.split('\u0000')) };
}

export function toCedar(cam) {
  const policies = [];
  for (const t of cam.types.values()) {
    for (const p of t.perms.values()) {
      policies.push(`@id("${actionId(t.name, p.name)}")\npermit (\n  principal,\n  action == cam::Action::"${actionId(t.name, p.name)}",\n  resource is ${cedarType(t.name)}\n)\nwhen { ${cedarExpr(p.ast)} };`);
    }
  }
  // schema (JSON form)
  const ns = {};
  const ensure = (n) => (ns[n] ||= { entityTypes: {}, actions: {} });
  ensure('cam').entityTypes.rel = { memberOfTypes: ['rel'] };
  for (const t of cam.types.values()) {
    const [n, name] = t.name.split('/');
    const { refs, ttus } = cedarResourceAttrs(t);
    const attributes = {};
    for (const r of refs) attributes[relAttr(r)] = { type: 'Entity', name: 'cam::rel', required: true };
    for (const [ts, r] of ttus) attributes[ttuAttr(ts, r)] = { type: 'Set', element: { type: 'Entity', name: 'cam::rel' }, required: true };
    ensure(n).entityTypes[name] = { memberOfTypes: ['cam::rel'], shape: { type: 'Record', attributes } };
    for (const p of t.perms.values()) {
      ensure('cam').actions[actionId(t.name, p.name)] = { appliesTo: { principalTypes: ['core::user'], resourceTypes: [cedarType(t.name)], context: { type: 'Record', attributes: {} } } };
    }
  }
  return { policies: policies.join('\n\n') + '\n', schema: ns };
}
