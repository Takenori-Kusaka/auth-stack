// TC-027 一覧・検索の認可（preregistered-test-plan.md §4.27）
//   node tests/engine-swap-perf-audit/TC-027.js
import fs from 'node:fs';
import path from 'node:path';
import { startStack } from '../../harness/stack.js';
import { generate } from '../../data/gen-synthetic.js';
import { syntheticId, seededRng } from '../../lib/ids.js';
import { openRun, groupPortBase, writeEval, sleep } from './common.js';
import { refEvaluate } from './lib/helpers.js';

const TC = 'TC-027';
const { run, params } = openRun(TC, { seed: 27 });
const log = (...a) => { console.log(new Date().toISOString(), ...a); run.append('progress.jsonl', { msg: a.join(' ') }); };
let status = 'completed';
const evalOut = { tc: TC, sizes: {} };
let s = null;
const NONEXISTENT = 'synzzzzzzzzzzzzzzzzzzzzzzz';

async function listAll(u, tid, maxPages = 200) {
  const pages = [];
  let cursor = null;
  for (let i = 0; i < maxPages; i++) {
    const t0 = Date.now();
    const r = await u.call('GET', `/t/${tid}/files?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    pages.push({ status: r.status, n: r.body?.items?.length, completeness: r.body?.completeness, has_next: !!r.body?.next_cursor, ms: Date.now() - t0, items: (r.body?.items || []).map((x) => x.id) });
    if (r.status !== 200 || !r.body.next_cursor) break;
    cursor = r.body.next_cursor;
  }
  return { pages, items: pages.flatMap((p) => p.items), first_cursor: null };
}

async function sizeRun(size, sub) {
  const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile, largeFiles: size });
  if (ds.largeFolder.files !== size) { const e = new Error('dataset size mismatch'); e.abort = 'TC-027 中止基準（合成データの件数）'; throw e; }
  const subRun = { dir: path.join(run.dir, `size-${size}`), runId: `${run.runId}-${size}` };
  fs.mkdirSync(subRun.dir, { recursive: true });
  s = await startStack({ tc: TC, run: subRun, engine: params.engine, dataset: ds, portBase: groupPortBase(TC, sub) });
  const out = { size };
  const L = ds.largeFolder;
  const tid = L.tid;
  const reader = L.reader;
  const u = await s.login({ sub: reader, tid });
  // positive control
  const one = ds.files.find((f) => f.folder === L.id);
  const pc = await u.call('GET', `/t/${tid}/files/${one.id}`);
  if (pc.status !== 200) { const e = new Error(`positive control ${pc.status}`); e.abort = 'C-3'; throw e; }
  // truth
  const tenantFiles = ds.files.filter((f) => f.tid === tid);
  const now = new Date();
  const ref = refEvaluate({ tuples: ds.tuples, queries: tenantFiles.map((f) => ({ user: reader, type: 'files/file', id: f.id, permission: 'read' })), now });
  const truth = new Set(tenantFiles.filter((f, i) => ref[i] === true).map((f) => f.id));
  const truthFolder = new Set(tenantFiles.filter((f, i) => ref[i] === true && f.folder === L.id).map((f) => f.id));
  // (a) search (ListObjects + post-check), all pages
  const t0 = Date.now();
  const sr = await listAll(u, tid);
  out.search = { ms: Date.now() - t0, pages: sr.pages.length, statuses: [...new Set(sr.pages.map((p) => p.status))], returned: sr.items.length, distinct: new Set(sr.items).size, truth: truth.size, not_permitted_returned: sr.items.filter((x) => !truth.has(x)).length, completeness_per_page: sr.pages.map((p) => p.completeness?.status), first_page_completeness: sr.pages[0]?.completeness };
  const truncated = new Set(sr.items).size < truth.size;
  out.search.truncated = truncated;
  out.search.truncation_detected = truncated ? sr.pages.every((p) => p.completeness?.status === 'incomplete') : null;
  out.search.incomplete_displayed = truncated ? sr.pages.length > 0 && sr.pages.every((p) => p.completeness?.status === 'incomplete' && !!p.completeness?.reason) : null;
  out.search.false_incomplete = !truncated && sr.pages.some((p) => p.completeness?.status === 'incomplete');
  run.append('requests.jsonl', { size, kind: 'search', pages: sr.pages.map(({ items, ...p }) => p) });
  // (b) index + post-check (folder.list)
  // v2: the index + post-check listing is paged (?limit=100, CH-ESPA-04) and followed until next_cursor is empty
  const t1 = Date.now();
  const flItems = [];
  const flPages = [];
  let flCur = null, fl = null, flFirstCursor = null;
  for (let i = 0; i < 1000; i++) {
    fl = await u.call('GET', `/t/${tid}/folders/${L.id}/files?limit=100${flCur ? `&cursor=${encodeURIComponent(flCur)}` : ''}`);
    flPages.push({ status: fl.status, n: fl.body?.items?.length });
    if (fl.status !== 200) break;
    flItems.push(...(fl.body.items || []).map((x) => x.id));
    if (!fl.body.next_cursor) break;
    flCur = fl.body.next_cursor;
    if (!flFirstCursor) flFirstCursor = flCur;
  }
  const flSet = new Set(flItems);
  out.index_post_check = { status: [...new Set(flPages.map((p) => p.status))], pages: flPages.length, ms: Date.now() - t1, returned: flItems.length, truth: truthFolder.size, missing: [...truthFolder].filter((x) => !flSet.has(x)).length, not_permitted_returned: flItems.filter((x) => !truthFolder.has(x)).length, completeness: fl?.body?.completeness };
  out.index_post_check.status_ok = out.index_post_check.status.length === 1 && out.index_post_check.status[0] === 200;
  run.append('requests.jsonl', { size, kind: 'folder.list', pages: flPages, returned: flItems.length });
  // (c) cursor negatives
  const first = await u.call('GET', `/t/${tid}/files?limit=100`);
  const cur = first.body?.next_cursor;
  const cursorCases = [];
  if (cur) {
    const other = ds.users.find((x) => x.id !== reader && x.memberships.some((m) => m.tid === tid && m.kind === 'member'));
    const uo = await s.login({ sub: other.id, tid });
    const otherTenant = ds.tenants.find((t) => t.id !== tid);
    const ot = ds.users.find((x) => x.memberships.some((m) => m.tid === otherTenant.id && m.kind === 'member') && !x.memberships.some((m) => m.tid === tid));
    const ut = await s.login({ sub: ot.id, tid: otherTenant.id });
    const [body, mac] = [cur.slice(0, cur.lastIndexOf('.')), cur.slice(cur.lastIndexOf('.') + 1)];
    const flip = (str, i) => str.slice(0, i) + (str[i] === 'A' ? 'B' : 'A') + str.slice(i + 1);
    const tries = [
      ['other_subject_same_tenant', uo, tid, cur, 100],
      ['other_tenant_subject', ut, otherTenant.id, cur, 100],
      ['tampered_body', u, tid, `${flip(body, 5)}.${mac}`, 100],
      ['tampered_mac', u, tid, `${body}.${flip(mac, 3)}`, 100],
      ['changed_limit', u, tid, cur, 50],
    ];
    for (const [name, uu, t, c, lim] of tries) {
      const r = await uu.call('GET', `/t/${t}/files?limit=${lim}&cursor=${encodeURIComponent(c)}`);
      cursorCases.push({ name, status: r.status, accepted: r.status === 200 && Array.isArray(r.body?.items) });
    }
    // v2: the same negatives on the index + post-check listing cursor (folder.list)
    if (flFirstCursor) {
      const [fb, fm] = [flFirstCursor.slice(0, flFirstCursor.lastIndexOf('.')), flFirstCursor.slice(flFirstCursor.lastIndexOf('.') + 1)];
      const ftries = [
        ['folder_other_subject_same_tenant', uo, tid, flFirstCursor, 100],
        ['folder_other_tenant_subject', ut, otherTenant.id, flFirstCursor, 100],
        ['folder_tampered_body', u, tid, `${flip(fb, 5)}.${fm}`, 100],
        ['folder_tampered_mac', u, tid, `${fb}.${flip(fm, 3)}`, 100],
        ['folder_changed_limit', u, tid, flFirstCursor, 50],
      ];
      for (const [name, uu, t, c, lim] of ftries) {
        const r = await uu.call('GET', `/t/${t}/folders/${L.id}/files?limit=${lim}&cursor=${encodeURIComponent(c)}`);
        cursorCases.push({ name, status: r.status, accepted: r.status === 200 && Array.isArray(r.body?.items) });
      }
    }
    // expired: wait past the 60 s page-token lifetime
    await sleep(62_000);
    const r = await u.call('GET', `/t/${tid}/files?limit=100&cursor=${encodeURIComponent(cur)}`);
    cursorCases.push({ name: 'expired', status: r.status, accepted: r.status === 200 && Array.isArray(r.body?.items) });
    if (flFirstCursor) { const r2 = await u.call('GET', `/t/${tid}/folders/${L.id}/files?limit=100&cursor=${encodeURIComponent(flFirstCursor)}`); cursorCases.push({ name: 'folder_expired', status: r2.status, accepted: r2.status === 200 && Array.isArray(r2.body?.items) }); }
  }
  out.cursor = { had_cursor: !!cur, cases: cursorCases, accepted: cursorCases.filter((c) => c.accepted).length };
  for (const c of cursorCases) run.append('requests.jsonl', { size, kind: 'cursor', ...c });
  await s.stop(); s = null;
  return out;
}

async function sideChannelAndRevocation() {
  const ds = generate({ seed: params.dataset.seed, profile: params.dataset.profile });
  const subRun = { dir: path.join(run.dir, 'two-state'), runId: `${run.runId}-2s` };
  fs.mkdirSync(subRun.dir, { recursive: true });
  s = await startStack({ tc: TC, run: subRun, engine: params.engine, dataset: ds, portBase: groupPortBase(TC) });
  const out = {};
  const T1 = ds.tenants[1], T2 = ds.tenants[0];
  const mem = (tid) => ds.users.filter((u) => u.memberships.length === 1 && u.memberships[0].tid === tid);
  const folderA = ds.folders.find((f) => f.tid === T1.id);
  // B: a member of T1 who cannot read folderA (so a new file in folderA is hidden from B), per the reference evaluator
  const cands = mem(T1.id).filter((u) => u.id !== folderA.owner);
  const rf = refEvaluate({ tuples: ds.tuples, queries: cands.map((u) => ({ user: u.id, type: 'files/folder', id: folderA.id, permission: 'read' })), now: new Date() });
  const B = cands.find((u, i) => rf[i] === false);
  if (!B) throw new Error('no member without read on folderA');
  const uA = await s.login({ sub: folderA.owner, tid: T1.id });
  const uB = await s.login({ sub: B.id, tid: T1.id });
  const strip = (r) => JSON.stringify({ status: r.status, items: (r.body?.items || []).map((x) => x.id), completeness: r.body?.completeness, has_next: !!r.body?.next_cursor, count: (r.body?.items || []).length });
  const snapB = async () => { const pages = await listAll(uB, T1.id); return { pages: pages.pages.map((p) => ({ status: p.status, items: p.items, completeness: p.completeness, has_next: p.has_next, n: p.n })), ms: pages.pages.reduce((a, p) => a + p.ms, 0) }; };
  // intra-tenant: state 1 without H, state 2 with H readable only by its owner (A)
  const s1 = await snapB();
  const cr = await uA.call('POST', `/t/${T1.id}/folders/${folderA.id}/files`, { content: 'hidden' });
  await sleep(500);
  const H = cr.body?.id;
  // H inherits the folder's viewers; B must not be among them (checked by the reference evaluator below)
  const s2 = await snapB();
  const refH = refEvaluate({ tuples: [...ds.tuples, { resource: { type: 'files/file', id: H }, relation: 'parent', subject: { type: 'files/folder', id: folderA.id } }, { resource: { type: 'files/file', id: H }, relation: 'owner', subject: { type: 'core/user', id: folderA.owner } }], queries: [{ user: B.id, type: 'files/file', id: H, permission: 'read' }], now: new Date() });
  const t0 = Date.now(); const eH = await uB.call('GET', `/t/${T1.id}/files/${H}`); const tH = Date.now() - t0;
  const t1 = Date.now(); const eN = await uB.call('GET', `/t/${T1.id}/files/${NONEXISTENT}`); const tN = Date.now() - t1;
  out.intra_tenant = { hidden_created: cr.status, B_can_read_H_per_ref: refH[0], list_diff: JSON.stringify(s1.pages.map(({ ms, ...p }) => p)) !== JSON.stringify(s2.pages.map(({ ms, ...p }) => p)), count_before: s1.pages.reduce((a, p) => a + (p.n || 0), 0), count_after: s2.pages.reduce((a, p) => a + (p.n || 0), 0), error_diff: strip(eH) !== strip(eN) || JSON.stringify(eH.body) !== JSON.stringify(eN.body), timing_ms: { list_before: s1.ms, list_after: s2.ms, read_hidden: tH, read_nonexistent: tN } };
  // inter-tenant: hidden file in T2
  const s3 = await snapB();
  const oT2 = ds.folders.find((f) => f.tid === T2.id);
  const uO = await s.login({ sub: oT2.owner, tid: T2.id });
  const cr2 = await uO.call('POST', `/t/${T2.id}/folders/${oT2.id}/files`, { content: 'hidden-other-tenant' });
  await sleep(500);
  const H2 = cr2.body?.id;
  const s4 = await snapB();
  const eH2 = await uB.call('GET', `/t/${T1.id}/files/${H2}`);
  const eN2 = await uB.call('GET', `/t/${T1.id}/files/${NONEXISTENT}`);
  out.inter_tenant = { hidden_created: cr2.status, list_diff: JSON.stringify(s3.pages.map(({ ms, ...p }) => p)) !== JSON.stringify(s4.pages.map(({ ms, ...p }) => p)), error_diff: JSON.stringify([eH2.status, eH2.body]) !== JSON.stringify([eN2.status, eN2.body]) };
  out.facets_autocomplete = 'PoC に API なし（対象外: DEV-27a）';
  // revocation trials
  const trials = [];
  const fo = folderA;
  for (let i = 0; i < params.revocation.trials; i++) {
    const c = await uA.call('POST', `/t/${T1.id}/folders/${fo.id}/files`, { content: `rev ${i}` });
    const X = c.body?.id;
    await sleep(300);
    const g = await s.writeTuples(T1.id, { writes: [{ resource: { type: 'files/file', id: X }, relation: 'viewer', subject: { type: 'core/user', id: B.id } }], on_duplicate: 'ignore' });
    const before = await listAll(uB, T1.id);
    const seenBefore = before.items.includes(X);
    const d = await s.deleteTuples(T1.id, [{ resource: { type: 'files/file', id: X }, relation: 'viewer', subject: { type: 'core/user', id: B.id } }]);
    const tDel = Date.now();
    const after = await listAll(uB, T1.id);
    const rd = await uB.call('GET', `/t/${T1.id}/files/${X}`);
    trials.push({ i, created: c.status, grant: g.status, revoke: d.status, seen_before: seenBefore, returned_after_revoke: after.items.includes(X), read_after_revoke: rd.status, ms_after_revoke: Date.now() - tDel });
    run.append('requests.jsonl', { kind: 'revocation', ...trials[trials.length - 1] });
  }
  out.revocation = { trials: trials.length, valid_trials: trials.filter((t) => t.seen_before && t.revoke === 200).length, returned_after_revoke: trials.filter((t) => t.returned_after_revoke || t.read_after_revoke === 200).length, rows: trials };
  await s.stop(); s = null;
  return out;
}

try {
  for (const [k, size] of params.sizes.entries()) { log(`size ${size}`); evalOut.sizes[size] = await sizeRun(size, k); log(JSON.stringify({ ...evalOut.sizes[size], cursor: evalOut.sizes[size].cursor.accepted })); }
  log('two-state + revocation');
  evalOut.two_state = await sideChannelAndRevocation();
  const S = Object.values(evalOut.sizes);
  const trunc = S.filter((x) => x.search.truncated);
  const crit = {
    truncation_detection_rate: { value: trunc.length ? trunc.filter((x) => x.search.truncation_detected).length / trunc.length : null, truncated_cases: trunc.length, pass: trunc.every((x) => x.search.truncation_detected) },
    incomplete_display_rate: { value: trunc.length ? trunc.filter((x) => x.search.incomplete_displayed).length / trunc.length : null, pass: trunc.every((x) => x.search.incomplete_displayed) },
    index_post_check_missing: { value: S.reduce((a, x) => a + x.index_post_check.missing, 0), pass: S.every((x) => x.index_post_check.missing === 0 && x.index_post_check.status_ok) },
    cursor_acceptance: { value: S.reduce((a, x) => a + x.cursor.accepted, 0), pass: S.every((x) => x.cursor.had_cursor && x.cursor.accepted === 0) },
    two_state_diffs: { value: [evalOut.two_state.intra_tenant.list_diff, evalOut.two_state.intra_tenant.error_diff, evalOut.two_state.inter_tenant.list_diff, evalOut.two_state.inter_tenant.error_diff].filter(Boolean).length, pass: ![evalOut.two_state.intra_tenant.list_diff, evalOut.two_state.intra_tenant.error_diff, evalOut.two_state.inter_tenant.list_diff, evalOut.two_state.inter_tenant.error_diff].some(Boolean) && evalOut.two_state.intra_tenant.B_can_read_H_per_ref === false },
    returned_after_revocation_beyond_bound: { value: evalOut.two_state.revocation.returned_after_revoke, valid_trials: evalOut.two_state.revocation.valid_trials, pass: evalOut.two_state.revocation.returned_after_revoke === 0 && evalOut.two_state.revocation.valid_trials === params.revocation.trials },
    not_permitted_items_returned: { value: S.reduce((a, x) => a + x.search.not_permitted_returned + x.index_post_check.not_permitted_returned, 0), pass: S.every((x) => x.search.not_permitted_returned === 0 && x.index_post_check.not_permitted_returned === 0), note: '基準外の補助指標（参照評価器で許可されない項目の返却）' },
  };
  evalOut.criteria = crit;
  evalOut.verdict = Object.values(crit).every((c) => c.pass) ? '合格' : '不合格';
  log(`verdict ${evalOut.verdict}`, JSON.stringify(Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.value]))));
} catch (e) {
  status = e.abort ? `aborted:${e.abort}` : 'aborted:harness_error';
  evalOut.abort = { code: e.abort || 'harness_error', reason: e.message, stack: e.stack };
  evalOut.verdict = '中止';
  console.error(e.stack);
} finally {
  if (s) await s.stop();
  writeEval(run, evalOut, ['requests.jsonl']);
  const meta = run.finish(status, { verdict: evalOut.verdict });
  console.log(JSON.stringify({ run_dir: run.dir, status: meta.status, verdict: evalOut.verdict }));
}
