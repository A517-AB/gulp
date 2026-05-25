import { app } from './app.ts';
import { websocket, tryUpgrade } from './ws.ts';
import type { WsData } from './types.ts';

const PORT = Number(process.env.JULES_PORT ?? 3939);
const HOST = process.env.JULES_HOST ?? '127.0.0.1';

const server = Bun.serve<WsData>({
  port: PORT,
  hostname: HOST,
  idleTimeout: 120,

  async fetch(req, server) {
    const upgraded = tryUpgrade(req, server);
    if (upgraded !== undefined) return upgraded;
    return app.fetch(req);
  },

  websocket,
});

console.log(`✔  Jules sidecar live on http://${HOST}:${PORT}`);
console.log(`   Swagger UI:  http://${HOST}:${PORT}/docs`);
console.log(`   OpenAPI:     http://${HOST}:${PORT}/openapi.json`);
console.log(`   WS streams:  ws://${HOST}:${PORT}/ws/sessions/:id/{stream|updates}`);
console.log(`   WS run:      ws://${HOST}:${PORT}/ws/run`);
console.log(`   WS sync:     ws://${HOST}:${PORT}/ws/sync`);

const shutdown = (sig: string): void => {
  console.log(`\n${sig} received, closing...`);
  for (const s of activeStreams.values()) s.cancel();
  server.stop();
  process.exit(0);
};

import { activeStreams } from './ws.ts';
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
