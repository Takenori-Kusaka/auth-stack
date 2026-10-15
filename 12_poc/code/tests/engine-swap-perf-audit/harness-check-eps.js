// Pre-freeze harness check (§2.5): exercise every entry point once to find platform defects before freezing.
// No pass/fail metrics are computed. node tests/engine-swap-perf-audit/harness-check-eps.js [--engine cedar]
import { Run } from '../../harness/run.js';
import { startStack } from '../../harness/stack.js';
import { args } from '../../lib/runtime.js';
import { GROUP, groupPortBase } from './common.js';

const a = args();
const engine = a.engine || 'openfga';
const run = new Run({ tc: `${GROUP}/harness-check`, purpose: `harness-check-eps-${engine}`, seed: 1 });
let s;
const out = [];
try {
  s = await startStack({ tc: 'TC-013', run, engine, profile: 'small', seed: 13, portBase: groupPortBase('TC-013'), faultAdmin: true });
  const ds = s.dataset;
  const tA = ds.tenants[0];
  const file = ds.files.find((f) => f.tid === tA.id);
  const u = await s.login({ sub: file.owner, tid: tA.id });
  const rec = async (name, p) => { const r = await p; out.push({ name, status: r.status, body: JSON.stringify(r.body).slice(0, 160) }); return r; };
  await rec('file.read', u.call('GET', `/t/${tA.id}/files/${file.id}`));
  await rec('file.read labels', u.call('GET', `/t/${tA.id}/files/${file.id}?labels=1`));
  await rec('label.read', u.call('GET', `/t/${tA.id}/labels/${file.id}`));
  await rec('file.write', u.call('PUT', `/t/${tA.id}/files/${file.id}`, { content: 'x' }));
  const su = await rec('file.signed_url', u.call('POST', `/t/${tA.id}/files/${file.id}/url`, {}));
  if (su.body?.url) await rec('file.download', u.call('GET', su.body.url));
  await rec('folder.list', u.call('GET', `/t/${tA.id}/folders/${file.folder}/files`));
  await rec('file.search', u.call('GET', `/t/${tA.id}/files?limit=10`));
  const cr = await rec('file.create', u.call('POST', `/t/${tA.id}/folders/${file.folder}/files`, { content: 'new' }));
  const other = ds.users.find((x) => x.id !== file.owner && x.memberships.some((m) => m.tid === tA.id && m.kind === 'member'));
  if (cr.body?.id) {
    await rec('file.share', u.call('POST', `/t/${tA.id}/files/${cr.body.id}/share`, { grantee_sub: other.id }));
    const u2 = await s.login({ sub: other.id, tid: tA.id });
    await rec('shared read', u2.call('GET', `/t/${tA.id}/files/${cr.body.id}`));
    const f2 = ds.folders.find((f) => f.tid === tA.id && f.owner === file.owner && f.id !== file.folder) || ds.folders.find((f) => f.tid === tA.id && f.id !== file.folder);
    await rec('file.move', u.call('POST', `/t/${tA.id}/files/${cr.body.id}/move`, { to_folder: f2.id }));
    await rec('file.delete', u.call('DELETE', `/t/${tA.id}/files/${cr.body.id}`));
    await rec('read after delete', u.call('GET', `/t/${tA.id}/files/${cr.body.id}`));
  }
  const tool = ds.tools.find((t) => t.tid === tA.id);
  const proj = ds.projects.find((p) => p.id === tool.project);
  const uo = await s.login({ sub: proj.owner, tid: tA.id });
  await rec('tool.view', uo.call('GET', `/t/${tA.id}/tools/${tool.id}`));
  await s.writeTuples(tA.id, { writes: [{ resource: { type: 'files/file', id: file.id }, relation: 'viewer', subject: { type: 'core/user', id: proj.owner } }], on_duplicate: 'ignore' });
  await rec('tool.run', uo.call('POST', `/t/${tA.id}/tools/${tool.id}/run`, { file_id: file.id, with_labels: true }));
  await rec('tool.config L2', uo.call('PUT', `/t/${tA.id}/tools/${tool.id}/config`, { config: { a: 1 } }));
  const uof = await s.login({ sub: proj.owner, tid: tA.id, amr: 'fido' });
  await rec('tool.config L2-PR', uof.call('PUT', `/t/${tA.id}/tools/${tool.id}/config`, { config: { a: 1 } }));
} catch (e) { console.error(e.stack); }
finally { if (s) await s.stop(); run.finish('completed', { engine }); }
console.table(out);
