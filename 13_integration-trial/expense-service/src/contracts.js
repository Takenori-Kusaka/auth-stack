// Loads the pinned contract files from 11_contracts and exposes JSON Schema 2020-12 validators.
// CON-00 §2.5 step 5: "JSON Schema の検証器は 2020-12 方言で使い、Ajv なら strict: false にする（I-5）".
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CONTRACT_DIR = path.resolve(here, '../../../11_contracts');
const load = (f) => (f.endsWith('.json') ? JSON.parse(fs.readFileSync(path.join(CONTRACT_DIR, f), 'utf8')) : yaml.load(fs.readFileSync(path.join(CONTRACT_DIR, f), 'utf8')));

export const FILES = {
  'CON-03': 'authorization-api.openapi.yaml',
  'CON-04': 'relationship-model-registry.openapi.yaml',
  'CON-05': 'token-exchange.openapi.yaml',
  'CON-06': 'schemas/access-token-claims.schema.json',
  'CON-08': 'schemas/audit-event.schema.json',
  'CON-12': 'lifecycle-events.asyncapi.yaml',
  'CON-13': 'schemas/lifecycle-event.schema.json',
  'CON-02': 'schemas/common.schema.json',
};

export function sha256(f) { return crypto.createHash('sha256').update(fs.readFileSync(path.join(CONTRACT_DIR, f))).digest('hex'); }

export function loadContracts() {
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
  addFormats(ajv);
  const docs = {};
  for (const [id, f] of Object.entries(FILES)) docs[id] = load(f);
  docs['CON-15'] = docs['CON-12']['x-state-query-api'];
  // JSON Schemas register under their own $id; OpenAPI docs under a synthetic id.
  ajv.addSchema(docs['CON-02']);
  for (const id of ['CON-06', 'CON-08', 'CON-13']) ajv.addSchema(docs[id]);
  for (const id of ['CON-03', 'CON-04', 'CON-05', 'CON-15']) ajv.addSchema(docs[id], `urn:trial:${id}`);
  const v = (ref) => {
    const fn = ajv.getSchema(ref);
    if (!fn) throw new Error(`schema not found: ${ref}`);
    return (x) => ({ ok: fn(x), errors: fn.errors });
  };
  return {
    docs, ajv,
    oas: (id, name) => v(`urn:trial:${id}#/components/schemas/${name}`),
    con13: v(docs['CON-13'].$id),
    con13def: (name) => v(`${docs['CON-13'].$id}#/$defs/${name}`),
    con08: v(docs['CON-08'].$id),
    con06def: (name) => v(`${docs['CON-06'].$id}#/$defs/${name}`),
  };
}
