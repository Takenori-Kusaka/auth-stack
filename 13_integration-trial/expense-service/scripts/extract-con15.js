// Extract CON-15 (x-state-query-api inside CON-12 AsyncAPI) to a standalone OpenAPI file
// so that a generic mock (Prism) can serve it. The contract itself is NOT modified.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../../11_contracts/lifecycle-events.asyncapi.yaml');
const doc = yaml.load(fs.readFileSync(src, 'utf8'));
const api = doc['x-state-query-api'];
if (!api) throw new Error('x-state-query-api not found in CON-12');
const out = path.resolve(here, '../.mocks/con15-state-query.openapi.yaml');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, yaml.dump(api, { lineWidth: -1 }));
console.log('wrote', out);
