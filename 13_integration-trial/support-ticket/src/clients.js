// Outbound clients for platform contracts. URLs come only from CON-11 §11.4 settings.
import { randomId } from './jose.js';

export class Unavailable extends Error { constructor(what, status) { super(`${what} unavailable ${status ?? ''}`); this.status = status; } }

async function call(url, init, what, timeoutMs = 1000) {
  let r;
  try { r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }); } catch { throw new Unavailable(what); }
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: r.status, body, headers: r.headers };
}

export class Platform {
  constructor(cfg) { this.cfg = cfg; this.log = []; }

  // CON-05 registerAcceptanceRecord (A1). Txn-Token is passed unmodified.
  async registerAcceptance(txnToken, { jobDefinitionId, paramsHash, consistencyToken, dedupKey }) {
    const body = { job_definition_id: jobDefinitionId, params_hash: paramsHash, dedup_key: dedupKey };
    if (consistencyToken) body.consistency_token = consistencyToken;
    const r = await call(new URL('acceptance-records', this.cfg.jobLedgerUrl.replace(/\/?$/, '/')), {
      method: 'POST', headers: { 'content-type': 'application/json', 'txn-token': txnToken }, body: JSON.stringify(body),
    }, 'job-ledger');
    if (r.status !== 201 && r.status !== 200) throw new Unavailable('job-ledger', r.status);
    return r.body;
  }

  // CON-05 requestTxnToken, internal start (subject_token = job_run_id)
  async internalStartTxn(jobRunId, scope) {
    const form = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requested_token_type: 'urn:ietf:params:oauth:token-type:txn_token',
      audience: this.cfg.tts.audience, scope,
      subject_token: jobRunId, subject_token_type: 'urn:uuid:569d2793-a1dc-493e-a1ef-ca2904f77173',
    });
    const r = await call(new URL('txn-token', this.cfg.tts.url.replace(/\/?$/, '/')), {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form.toString(),
    }, 'tts');
    if (r.status !== 200 || !r.body?.access_token) throw new Unavailable('tts', r.status);
    return r.body.access_token;
  }

  // CON-04 writeRelationships (assignee of own-tenant users only)
  async writeRelationships(tid, txnToken, writes, deletes = []) {
    const r = await call(new URL(`v1/tenants/${encodeURIComponent(tid)}/relationships/write`, this.cfg.registryUrl.replace(/\/?$/, '/')), {
      method: 'POST', headers: { 'content-type': 'application/json', 'txn-token': txnToken, 'x-request-id': randomId() },
      body: JSON.stringify({ writes, deletes, idempotency_key: crypto.randomUUID() }),
    }, 'registry');
    return r;
  }

  // CON-17 createExternalGrant
  async createExternalGrant(tid, txnToken, req, idemKey) {
    const r = await call(new URL(`v1/tenants/${encodeURIComponent(tid)}/external-grants`, this.cfg.externalGrantUrl.replace(/\/?$/, '/')), {
      method: 'POST', headers: { 'content-type': 'application/json', 'txn-token': txnToken, 'x-request-id': randomId(), 'idempotency-key': idemKey },
      body: JSON.stringify(req),
    }, 'external-grant');
    return r;
  }

  // CON-17 revokeExternalGrantsByAnchor
  async revokeByAnchor(tid, txnToken, anchorResource, idemKey) {
    const r = await call(new URL(`v1/tenants/${encodeURIComponent(tid)}/external-grants/revoke-by-anchor`, this.cfg.externalGrantUrl.replace(/\/?$/, '/')), {
      method: 'POST', headers: { 'content-type': 'application/json', 'txn-token': txnToken, 'x-request-id': randomId(), 'idempotency-key': idemKey },
      body: JSON.stringify({ anchor_resource: anchorResource, reason_class: 'anchor_deleted' }),
    }, 'external-grant');
    if (r.status !== 200) throw new Unavailable('external-grant', r.status);
    return r.body;
  }
}
