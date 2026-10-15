// DPoP public-client call to the edge with arbitrary extra headers (trace headers for TC-016, etc.).
import { request } from '../../../lib/http.js';
import { createProof } from '../../../lib/dpop.js';

export function makeCliCaller(s, cli) {
  let nonce;
  return async function cliCall(method, p, body, extraHeaders = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const url = `${s.topo.urls.edge}${p}`;
      const token = cli.tokens.access_token;
      const headers = { authorization: `DPoP ${token}`, dpop: await createProof(cli.key, { htm: method, htu: url, accessToken: token, nonce }), ...extraHeaders };
      const r = await request(url, { method, body, headers, tls: { ca: s.topo.pki.ca }, timeoutMs: 15_000 });
      if (r.status === 401 && r.headers['dpop-nonce'] && attempt < 2 && /use_dpop_nonce|dpop/.test(r.headers['www-authenticate'] || '') ) { nonce = r.headers['dpop-nonce']; if (/use_dpop_nonce/.test(r.headers['www-authenticate'] || '')) continue; }
      return { status: r.status, body: r.json() ?? r.text, headers: r.headers };
    }
  };
}
