// Audit verification and request reconstruction (claims-catalog §2.5 VP-3..VP-6, ADR-014 D14-19).
//   node audit/verify.js --run <run-dir> [--out <file>]
// Checks
//   C1  producer chain: per producer_id, producer_seq contiguous from 1 and prev_fp == fingerprint(previous record)
//   C2  producer issue log vs journal: every produced (seq, fp) is present in the journal (detects deletion / truncation)
//   C3  independent copy equals the journal (line by line)
//   C4  schema-invalid records quarantined by the journal (count must be 0)
// Reconstruction
//   R1  E1 (decision) <-> E2 (enforcement) bidirectional match by decision_id and request_id (VP-6)
//   R2  token lineage: each jti_ref used in E1/E2 is issued by the STS and traced back through input_token to the
//       first (edge) exchange (VP-4)
//   R3  write-and-above: events grouped by txn, the TTS issuance record (VP-5) and root_jti lineage
//   R4  read-sensitive: (jti_ref, decision_id, request_id) triples
// The trace_id is reported as an index only and never used to decide a check (VP-8).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from '../lib/canon.js';
import { args } from '../lib/runtime.js';

const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

export function verifyRun(runDir) {
  const journal = readJsonl(path.join(runDir, 'audit', 'journal.jsonl'));
  const copyRaw = fs.existsSync(path.join(runDir, 'audit-copy', 'journal.jsonl')) ? fs.readFileSync(path.join(runDir, 'audit-copy', 'journal.jsonl'), 'utf8') : null;
  const jRaw = fs.existsSync(path.join(runDir, 'audit', 'journal.jsonl')) ? fs.readFileSync(path.join(runDir, 'audit', 'journal.jsonl'), 'utf8') : '';
  const invalid = readJsonl(path.join(runDir, 'audit', 'journal-invalid.jsonl'));
  const findings = [];
  // ---- C1 ----
  const byProducer = new Map();
  for (const r of journal) {
    const p = r.integrity.producer_id;
    if (!byProducer.has(p)) byProducer.set(p, []);
    byProducer.get(p).push(r);
  }
  const chains = {};
  for (const [p, recs] of byProducer) {
    recs.sort((a, b) => a.integrity.producer_seq - b.integrity.producer_seq);
    let ok = true, gaps = 0, breaks = 0, dups = 0;
    for (let i = 0; i < recs.length; i++) {
      const seq = recs[i].integrity.producer_seq;
      const expectSeq = i === 0 ? 1 : recs[i - 1].integrity.producer_seq + 1;
      if (i > 0 && seq === recs[i - 1].integrity.producer_seq) { dups++; ok = false; findings.push({ check: 'C1', producer: p, seq, issue: 'duplicate_seq' }); continue; }
      if (seq !== expectSeq) { gaps++; ok = false; findings.push({ check: 'C1', producer: p, seq, expected: expectSeq, issue: 'seq_gap' }); }
      const expectFp = i === 0 ? null : fingerprint(recs[i - 1]);
      if (i === 0 && seq === 1 && recs[i].integrity.prev_fp !== null) { breaks++; ok = false; findings.push({ check: 'C1', producer: p, seq, issue: 'first_prev_fp_not_null' }); }
      if (i > 0 && seq === expectSeq && recs[i].integrity.prev_fp !== expectFp) { breaks++; ok = false; findings.push({ check: 'C1', producer: p, seq, issue: 'prev_fp_mismatch' }); }
    }
    chains[p] = { records: recs.length, last_seq: recs.length ? recs[recs.length - 1].integrity.producer_seq : 0, ok, gaps, breaks, dups };
  }
  // ---- C2 ---- producer issue logs
  const prodDir = path.join(runDir, 'audit-producers');
  const c2 = {};
  if (fs.existsSync(prodDir)) {
    const jSet = new Map(journal.map((r) => [`${r.integrity.producer_id}|${r.integrity.producer_seq}`, r]));
    for (const f of fs.readdirSync(prodDir).filter((x) => x.endsWith('.produced.jsonl'))) {
      const issued = readJsonl(path.join(prodDir, f));
      const workload = f.replace('.produced.jsonl', '');
      const pid = journal.find((r) => r.integrity.producer_id.endsWith(`/w/${workload}`))?.integrity.producer_id || `*/w/${workload}`;
      const spool = readJsonl(path.join(prodDir, `${workload}.spool.jsonl`)).map((r) => r.integrity.producer_seq);
      let missing = 0, mismatch = 0, spooled = 0;
      for (const it of issued) {
        const rec = jSet.get(`${pid}|${it.seq}`);
        if (!rec) { if (spool.includes(it.seq)) spooled++; else { missing++; findings.push({ check: 'C2', producer: pid, seq: it.seq, issue: 'missing_in_journal' }); } continue; }
        if (fingerprint(rec) !== it.fp) { mismatch++; findings.push({ check: 'C2', producer: pid, seq: it.seq, issue: 'content_changed' }); }
      }
      c2[workload] = { issued: issued.length, missing, mismatch, still_spooled: spooled };
    }
  }
  // ---- C3 / C4 ----
  const c3 = copyRaw === null ? { ok: false, reason: 'no_copy' } : { ok: copyRaw === jRaw };
  if (!c3.ok) findings.push({ check: 'C3', issue: c3.reason || 'copy_differs' });
  if (invalid.length) findings.push({ check: 'C4', issue: 'schema_invalid_records', count: invalid.length });
  // ---- reconstruction ----
  const E1 = journal.filter((r) => r.family === 'decision');
  const E2 = journal.filter((r) => r.family === 'enforcement');
  const ISS = journal.filter((r) => r.family === 'issuance');
  const e1ById = new Map(E1.map((r) => [r.corr.decision_id, r]));
  const e2ById = new Map(E2.map((r) => [r.corr.decision_id, r]));
  const r1 = { decisions: E1.length, enforcements: E2.length, e2_without_e1: [], e1_without_e2: [], request_id_mismatch: [] };
  for (const r of E2) {
    const d = e1ById.get(r.corr.decision_id);
    if (!d) r1.e2_without_e1.push(r.corr.decision_id);
    else if (d.corr.request_id !== r.corr.request_id) r1.request_id_mismatch.push(r.corr.decision_id);
  }
  for (const r of E1) if (!e2ById.has(r.corr.decision_id) && r.event_type === 'authz.evaluation') r1.e1_without_e2.push(r.corr.decision_id);
  if (r1.e2_without_e1.length) findings.push({ check: 'R1', issue: 'enforcement_without_decision', count: r1.e2_without_e1.length });
  if (r1.request_id_mismatch.length) findings.push({ check: 'R1', issue: 'request_id_mismatch', count: r1.request_id_mismatch.length });
  // R2 lineage
  const issuedBy = new Map(ISS.filter((r) => r.detail.ledger === 'sts').map((r) => [r.corr.jti_ref, r]));
  const lineage = (ref) => {
    const chain = [];
    let cur = ref;
    for (let i = 0; i < 10 && cur; i++) {
      const rec = issuedBy.get(cur);
      if (!rec) return { chain, root: chain.length ? chain[chain.length - 1] : null, complete: false, missing: cur };
      chain.push(cur);
      const inp = rec.detail.input_token;
      if (!inp || !issuedBy.has(inp.jti_ref)) return { chain, root: cur, external_input: inp?.iss, complete: true };
      cur = inp.jti_ref;
    }
    return { chain, complete: false };
  };
  const r2 = { checked: 0, broken: [] };
  for (const r of [...E1, ...E2]) {
    if (!r.corr.jti_ref) continue;
    r2.checked++;
    const l = lineage(r.corr.jti_ref);
    if (!l.complete) r2.broken.push({ decision_id: r.corr.decision_id, jti_ref: r.corr.jti_ref });
  }
  if (r2.broken.length) findings.push({ check: 'R2', issue: 'lineage_broken', count: r2.broken.length });
  // R3 txn groups
  const ttsByTxn = new Map(ISS.filter((r) => r.detail.ledger === 'tts').map((r) => [r.corr.txn, r]));
  const txns = new Map();
  for (const r of [...E1, ...E2]) {
    if (!r.corr.txn) continue;
    if (!txns.has(r.corr.txn)) txns.set(r.corr.txn, []);
    txns.get(r.corr.txn).push(r);
  }
  const r3 = { txns: [], unissued_txn: [] };
  for (const [txn, evs] of txns) {
    const iss = ttsByTxn.get(txn);
    if (!iss) { r3.unissued_txn.push(txn); continue; }
    const rootRef = iss.detail.root_jti_ref;
    const hops = evs.filter((e) => e.family === 'decision').map((d) => {
      const e = e2ById.get(d.corr.decision_id);
      const l = lineage(d.corr.jti_ref);
      return {
        decision_id: d.corr.decision_id, request_id: d.corr.request_id, action: d.action.name, resource_type: d.resource.type,
        decision: d.detail.decision, reason: d.detail.reason, pdp_caller: d.actor.chain[d.actor.chain.length - 1].nhi_id,
        enforced: e ? e.detail.result : null, enforcing_pep: e ? e.detail.pep_id : null, jti_ref: d.corr.jti_ref,
        lineage_root: l.root, lineage_reaches_txn_root: l.chain.includes(rootRef), trace_id_index: d.corr.trace_id,
      };
    });
    const consistent = hops.every((h) => h.enforced !== null && h.lineage_reaches_txn_root) && evs.every((e) => e.tid === iss.tid);
    r3.txns.push({ txn, tid: iss.tid, origin_tier: iss.detail.origin_tier, req_wl: iss.detail.req_wl, root_jti_ref: rootRef, hops, consistent });
  }
  if (r3.unissued_txn.length) findings.push({ check: 'R3', issue: 'txn_without_tts_issuance', count: r3.unissued_txn.length });
  const inconsistentTxn = r3.txns.filter((t) => !t.consistent);
  if (inconsistentTxn.length) findings.push({ check: 'R3', issue: 'txn_chain_inconsistent', count: inconsistentTxn.length });
  // R4 read-sensitive triples
  const r4 = E1.filter((d) => d.tier === 'read-sensitive' && !d.corr.txn).map((d) => ({ jti_ref: d.corr.jti_ref, decision_id: d.corr.decision_id, request_id: d.corr.request_id, enforced: !!e2ById.get(d.corr.decision_id) }));
  const summary = {
    journal_records: journal.length, invalid_records: invalid.length, producers: chains, producer_logs: c2, copy: c3,
    reconstruction: {
      decisions: r1.decisions, enforcements: r1.enforcements, e2_without_e1: r1.e2_without_e1.length, e1_without_e2: r1.e1_without_e2.length,
      lineage_checked: r2.checked, lineage_broken: r2.broken.length, txn_groups: r3.txns.length, txn_consistent: r3.txns.length - inconsistentTxn.length,
      read_sensitive_triples: r4.length,
    },
    ok: findings.length === 0,
    findings,
  };
  return { summary, txns: r3.txns, triples: r4 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args();
  if (!a.run) { console.error('usage: node audit/verify.js --run <run-dir> [--out <file>]'); process.exit(2); }
  const r = verifyRun(a.run);
  const out = a.out || path.join(a.run, 'audit-verify.json');
  fs.writeFileSync(out, JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r.summary, null, 2));
  process.exit(r.summary.ok ? 0 : 1);
}
