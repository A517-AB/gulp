/**
 * @file jules-cache.ts
 * @description Node-side IPC surface over the Jules SDK's local-first cache.
 *
 * `connect()` builds a real `JulesClientImpl` wired to NodePlatform +
 * NodeFileStorage/NodeSessionStorage, so these handlers read and write the
 * on-disk cache at `<rootDir>/.jules/cache`. In dev, rootDir resolves to the
 * project root (cwd has package.json), i.e. D:\LAST\.jules\cache.
 *
 * Cache vs network:
 * - `select` / `activities` → read the local cache only, no network.
 * - `sessions` / `sync` → hit the API and write-through cache to disk.
 */

import type {IpcMain, IpcMainInvokeEvent} from 'electron';
import type {JulesDomain, JulesQuery, ListSessionsOptions} from '@jules';
import {connect} from '@jules';

export function registerJulesCacheHandlers(ipcMain: IpcMain): void {
    const client = connect();

    // ── list sessions (network, write-through) ──────────────────────────────
    // SessionCursor honors `limit` as a true first-N and yields in API order,
    // unlike select()'s scan-cap. Right tool for "20 most recent".
    ipcMain.handle('jules.cache.sessions', (_e: IpcMainInvokeEvent, options?: ListSessionsOptions) =>
        client.sessions(options).all());

    // ── read cache (no network) ─────────────────────────────────────────────
    ipcMain.handle('jules.cache.select', (_e: IpcMainInvokeEvent, query: JulesQuery<JulesDomain>) =>
        client.select(query));

    // history() = local first, fetches from network if cache empty
    ipcMain.handle('jules.cache.activities', async (_e: IpcMainInvokeEvent, sessionId: string) => {
        const acts = []
        for await (const a of client.session(sessionId).history()) acts.push(a)
        return acts
    });

    ipcMain.handle('jules.cache.send', (_e: IpcMainInvokeEvent, sessionId: string, msg: string) =>
        client.session(sessionId).send(msg));

    ipcMain.handle('jules.cache.approve', (_e: IpcMainInvokeEvent, sessionId: string) =>
        client.session(sessionId).approve());

    // ── fill cache (network → disk, write-through) ──────────────────────────
    ipcMain.handle('jules.cache.sync', (_e: IpcMainInvokeEvent, options?: Parameters<typeof client.sync>[0]) =>
        client.sync(options));
}
