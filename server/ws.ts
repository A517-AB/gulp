import type { ServerWebSocket } from 'bun';
import { getClient } from './client.ts';
import { enrichActivity } from './helpers.ts';
import type { WsData, WsKind, WsMessage } from './types.ts';
import type { SessionConfig } from '@google/jules-sdk';

// ── active stream registry ────────────────────────────────────────────────────
// Exported so routes/streams.ts can read and cancel entries.

export const activeStreams = new Map<string, { cancel: () => void }>();

// ── helpers ───────────────────────────────────────────────────────────────────

function send(ws: ServerWebSocket<WsData>, msg: WsMessage): void {
  ws.send(JSON.stringify(msg));
}

function sendError(ws: ServerWebSocket<WsData>, error: string): void {
  send(ws, { type: 'error', error });
  ws.close();
}

// ── session stream (history + live or live-only) ──────────────────────────────

async function runSessionStream(
  ws: ServerWebSocket<WsData>,
  kind: 'session-stream' | 'session-updates',
  id: string,
): Promise<void> {
  const session = getClient().session(id);
  const iter    = kind === 'session-stream' ? session.stream() : session.updates();
  const msgType = kind === 'session-stream' ? 'activity' : 'update';

  for await (const activity of iter) {
    if (ws.data.cancelled) return;

    // auto-approve plan if the client requested it
    if (activity.type === 'planGenerated' && ws.data.autoApprove) {
      await session.approve().catch(() => {});
    }

    send(ws, { type: msgType, activity: enrichActivity(activity) });
  }

  if (kind === 'session-stream' && !ws.data.cancelled) {
    const outcome = await session.result();
    send(ws, {
      type: 'done',
      outcome: {
        ...outcome,
        generatedFiles: outcome.generatedFiles().all(),
        changeSet: outcome.changeSet(),
      },
    });
    ws.close();
  }
}

// ── run stream ────────────────────────────────────────────────────────────────

async function runRunStream(
  ws: ServerWebSocket<WsData>,
  config: SessionConfig,
): Promise<void> {
  const run    = await getClient().run(config);
  const realId = run.id;

  // re-key under the actual run id so /streams/:id cancellation works
  activeStreams.delete(ws.data.id);
  ws.data.id = realId;
  activeStreams.set(realId, { cancel: () => { ws.data.cancelled = true; ws.close(); } });

  send(ws, { type: 'started', id: realId });

  for await (const activity of run.stream()) {
    if (ws.data.cancelled) return;
    send(ws, { type: 'activity', activity: enrichActivity(activity) });
  }

  if (!ws.data.cancelled) {
    const outcome = await run.result();
    send(ws, {
      type: 'done',
      outcome: {
        ...outcome,
        generatedFiles: outcome.generatedFiles().all(),
        changeSet: outcome.changeSet(),
      },
    });
    ws.close();
  }
}

// ── sync stream ───────────────────────────────────────────────────────────────

async function runSyncStream(
  ws: ServerWebSocket<WsData>,
  opts: Record<string, unknown>,
): Promise<void> {
  const stats = await getClient().sync({
    ...opts,
    onProgress: (progress: unknown) => {
      if (!ws.data.cancelled) send(ws, { type: 'progress', progress });
    },
  });

  if (!ws.data.cancelled) {
    send(ws, { type: 'done', stats });
    ws.close();
  }
}

// ── ws handler object (passed to Bun.serve) ───────────────────────────────────

export const websocket: Parameters<typeof Bun.serve>[0]['websocket'] = {
  open(ws: ServerWebSocket<WsData>) {
    ws.data.cancelled = false;
    activeStreams.set(ws.data.id, {
      cancel: () => { ws.data.cancelled = true; ws.close(); },
    });

    if (ws.data.kind === 'session-stream' || ws.data.kind === 'session-updates') {
      runSessionStream(ws, ws.data.kind, ws.data.id).catch((err: Error) => {
        sendError(ws, err.message);
      });
    }
  },

  async message(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
    try {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>;

      if (ws.data.kind === 'run' && msg['type'] === 'start') {
        await runRunStream(ws, msg['config'] as SessionConfig);
      } else if (ws.data.kind === 'sync') {
        await runSyncStream(ws, (msg ?? {}) as Record<string, unknown>);
      }
    } catch (err) {
      sendError(ws, err instanceof Error ? err.message : String(err));
    }
  },

  close(ws: ServerWebSocket<WsData>) {
    ws.data.cancelled = true;
    activeStreams.delete(ws.data.id);
  },
};

// ── upgrade helper (used in index.ts fetch handler) ──────────────────────────

export function tryUpgrade(req: Request, server: ReturnType<typeof Bun.serve>): Response | undefined {
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/ws/')) return undefined;

  const autoApprove = url.searchParams.get('autoApprove') === 'true';

  const sessionMatch = url.pathname.match(/^\/ws\/sessions\/([^/]+)\/(stream|updates)$/);
  if (sessionMatch) {
    const id   = sessionMatch[1]!;
    const kind: WsKind = sessionMatch[2] === 'stream' ? 'session-stream' : 'session-updates';
    if (server.upgrade(req, { data: { kind, id, cancelled: false, autoApprove } })) {
      return undefined;
    }
  }

  if (url.pathname === '/ws/run') {
    const id = `run-${Date.now()}`;
    if (server.upgrade(req, { data: { kind: 'run' as WsKind, id, cancelled: false, autoApprove } })) {
      return undefined;
    }
  }

  if (url.pathname === '/ws/sync') {
    const id = `sync-${Date.now()}`;
    if (server.upgrade(req, { data: { kind: 'sync' as WsKind, id, cancelled: false, autoApprove: false } })) {
      return undefined;
    }
  }

  return new Response('WS upgrade failed', { status: 400 });
}
