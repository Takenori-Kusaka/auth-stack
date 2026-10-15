// Helpers shared by this group's TCs: OpenAPI schema validation of AuthZEN responses, Python reference evaluator,
// consumer-code snapshots for "コード差分 0" (git diff --no-index), and small utilities.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import YAML from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { CODE_DIR } from '../../../lib/topology.js';
import { CONTRACTS_DIR } from '../../../lib/jwt.js';

// ---- OpenAPI component schema validation (authorization-api.openapi.yaml, OpenAPI 3.1 = JSON Schema 2020-12) ----
let oas = null;
export function oasValidator(file = 'authorization-api.openapi.yaml') {
  if (oas && oas.file === file) return oas;
  const doc = YAML.parse(fs.readFileSync(path.join(CONTRACTS_DIR, file), 'utf8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
  addFormats(ajv);
  ajv.addKeyword({ keyword: 'x-maturity' }); ajv.addKeyword({ keyword: 'x-authzen-extension' }); ajv.addKeyword({ keyword: 'x-constraint' });
  ajv.addKeyword({ keyword: 'example' }); ajv.addKeyword({ keyword: 'x-negative-examples' });
  const id = 'https://poc.test/oas/' + file;
  ajv.addSchema({ $id: id, components: doc.components });
  const cache = new Map();
  oas = {
    file, doc,
    validate(name, value) {
      if (!cache.has(name)) cache.set(name, ajv.getSchema(`${id}#/components/schemas/${name}`));
      const v = cache.get(name);
      if (!v) return [`no schema ${name}`];
      return v(value) ? null : v.errors.map((e) => `${e.instancePath} ${e.message}`);
    },
  };
  return oas;
}

// ---- Python reference evaluator (ref/ref_eval.py) ----
export function refEvaluate({ camFile = path.join(CODE_DIR, 'model', 'cam.json'), tuples, queries, now = new Date() }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'espa-ref-'));
  const tf = path.join(tmp, 'tuples.json');
  const qf = path.join(tmp, 'q.jsonl');
  fs.writeFileSync(tf, JSON.stringify(tuples.map(({ tid, ...t }) => t)));
  fs.writeFileSync(qf, queries.map((q) => JSON.stringify(q)).join('\n') + '\n');
  const out = execFileSync('python', ['-I', path.join(CODE_DIR, 'ref', 'ref_eval.py'), '--cam', camFile, '--tuples', tf, '--queries', qf, '--now', new Date(now).toISOString()], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  fs.rmSync(tmp, { recursive: true, force: true });
  return out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).allowed);
}

// ---- consumer code snapshot / diff ----
export const CONSUMER_PATHS = ['services', 'pep', 'config/ledger.json'];
export function snapshotConsumer(destDir, paths = CONSUMER_PATHS) {
  for (const p of paths) {
    const src = path.join(CODE_DIR, p);
    const dst = path.join(destDir, p);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.cpSync(src, dst, { recursive: true });
  }
}
/** git diff --no-index --numstat between the snapshot and the live tree. Returns { files, added, deleted, raw }. */
export function diffConsumer(snapDir, paths = CONSUMER_PATHS) {
  let files = 0, added = 0, deleted = 0;
  const raw = [];
  for (const p of paths) {
    const r = spawnSync('git', ['diff', '--no-index', '--numstat', '--', path.join(snapDir, p), path.join(CODE_DIR, p)], { encoding: 'utf8' });
    if (r.status === 0) continue; // identical
    if (r.status !== 1) throw new Error(`git diff failed: ${r.stderr}`);
    for (const line of r.stdout.trim().split('\n').filter(Boolean)) {
      const [a, d] = line.split('\t');
      files++; added += Number(a) || 0; deleted += Number(d) || 0; raw.push(line);
    }
  }
  return { files, added, deleted, lines: added + deleted, raw };
}

export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function countBy(arr, f) { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] || 0) + 1; } return m; }
