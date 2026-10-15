// TC-026 CI guards (mock-contract-test-kit.md §9.1 P-2 and §9.3; ADR-022 H-5/H-9; claims-catalog §9):
//  (1) contractDiff(old, new): declarative breaking-change detection over JSON Schema / OpenAPI component schemas —
//      default changed, value added to a closed enum, property removed, required added (constraint strengthened),
//      tighter limits / pattern changed. Description-only (meaning) changes are not detectable by declaration.
//  (2) codeGuard(files): static rules over consumer source and CAM modules —
//      G1 engine client imported or engine API called directly by a service, G2 enumeration API called outside the
//      SDK list helper, G3 identifier rules (mutable attributes used as keys, parsing / composing opaque identifiers),
//      G4 namespace collision (domain module declaring a reserved `core/` type or a type that already exists).

function walk(a, b, p, out) {
  if (a === undefined && b === undefined) return;
  if (a && typeof a === 'object' && !Array.isArray(a) && b && typeof b === 'object' && !Array.isArray(b)) {
    if ('default' in a || 'default' in b) if (JSON.stringify(a.default) !== JSON.stringify(b.default)) out.push({ path: p, kind: 'default_changed' });
    if (Array.isArray(a.enum) && Array.isArray(b.enum)) { const added = b.enum.filter((x) => !a.enum.includes(x)); const removed = a.enum.filter((x) => !b.enum.includes(x)); if (added.length) out.push({ path: p, kind: 'enum_value_added', added }); if (removed.length) out.push({ path: p, kind: 'enum_value_removed', removed }); }
    if (a.properties || b.properties) {
      const ap = a.properties || {}, bp = b.properties || {};
      for (const k of Object.keys(ap)) if (!(k in bp)) out.push({ path: `${p}.properties.${k}`, kind: 'property_removed' });
      for (const k of Object.keys(bp)) if (k in ap) walk(ap[k], bp[k], `${p}.properties.${k}`, out);
    }
    const ar = new Set(a.required || []), br = b.required || [];
    for (const r of br) if (!ar.has(r)) out.push({ path: p, kind: 'required_added', field: r });
    for (const [k, tighter] of [['maxLength', (x, y) => y < x], ['maximum', (x, y) => y < x], ['minLength', (x, y) => y > x], ['minimum', (x, y) => y > x], ['maxItems', (x, y) => y < x]]) if (k in a && k in b && tighter(a[k], b[k])) out.push({ path: p, kind: `${k}_tightened` });
    if ('pattern' in a && 'pattern' in b && a.pattern !== b.pattern) out.push({ path: p, kind: 'pattern_changed' });
    for (const k of ['items', 'additionalProperties']) if (a[k] && b[k] && typeof a[k] === 'object') walk(a[k], b[k], `${p}.${k}`, out);
    for (const k of ['allOf', 'anyOf', 'oneOf']) if (Array.isArray(a[k]) && Array.isArray(b[k])) a[k].forEach((x, i) => walk(x, b[k][i], `${p}.${k}[${i}]`, out));
    for (const k of ['$defs', 'schemas']) if (a[k] && b[k]) for (const n of Object.keys(a[k])) { if (!(n in b[k])) out.push({ path: `${p}.${k}.${n}`, kind: 'definition_removed' }); else walk(a[k][n], b[k][n], `${p}.${k}.${n}`, out); }
    if (a.components && b.components) walk(a.components, b.components, `${p}.components`, out);
  }
}
export function contractDiff(oldDoc, newDoc) { const out = []; walk(oldDoc, newDoc, '#', out); return { breaking: out, block: out.length > 0 }; }

const RULES = [
  { id: 'G1', re: /from\s+['"][^'"]*(pdp\/adapters|@openfga\/sdk|@cedar-policy\/cedar-wasm)[^'"]*['"]|\/stores\/[^'"`]*\/(check|list-objects)|urls\.openfga/, scope: 'service', why: 'engine client imported / engine API called directly (ADR-011 D5-3, ADR-022)' },
  { id: 'G2', re: /\/access\/v1\/search\/resource|list-objects|ListObjects\(/, scope: 'service', why: 'enumeration API called outside the SDK list helper (ADR-025 D25-03)' },
  { id: 'G3', re: /\b(email|preferred_username|upn|userName)\b\s*[\]\)]?\s*(===|==|\bas key\b)|\.get\(\s*[\w.]*\b(email|preferred_username)\b|\b(tid|sub|id)\s*\.\s*(split|slice|substring)\s*\(|`\$\{tid\}[-:_]/, scope: 'service', why: 'identifier rule (INV-2 mutable attributes as keys / parsing or composing opaque identifiers, ADR-021, DEV-3)' },
];
/** files: [{ path, text, kind: 'service' | 'cam' }]; baseCamTypes: Set of existing type names */
export function codeGuard(files, baseCamTypes) {
  const findings = [];
  for (const f of files) {
    if (f.kind === 'service') {
      const lines = f.text.split('\n');
      lines.forEach((l, i) => { if (/^\s*\/\//.test(l)) return; for (const r of RULES) if (r.re.test(l)) findings.push({ rule: r.id, file: f.path, line: i + 1, why: r.why }); });
    } else if (f.kind === 'cam') {
      const cam = JSON.parse(f.text);
      for (const t of cam.types || []) {
        if (String(t.name).startsWith('core/') && cam.owner !== 'platform') findings.push({ rule: 'G4', file: f.path, type: t.name, why: 'reserved namespace core/ declared by a domain module' });
        if (baseCamTypes.has(t.name) && cam.owner !== 'platform') findings.push({ rule: 'G4', file: f.path, type: t.name, why: 'type name collides with an existing module' });
      }
    }
  }
  return { findings, block: findings.length > 0 };
}
