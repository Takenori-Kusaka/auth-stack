// kit/README §5.4 (v1.2 L-1): pin contracts by commit + SHA-256 per file (working tree is uncommitted v1.2, so SHA-256 is the pin).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const used = [
  ['CON-16', '11_contracts/integration-essentials.md', '§1〜§5'],
  ['CON-11-KIT', '11_contracts/kit/README.md', 'echo proxy R1〜R10、§3〜§6'],
  ['CON-11-KIT', '11_contracts/kit/echo-proxy.js', 'R1〜R10'],
  ['CON-03', '11_contracts/authorization-api.openapi.yaml', 'evaluation, evaluations, authzen-configuration'],
  ['CON-04', '11_contracts/relationship-model-registry.openapi.yaml', 'writeRelationships'],
  ['CON-05', '11_contracts/token-exchange.openapi.yaml', 'requestTxnToken, getTxnTokenJwks, registerAcceptanceRecord'],
  ['CON-17', '11_contracts/external-grant.openapi.yaml', 'createExternalGrant, revokeExternalGrantsByAnchor'],
  ['CON-18', '11_contracts/agent-delegation.openapi.yaml', 'AD-01〜AD-12, §5, AgentToolDeclaration'],
  ['CON-06', '11_contracts/schemas/access-token-claims.schema.json', 'internalAccessTokenClaims, txnTokenClaims'],
  ['CON-08', '11_contracts/schemas/audit-event.schema.json', 'E2 enforcement'],
  ['CON-02', '11_contracts/schemas/common.schema.json', 'x-subject-type-map, OperationTierClass'],
  ['CON-11', '11_contracts/mock-contract-test-kit.md', '§11.4, §11.6'],
];
const vectors = fs.readdirSync(path.join(root, '11_contracts/kit/negative-vectors')).filter((f) => f.endsWith('.json')).map((f) => ['CON-11-KIT', `11_contracts/kit/negative-vectors/${f}`, 'vector']);
let head = 'unknown'; try { head = execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); } catch {}
let dirty = []; try { dirty = execSync('git status --porcelain -- 11_contracts 10_integration', { cwd: root }).toString().trim().split('\n').filter(Boolean); } catch {}
const files = [...used, ...vectors].map(([doc, p, ops]) => ({ doc, path: p, ops, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex'), uncommitted: dirty.some((d) => d.endsWith(p)) }));
fs.writeFileSync(path.join(root, '13_integration-trial/support-ticket/CONTRACTS.lock.json'), JSON.stringify({ pinned_at: new Date().toISOString(), git_head: head, note: 'v1.2 working tree (uncommitted files are pinned by SHA-256 only)', files }, null, 2) + '\n');
console.log(files.length, 'files pinned; uncommitted:', files.filter((f) => f.uncommitted).length);
