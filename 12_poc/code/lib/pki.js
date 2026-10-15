// Test PKI generated at run time (never committed).
// - One CA per trust domain (the "trust bundle"). Workload certificates act as X.509-SVIDs:
//   exactly one URI SAN spiffe://<trust-domain>/w/<name> (ADR-009 N-a), plus DNS localhost / IP 127.0.0.1
//   so the same certificate serves TLS server and mTLS client roles.
// - Keys are generated with node:crypto (fast, native); certificates are assembled/signed with node-forge.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';

function genRsa() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs1', format: 'pem' });
  return { pem, forgeKey: forge.pki.privateKeyFromPem(pem) };
}

function serial() {
  return '01' + crypto.randomBytes(15).toString('hex');
}

export function createCa(name) {
  const k = genRsa();
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.setRsaPublicKey(k.forgeKey.n, k.forgeKey.e);
  cert.serialNumber = serial();
  const now = new Date(Date.now() - 60_000);
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + 7 * 24 * 3600_000);
  const attrs = [{ name: 'commonName', value: `${name} test CA` }, { name: 'organizationName', value: 'auth-stack PoC (synthetic)' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(k.forgeKey, forge.md.sha256.create());
  return { name, keyPem: k.pem, certPem: forge.pki.certificateToPem(cert), forgeKey: k.forgeKey, forgeCert: cert };
}

/**
 * Issue a workload certificate (SVID-like). `spiffeId` may be null for a plain server cert.
 */
export function issueCert(ca, { cn, spiffeId, validMs = 24 * 3600_000 }) {
  const k = genRsa();
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.setRsaPublicKey(k.forgeKey.n, k.forgeKey.e);
  cert.serialNumber = serial();
  const now = new Date(Date.now() - 60_000);
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + validMs);
  cert.setSubject([{ name: 'commonName', value: cn }]);
  cert.setIssuer(ca.forgeCert.subject.attributes);
  const altNames = [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }];
  if (spiffeId) altNames.unshift({ type: 6, value: spiffeId });
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    { name: 'subjectAltName', altNames },
  ]);
  cert.sign(ca.forgeKey, forge.md.sha256.create());
  return { cn, spiffeId, keyPem: k.pem, certPem: forge.pki.certificateToPem(cert) };
}

/** x5t#S256 of a certificate (PEM or DER Buffer) per RFC 8705 §3.1. */
export function x5tS256(certPemOrDer) {
  const der = Buffer.isBuffer(certPemOrDer) ? certPemOrDer : new crypto.X509Certificate(certPemOrDer).raw;
  return crypto.createHash('sha256').update(der).digest('base64url');
}

/** Extract the single SPIFFE URI SAN from a peer certificate (node TLS getPeerCertificate()). */
export function spiffeIdFromPeer(peer) {
  if (!peer || !peer.subjectaltname) return null;
  const uris = peer.subjectaltname.split(', ').filter((s) => s.startsWith('URI:')).map((s) => s.slice(4));
  if (uris.length !== 1) return null; // SVID must carry exactly one URI SAN
  return uris[0].startsWith('spiffe://') ? uris[0] : null;
}

/**
 * Build the PKI for one run: trust domain "poc.test" (prod role) and "sandbox.test" (sandbox role, TC-025).
 * Writes PEM files under dir and returns paths.
 */
export function buildRunPki(dir, workloads, { trustDomain = 'poc.test', extraDomains = ['sandbox.test'] } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const out = { dir, trustDomain, domains: {} };
  for (const td of [trustDomain, ...extraDomains]) {
    const ca = createCa(td);
    const tdDir = path.join(dir, td);
    fs.mkdirSync(tdDir, { recursive: true });
    fs.writeFileSync(path.join(tdDir, 'ca.pem'), ca.certPem);
    const certs = {};
    const names = td === trustDomain ? workloads : ['attacker', ...workloads.filter((w) => w === 'edge' || w === 'file-service')];
    for (const w of names) {
      const c = issueCert(ca, { cn: w, spiffeId: `spiffe://${td}/w/${w}` });
      fs.writeFileSync(path.join(tdDir, `${w}.key.pem`), c.keyPem, { mode: 0o600 });
      fs.writeFileSync(path.join(tdDir, `${w}.cert.pem`), c.certPem);
      certs[w] = { key: path.join(tdDir, `${w}.key.pem`), cert: path.join(tdDir, `${w}.cert.pem`), spiffeId: c.spiffeId };
    }
    out.domains[td] = { ca: path.join(tdDir, 'ca.pem'), certs };
  }
  return out;
}
