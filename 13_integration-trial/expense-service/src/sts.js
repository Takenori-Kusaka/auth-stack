// (3) delegation: RFC 8693 token exchange against CON-05 (token-exchange.openapi.yaml 0.1.0).
// Profile restrictions from CON-05 info.description: no actor_token, exactly one resource, no audience,
// scope must not widen. Errors -> do not call downstream (P-03 失敗時挙動).
const GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const AT = 'urn:ietf:params:oauth:token-type:access_token';

export class StsClient {
  constructor(cfg) { this.cfg = cfg; this.calls = []; }

  async exchange({ subjectToken, resource, scope }) {
    if (!resource) return { kind: 'error', why: 'no_resource_configured' };
    const form = new URLSearchParams({ grant_type: GRANT, subject_token: subjectToken, subject_token_type: AT, resource });
    if (scope) form.set('scope', scope);
    this.calls.push({ op: 'exchangeToken', form: Object.fromEntries(form) });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.cfg.pdpDeadlineMs);
    try {
      const r = await fetch(this.cfg.stsTokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form, signal: ctrl.signal });
      const j = await r.json().catch(() => null);
      if (r.status !== 200) return { kind: 'error', why: `http_${r.status}`, error: j && j.error };
      if (!j || typeof j.access_token !== 'string' || j.issued_token_type !== AT || typeof j.expires_in !== 'number') return { kind: 'error', why: 'bad_response' };
      if (j.refresh_token) return { kind: 'error', why: 'unexpected_refresh_token' }; // profile (6)
      if (scope && j.scope && j.scope.split(' ').some((s) => !scope.split(' ').includes(s))) return { kind: 'error', why: 'scope_widened' };
      return { kind: 'ok', accessToken: j.access_token, expiresIn: j.expires_in };
    } catch (e) {
      return { kind: 'error', why: ctrl.signal.aborted ? 'deadline' : 'network' };
    } finally { clearTimeout(t); }
  }

  /** requestTxnToken (preview) for internal-start in the P-04 consumer. */
  // Internal start (CON-05 example "internalStart", proposal X74-01): subject_token is an opaque reference to
  // the acceptance record (受付記録) = job_run_id. How a non-SDK service registers that record is not in any
  // contract (P-24 says "PEP SDK の enqueue（基盤内部）") -> report P-list.
  async requestTxnToken({ jobRunId, audience, scope }) {
    if (!this.cfg.ttsUrl) return { kind: 'error', why: 'no_tts_configured' };
    const form = new URLSearchParams({
      grant_type: GRANT,
      requested_token_type: 'urn:ietf:params:oauth:token-type:txn_token',
      subject_token: jobRunId,
      // value copied from the contract; it embeds the placeholder <id-domain> (I-2 undecided)
      subject_token_type: 'https://id-domain.example/token-types/internal-start-ref',
      audience, scope,
    });
    this.calls.push({ op: 'requestTxnToken', form: Object.fromEntries(form) });
    try {
      const r = await fetch(this.cfg.ttsUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
      const j = await r.json().catch(() => null);
      if (r.status !== 200 || !j || typeof j.access_token !== 'string') return { kind: 'error', why: `http_${r.status}`, body: j };
      return { kind: 'ok', txnToken: j.access_token };
    } catch { return { kind: 'error', why: 'network' }; }
  }
}
