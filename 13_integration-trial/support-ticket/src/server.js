// Entry point: node src/server.js (settings from CON-11 §11.4 environment variables only)
import { loadConfig } from './config.js';
import { createApp } from './app.js';
const cfg = await loadConfig();
const app = await createApp(cfg);
app.server.listen(Number(process.env.PORT || 8080), '127.0.0.1', () => console.error(JSON.stringify({ level: 'info', msg: 'listening', port: app.server.address().port })));
