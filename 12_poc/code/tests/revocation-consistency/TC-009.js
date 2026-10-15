// TC-009 コンテンツ更新と relation 更新の原子的結合 (test plan §4.9, frozen commit 151940ac).
// Raw data only; pass/fail by eval-TC-009.js (§2.6).
//   node tests/revocation-consistency/TC-009.js [--configs nocache] [--reps N] [--prefreeze] [--freeze "<reason>"]
// The reference service file-service keeps content and the relationship outbox in one sqlite transaction and
// stores the consistency token with the content. Faults: process stop inside the transaction / after commit /
// after delivery (before the outbox row is marked), delivery delay, delivery pause, duplicate delivery.
// Probes (open loop, q) read the affected file as the users whose access the operation changes.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { startStack } from '../../harness/stack.js';
import { args } from '../../lib/runtime.js';
import { openRun, loadParams, datasetWithProbeUsers, startProber, monoMs, sleep, freeze, hardenReq } from './common.js';

const a = args();
const P = loadParams('TC-009');
const configs = P.engine_configs.filter((c) => !a.configs || String(a.configs).split(',').includes(c.id));
const reps = Number(a.reps || P.repetitions);
const q = P.probe_interval_ms;
const U = (id) => ({ type: 'core/user', id });
const T = (type, id, rel, st, sid) => ({ resource: { type, id }, relation: rel, subject: { type: st, id: sid } });
const NOFAULT = { outboxDelayMs: 0, duplicateDelivery: false, crashAfterCommit: false, crashBeforeCommit: false, crashAfterDeliver: false, pauseOutbox: false };

