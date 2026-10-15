// Generate engine artifacts from the CAM and check them with the engines' own tooling where available.
//   node model/generate.js [--cam model/cam.json] [--out model/out]
// Outputs: openfga-model.json, openfga-model.fga (DSL via @openfga/syntax-transformer), cedar-policies.cedar,
// cedar-schema.json, manifest.json (revision + SHA-256 of each artifact).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import transformer from '@openfga/syntax-transformer';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import { loadCam, toOpenFga, toCedar } from './cam.js';
import { sha256hex } from '../lib/canon.js';
import { args } from '../lib/runtime.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function generate(camFile, outDir) {
  const cam = loadCam(camFile);
  fs.mkdirSync(outDir, { recursive: true });
  const fga = toOpenFga(cam);
  const fgaJson = JSON.stringify(fga, null, 2);
  let dsl;
  try { dsl = transformer.transformer.transformJSONStringToDSL(JSON.stringify(fga)); } catch (e) { dsl = `# DSL rendering failed: ${e.message}\n`; }
  const { policies, schema } = toCedar(cam);
  const files = {
    'openfga-model.json': fgaJson,
    'openfga-model.fga': dsl,
    'cedar-policies.cedar': policies,
    'cedar-schema.json': JSON.stringify(schema, null, 2),
  };
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(outDir, f), c);
  // Cedar: parse + validate policies against the generated schema
  const v = cedar.validate({ schema, policies: { staticPolicies: policies }, validationSettings: { mode: 'strict' } });
  const cedarValidation = v.type === 'success'
    ? { ok: v.validationErrors.length === 0, errors: v.validationErrors.map((e) => e.error?.message || JSON.stringify(e)), warnings: v.validationWarnings.length }
    : { ok: false, errors: v.errors.map((e) => e.message) };
  const manifest = {
    cam_revision: cam.revision,
    guardrail_catalog_version: cam.guardrailVersion,
    cam_sha256: sha256hex(fs.readFileSync(camFile)),
    artifacts: Object.fromEntries(Object.entries(files).map(([f, c]) => [f, sha256hex(c)])),
    cedar_validation: cedarValidation,
    cedar_version: cedar.getCedarVersion(),
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { cam, fga, cedar: { policies, schema }, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args();
  const r = generate(a.cam || path.join(here, 'cam.json'), a.out || path.join(here, 'out'));
  console.log(JSON.stringify({ revision: r.manifest.cam_revision, cedar_validation: r.manifest.cedar_validation, cedar_version: r.manifest.cedar_version }, null, 2));
}
