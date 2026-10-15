// Freeze (F-3/F-4) the package of one TC: node tests/engine-swap-perf-audit/freeze.js TC-013 "reason"
import { freeze } from './common.js';
const m = freeze(process.argv[2], process.argv[3] || 'initial freeze');
console.log(JSON.stringify({ tc: m.tc, version: m.version, manifest_sha256: m.manifest_sha256, frozen_at: m.frozen_at, files: m.files.length }));
