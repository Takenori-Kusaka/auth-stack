// Start Prism 5.12.0 mocks from 11_contracts (CON-00 §2.3 / INT-00 §6.3 "今（キット配布前）").
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const c = (f) => path.resolve(root, '../../11_contracts', f);
export const MOCKS = [
  { name: 'CON-03 authorization-api', port: 4010, file: c('authorization-api.openapi.yaml') },
  { name: 'CON-05 token-exchange', port: 4011, file: c('token-exchange.openapi.yaml') },
  { name: 'CON-15 state-query (extracted)', port: 4012, file: path.resolve(root, '.mocks/con15-state-query.openapi.yaml') },
  { name: 'CON-04 relationship-model-registry', port: 4013, file: c('relationship-model-registry.openapi.yaml') },
];
const prism = path.resolve(root, 'node_modules/@stoplight/prism-cli/dist/index.js');
fs.mkdirSync(path.resolve(root, '.mocks'), { recursive: true });
for (const m of MOCKS) {
  const log = fs.openSync(path.resolve(root, `.mocks/prism-${m.port}.log`), 'w');
  const p = spawn(process.execPath, [prism, 'mock', '-h', '127.0.0.1', '-p', String(m.port), m.file], { stdio: ['ignore', log, log] });
  console.log(`started ${m.name} on :${m.port} pid=${p.pid}`);
}