async function runConfig(cfg) {
  const { run } = openRun('TC-009', { seed: P.seed, prefreeze: !!a.prefreeze, purpose: `TC-009 engine config ${cfg.id}` });
  run.meta.engine_config = cfg;
  run.meta.repetitions = reps;
  run.writeJson('run.json', run.meta);
  const { ds, tenant, users } = datasetWithProbeUsers({ seed: P.seed, profile: P.profile, n: 10, tag: 'tc009' });
  const tid = tenant.id;
  const [C, X, Y, M, Va, Vb, Os, G1, G2, G3] = users;
  const grantees = [G1, G2, G3];
  const files = ds.files.filter((f) => f.tid === tid);
  const tops = ds.folders.filter((f) => f.tid === tid && !f.parent && files.some((x) => x.folder === f.id));
  const [FA, FB, FC] = tops;
  const D = files.find((f) => f.folder === FA.id);
  const Fs = files.find((f) => ![FA.id, FB.id, FC.id].includes(f.folder));
  run.writeJson('resources.json', { tid, users: { C, X, Y, M, Va, Vb, Os, grantees }, folders: { FA: FA.id, FB: FB.id, FC: FC.id }, D: D.id, Fs: Fs.id });
  const flags = cfg.openfga_check_cache_ttl ? ['--check-query-cache-enabled', '--check-query-cache-ttl', cfg.openfga_check_cache_ttl] : [];
  const s = await startStack({ tc: 'TC-009', run, engine: 'openfga', dataset: ds, openfgaFlags: flags, settings: { accessTokenTtlSec: 7200 } });
  const dbFile = path.join(run.dir, 'file-service', 'files.sqlite');
  // read-only queries; a read-write handle is used so that SQLite can recover the WAL after a crash (no writes are issued)
  const dbq = (sql, ...p) => { for (let i = 0; ; i++) { try { const db = new DatabaseSync(dbFile, { timeout: 5000 }); try { return db.prepare(sql).all(...p); } finally { db.close(); } } catch (e) { if (i >= 20) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); } } };
  const writesLen = () => { const f = path.join(run.dir, 'pdp', 'writes.jsonl'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0; };
  let status = 'completed';
  hardenReq(s); // retry harness requests on keep-alive resets (common.js)
  try {
    const pdp = s.topo.urls.pdp;
    const write = async (writes) => { const r = await s.req(`${pdp}/v1/tenants/${tid}/relationships/write`, { body: { writes, on_duplicate: 'ignore' } }); if (r.status !== 200) throw new Error(`write ${r.status} ${r.text}`); return r.json().consistency_token; };
    const del = async (deletes) => { const r = await s.req(`${pdp}/v1/tenants/${tid}/relationships/delete`, { body: { deletes, on_missing: 'ignore' } }); if (r.status !== 200) throw new Error(`delete ${r.status} ${r.text}`); };
    const setFault = (f) => s.req(`${s.topo.urls.file}/admin/fault`, { body: { ...NOFAULT, ...f } });
    const pending = async () => { try { return (await s.req(`${s.topo.urls.file}/admin/counters`, { method: 'GET' })).json()?.outboxPending; } catch { return null; } };
    await write([T('files/folder', FC.id, 'editor', 'core/user', C), T('files/folder', FC.id, 'viewer', 'core/user', X), T('files/folder', FA.id, 'editor', 'core/user', M), T('files/folder', FB.id, 'editor', 'core/user', M), T('files/folder', FA.id, 'viewer', 'core/user', Va), T('files/folder', FB.id, 'viewer', 'core/user', Vb), T('files/file', Fs.id, 'owner', 'core/user', Os)]);
    const sess = {};
    for (const [k, sub] of [['C', C], ['X', X], ['Y', Y], ['M', M], ['Va', Va], ['Vb', Vb], ['Os', Os], ['G1', G1], ['G2', G2], ['G3', G3]]) {
      const l = await s.login({ sub, tid, amr: 'pwd,otp' });
      if (!l.ok) throw new Error(`login ${k}`);
      sess[k] = l;
    }
    const read = (k, fileId) => sess[k].call('GET', `/t/${tid}/files/${fileId}`);
    let iter = 0;
    const startProbes = (targets, tag) => targets.map(([role, k, fileId]) => startProber({
      name: role, intervalMs: q, fn: async () => ({ status: (await read(k, fileId)).status }),
      onResult: (rec) => run.append('requests.jsonl', { iter: tag, role: rec.probe, user: k, file: fileId, k: rec.k, sched_ms: +rec.sched_ms.toFixed(3), sent_ms: +rec.sent_ms.toFixed(3), resp_ms: +rec.resp_ms.toFixed(3), status: rec.status, error: rec.error }),
    }));
    const ensureUp = async () => {
      // the exit event of a crashed process can lag the failed request: wait up to 1.5 s for it, or for a healthy answer
      for (let i = 0; i < 15 && s.procs.running('file-service'); i++) {
        try { const h = await s.req(`${s.topo.urls.file}/healthz`, { method: 'GET', timeoutMs: 300 }); if (h.status === 200 && i >= 2) return null; } catch { /* down */ }
        await sleep(100);
      }
      if (s.procs.running('file-service')) return null;
      const t = monoMs();
      await s.restart('file-service');
      return { crashed_detected_ms: +t.toFixed(3), restarted_ms: +monoMs().toFixed(3) };
    };
    const drain = async (maxMs = 8000) => { const t = monoMs(); while (monoMs() - t < maxMs) { if ((await pending()) === 0) return true; await sleep(100); } return false; };

    for (const fz of P.faults) {
      for (const op of P.operations) {
        for (let r = 0; r < reps; r++) {
          const tag = iter++;
          const rec = { iter: tag, op, fault: fz.id, rep: r };
          await setFault({});
          await drain();
          const preWrites = writesLen();
          const preOutbox = dbq('SELECT MAX(seq) AS m FROM outbox')[0].m || 0;
          let probes = [];
          let target = null;
          let opRes;
          let tSend, tAck;
          if (op === 'create') {
            const before = new Set(dbq('SELECT id FROM files WHERE folder = ?', FC.id).map((x) => x.id));
            await setFault(fz.fault);
            tSend = monoMs();
            try { opRes = await sess.C.call('POST', `/t/${tid}/folders/${FC.id}/files`, { content: `tc009 ${tag}` }); } catch (e) { opRes = { status: 0, error: e.message }; }
            tAck = monoMs();
            rec.restart = await ensureUp();
            const after = dbq('SELECT id FROM files WHERE folder = ?', FC.id).map((x) => x.id).filter((id) => !before.has(id));
            target = after[0] || null;
            rec.created = after;
            if (target) probes = startProbes([['entitled_X', 'X', target], ['creator_C', 'C', target], ['non_entitled_Y', 'Y', target]], tag);
          } else if (op === 'move') {
            const src = dbq('SELECT folder FROM files WHERE id = ?', D.id)[0].folder;
            const dst = src === FA.id ? FB.id : FA.id;
            const vSrc = src === FA.id ? 'Va' : 'Vb', vDst = src === FA.id ? 'Vb' : 'Va';
            Object.assign(rec, { src, dst, v_src: vSrc, v_dst: vDst });
            target = D.id;
            probes = startProbes([['v_src', vSrc, D.id], ['v_dst', vDst, D.id]], tag);
            await sleep(400);
            await setFault(fz.fault);
            tSend = monoMs();
            try { opRes = await sess.M.call('POST', `/t/${tid}/files/${D.id}/move`, { to_folder: dst }); } catch (e) { opRes = { status: 0, error: e.message }; }
            tAck = monoMs();
            rec.restart = await ensureUp();
          } else if (op === 'delete') {
            const cr = await sess.C.call('POST', `/t/${tid}/folders/${FC.id}/files`, { content: `tc009 victim ${tag}` });
            target = cr.body?.id;
            rec.victim_create_status = cr.status;
            await drain();
            if (target) {
              probes = startProbes([['entitled_X', 'X', target], ['owner_C', 'C', target]], tag);
              await sleep(400);
              await setFault(fz.fault);
              tSend = monoMs();
              try { opRes = await sess.C.call('DELETE', `/t/${tid}/files/${target}`); } catch (e) { opRes = { status: 0, error: e.message }; }
              tAck = monoMs();
              await sleep(300); // delete delivers without awaiting: give a crash fault time to fire
              rec.restart = await ensureUp();
            }
          } else if (op === 'share') {
            const g = ['G1', 'G2', 'G3'][r % 3];
            rec.grantee = g;
            target = Fs.id;
            probes = startProbes([['grantee', g, Fs.id]], tag);
            await sleep(400);
            await setFault(fz.fault);
            tSend = monoMs();
            try { opRes = await sess.Os.call('POST', `/t/${tid}/files/${Fs.id}/share`, { grantee_sub: { G1, G2, G3 }[g] }); } catch (e) { opRes = { status: 0, error: e.message }; }
            tAck = monoMs();
            rec.restart = await ensureUp();
          }
          if (fz.resume_after_ms) { await sleep(fz.resume_after_ms); rec.resumed_ms = +monoMs().toFixed(3); }
          if (s.procs.running('file-service')) await setFault({});
          rec.drained = await drain(P.post_op_observe_max_ms);
          await sleep(2500); // observation after the outbox drained (post-state)
          await Promise.all(probes.map((p) => p.stop()));
          // final state
          const outboxRows = dbq('SELECT seq, payload, file_id, delivered, delivered_at, attempts FROM outbox WHERE seq > ?', preOutbox);
          const fin = target ? dbq('SELECT id, folder, ctoken, version FROM files WHERE id = ?', target)[0] || null : null;
          const wf = path.join(run.dir, 'pdp', 'writes.jsonl');
          const newWrites = fs.existsSync(wf) ? fs.readFileSync(wf, 'utf8').split('\n').filter(Boolean).slice(preWrites).map((l) => JSON.parse(l)) : [];
          Object.assign(rec, { t_send_ms: tSend && +tSend.toFixed(3), t_ack_ms: tAck && +tAck.toFixed(3), op_status: opRes?.status, op_error: opRes?.error, target, final: fin, outbox: outboxRows.map((o) => ({ seq: o.seq, delivered: o.delivered, delivered_at: o.delivered_at, attempts: o.attempts, file_id: o.file_id, payload_kind: Object.keys(JSON.parse(o.payload)).join('+') })), facade_writes: newWrites });
          // reset / repair (K-4 emulation): orphaned move source, share revoke
          if (op === 'move' && fin) {
            const tuples = (await s.req(`${pdp}/v1/tenants/${tid}/relationships/read`, { body: { filter: { resource: { type: 'files/file', id: D.id }, relation: 'parent' } } })).json()?.tuples || [];
            rec.parent_tuples_after = tuples.map((t) => t.user);
            const want = `files/folder:${fin.folder}`;
            if (!tuples.some((t) => t.user === want)) { await write([T('files/file', D.id, 'parent', 'files/folder', fin.folder)]); rec.k4_repair = 'parent tuple restored for the content folder (orphan)'; }
            const extra = tuples.filter((t) => t.user !== want);
            if (extra.length) { await del(extra.map((t) => T('files/file', D.id, 'parent', 'files/folder', t.user.split(':')[1]))); rec.k4_repair = (rec.k4_repair || '') + ' stale parent tuple removed'; }
          }
          if (op === 'share') await del([T('files/file', Fs.id, 'viewer', 'core/user', { G1, G2, G3 }[rec.grantee])]);
          run.append('ops.jsonl', rec);
          process.stdout.write(`[${cfg.id}] ${tag} ${op}/${fz.id} status=${rec.op_status} restart=${!!rec.restart} final=${fin ? fin.folder?.slice(0, 8) : 'none'}\n`);
        }
      }
    }
  } catch (e) {
    status = 'aborted:harness_error';
    run.writeJson('error.json', { message: e.message, stack: e.stack });
    console.error(e);
  } finally {
    await s.stop();
  }
  run.finish(status);
  console.log(JSON.stringify({ config: cfg.id, run_dir: run.dir, status }));
  return { cfg: cfg.id, dir: run.dir, status };
}

if (!a.prefreeze && a.freeze) { const m = freeze('TC-009', String(a.freeze)); console.log('frozen manifest', m.ver, m.manifest_sha256); }
const out = [];
for (const c of configs) out.push(await runConfig(c));
console.log(JSON.stringify(out, null, 2));
