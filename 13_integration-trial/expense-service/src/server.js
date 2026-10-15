// Wiring for `npm start` (not used by the tests, which build the same graph in test/harness.js).
import { loadConfig } from './config.js';
import { TokenVerifier } from './token.js';
import { PdpClient } from './pdp.js';
import { StsClient } from './sts.js';
import { AuditProducer } from './audit.js';
import { createApp, Store } from './app.js';

const cfg = loadConfig();
const log = (x) => console.log(JSON.stringify(x));
const app = createApp({ cfg, verifier: new TokenVerifier(cfg), pdp: new PdpClient(cfg, log), sts: new StsClient(cfg), audit: new AuditProducer(cfg), registry: { calls: [] }, store: new Store(), log });
const port = Number(process.env.PORT || '8080');
app.server.listen(port, '127.0.0.1', () => log({ msg: 'expense-service listening', port }));
