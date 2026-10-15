// OpenFGA adapter (R 段 engine #1). Talks to the OpenFGA v1.21.0 HTTP API. The façade never exposes this API
// to PEPs (ADR-011 D5-3/D5-4). Consistency mapping (authorization-model.md §9.1, ADR-011 D6-3 "常時格上げ"):
//   minimize_latency -> MINIMIZE_LATENCY ; at_least_as_fresh / fully_consistent -> HIGHER_CONSISTENCY.
import fs from 'node:fs';
import { request } from '../../lib/http.js';
import { toOpenFga, fgaCond } from '../../model/cam.js';

const subjKey = (s) => `${s.type}:${s.id}${s.relation ? '#' + s.relation : ''}`;

export class OpenFgaAdapter {
  constructor({ url, storeName = 'poc-c1', timeoutMs = 2000, log, stateFile }) {
    this.url = url;
    this.stateFile = stateFile; // persists store id + model ids so a façade restart reuses the store
    this.storeName = storeName;
    this.timeoutMs = timeoutMs;
    this.log = log;
    this.models = new Map(); // cam revision -> authorization_model_id
    this.engine_id = 'openfga';
    this.engine_version = 'v1.21.0';
  }

  async call(path, body) {
    let r;
    try {
      r = await request(`${this.url}${path}`, { method: 'POST', body, timeoutMs: this.timeoutMs });
    } catch (e) {
      return { unavailable: true, detail: e.code || e.message };
    }
    if (r.status >= 500 || r.status === 0) return { unavailable: r.status >= 500 && r.status !== 501, status: r.status, detail: r.text.slice(0, 300), body: r.json() };
    return { status: r.status, body: r.json(), text: r.text };
  }

  async init() {
    if (this.stateFile && fs.existsSync(this.stateFile)) {
      const st = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      try {
        const g = await request(`${this.url}/stores/${st.storeId}`, { timeoutMs: this.timeoutMs });
        if (g.status === 200) { this.storeId = st.storeId; this.models = new Map(Object.entries(st.models || {})); return this; }
      } catch { /* engine restarted without persistence: create a new store */ }
    }
    const r = await this.call('/stores', { name: this.storeName });
    if (r.status !== 201) throw new Error(`openfga store create failed: ${r.status} ${r.text || r.detail}`);
    this.storeId = r.body.id;
    this.persist();
    return this;
  }

  async registerModel(cam) {
    if (this.models.has(cam.revision)) return this.models.get(cam.revision);
    const r = await this.call(`/stores/${this.storeId}/authorization-models`, toOpenFga(cam));
    if (r.status !== 201) throw new Error(`openfga model write failed: ${r.status} ${r.text || r.detail}`);
    this.models.set(cam.revision, r.body.authorization_model_id);
    this.persist();
    return r.body.authorization_model_id;
  }

  persist() {
    if (this.stateFile) fs.writeFileSync(this.stateFile, JSON.stringify({ storeId: this.storeId, models: Object.fromEntries(this.models) }));
  }

  tupleKey(t) {
    const k = { user: subjKey(t.subject), relation: t.relation, object: `${t.resource.type}:${t.resource.id}` };
    if (t.condition) k.condition = { name: fgaCond(t.condition.name), context: t.condition.context || {} };
    return k;
  }

  async write({ writes = [], deletes = [], modelRevision, onDuplicate, onMissing }) {
    const body = { authorization_model_id: this.models.get(modelRevision) };
    if (writes.length) body.writes = { tuple_keys: writes.map((t) => this.tupleKey(t)), ...(onDuplicate === 'ignore' ? { on_duplicate: 'ignore' } : {}) };
    if (deletes.length) body.deletes = { tuple_keys: deletes.map((t) => { const { condition, ...k } = this.tupleKey(t); return k; }), ...(onMissing === 'ignore' ? { on_missing: 'ignore' } : {}) };
    const r = await this.call(`/stores/${this.storeId}/write`, body);
    if (r.unavailable) return { error: 'unavailable', detail: r.detail };
    if (r.status !== 200) return { error: 'rejected', detail: r.text };
    return { ok: true };
  }

  ctx(now) { return { current_time: new Date(now).toISOString() }; }

  async check({ subject, relation, resource, modelRevision, mode, now }) {
    const mid = this.models.get(modelRevision);
    if (!mid) return { error: 'indeterminate', detail: 'unknown model revision' };
    const r = await this.call(`/stores/${this.storeId}/check`, {
      tuple_key: { user: subjKey(subject), relation, object: `${resource.type}:${resource.id}` },
      authorization_model_id: mid,
      consistency: mode === 'minimize_latency' ? 'MINIMIZE_LATENCY' : 'HIGHER_CONSISTENCY',
      context: this.ctx(now),
    });
    if (r.unavailable) return { error: 'unavailable', detail: r.detail };
    if (r.status !== 200 || typeof r.body?.allowed !== 'boolean') return { error: 'indeterminate', detail: r.text || r.detail };
    return { allowed: r.body.allowed };
  }

  async listObjects({ type, relation, subject, modelRevision, mode, now }) {
    const mid = this.models.get(modelRevision);
    const r = await this.call(`/stores/${this.storeId}/list-objects`, {
      authorization_model_id: mid, type, relation, user: subjKey(subject),
      consistency: mode === 'minimize_latency' ? 'MINIMIZE_LATENCY' : 'HIGHER_CONSISTENCY',
      context: this.ctx(now),
    });
    if (r.unavailable) return { error: 'unavailable', detail: r.detail };
    if (r.status !== 200) return { error: 'indeterminate', detail: r.text };
    const objects = (r.body.objects || []).map((o) => o.slice(type.length + 1));
    // OpenFGA returns at most listObjectsMaxResults (default 1000) within listObjectsDeadline (default 3s):
    // a full page is treated as possibly truncated (ADR-025 D25-07).
    return { objects, truncated: objects.length >= (this.listMax || 1000) };
  }

  async read({ resource, relation, subject } = {}) {
    const tuple_key = {};
    if (resource) tuple_key.object = resource.id ? `${resource.type}:${resource.id}` : `${resource.type}:`;
    if (relation) tuple_key.relation = relation;
    if (subject) tuple_key.user = subjKey(subject);
    const out = [];
    let token;
    do {
      const r = await this.call(`/stores/${this.storeId}/read`, { tuple_key: Object.keys(tuple_key).length ? tuple_key : undefined, page_size: 100, continuation_token: token });
      if (r.status !== 200) return { error: r.unavailable ? 'unavailable' : 'indeterminate', detail: r.text || r.detail };
      for (const t of r.body.tuples || []) out.push(t.key);
      token = r.body.continuation_token;
    } while (token);
    return { tuples: out };
  }
}
