import { ipcMain } from 'electron'
import { jules } from '@google/jules-sdk'
import type {
    ListSessionsOptions,
    JulesOptions,
    SessionConfig,
    JulesQuery,
    JulesDomain,
    SessionState,
    SessionClient,
    JulesClient,
} from '@google/jules-sdk'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'

type StreamActivitiesOptions = Parameters<SessionClient['stream']>[0]
type SyncOptions = Omit<NonNullable<Parameters<JulesClient['sync']>[0]>, 'onProgress' | 'signal'>
type SelectOptions = Parameters<SessionClient['activities']['select']>[0]
type ListOptions = Parameters<SessionClient['activities']['list']>[0]

// ── helpers ───────────────────────────────────────────────────────────────────

function resolveGitSource(cwd?: string): { github: string | null; baseBranch: string } {
    const baseBranch = process.env['BASE_BRANCH'] ?? 'main'
    const fromEnv = process.env['GITHUB_REPO']
    if (fromEnv) return { github: fromEnv, baseBranch }
    try {
        const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf-8' }).trim()
        const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/)
        return { github: match?.[1] ?? null, baseBranch }
    } catch {
        return { github: null, baseBranch }
    }
}

type Sender = Electron.WebContents

function serialize<T>(data: T): T {
    if (data === undefined || data === null) return data
    return JSON.parse(JSON.stringify(data))
}

function send(sender: Sender, ch: string, payload?: unknown) {
    if (!sender.isDestroyed()) sender.send(ch, serialize(payload))
}

// ── registration ──────────────────────────────────────────────────────────────

export function registerSdkHandlers() {

    // ── client ──────────────────────────────────────────────────────────────────

    ipcMain.handle('sdk:client.sessions', async (_, options?: ListSessionsOptions) => {
        const sessions = await jules.sessions(options).all()
        return serialize(sessions)
    })

    ipcMain.handle('sdk:client.sessions.stream.start', async (event, options?: ListSessionsOptions) => {
        for await (const item of jules.sessions(options)) {
            if (event.sender.isDestroyed()) break
            send(event.sender, 'sdk:client.sessions.item', item)
        }
        send(event.sender, 'sdk:client.sessions.done')
    })

    ipcMain.handle('sdk:client.sync', async (event, options?: SyncOptions) =>
        serialize(await jules.sync({
            ...options,
            onProgress: (p) => { send(event.sender, 'sdk:client.sync.progress', p); },
        }))
    )

    ipcMain.handle('sdk:client.select', async (_, query: JulesQuery<JulesDomain>) =>
        serialize(await jules.select(query))
    )

    ipcMain.handle('sdk:client.getSessionResource', async (_, id: string) =>
        serialize(await jules.session(id).info())
    )

    ipcMain.handle('sdk:client.run', async (_, config: SessionConfig) =>
        serialize(await jules.run(config))
    )

    ipcMain.handle('sdk:client.with', async (_, options: JulesOptions) =>
        serialize(await jules.with(options))
    )

    // ── session ──────────────────────────────────────────────────────────────────

    ipcMain.handle('sdk:session.send', async (_, id: string, prompt: string) =>
        { serialize(await jules.session(id).send(prompt)); }
    )

    ipcMain.handle('sdk:session.ask', async (_, id: string, prompt: string) =>
        serialize(await jules.session(id).ask(prompt))
    )

    ipcMain.handle('sdk:session.approve', async (_, id: string) =>
        { serialize(await jules.session(id).approve()); }
    )

    ipcMain.handle('sdk:session.info', async (_, id: string) =>
        serialize(await jules.session(id).info())
    )

    ipcMain.handle('sdk:session.result', async (_, id: string) =>
        serialize(await jules.session(id).result())
    )

    ipcMain.handle('sdk:session.waitFor', async (_, id: string, state: SessionState) =>
        { serialize(await jules.session(id).waitFor(state)); }
    )

    ipcMain.handle('sdk:session.snapshot', async (_, id: string, options?: { activities?: boolean }) =>
        serialize(await jules.session(id).snapshot(options))
    )

    ipcMain.handle('sdk:session.archive', async (_, id: string) =>
        { serialize(await jules.session(id).archive()); }
    )

    ipcMain.handle('sdk:session.unarchive', async (_, id: string) =>
        { serialize(await jules.session(id).unarchive()); }
    )

    ipcMain.handle('sdk:session.select', async (_, id: string, options?: SelectOptions) =>
        serialize(await jules.session(id).select(options))
    )

    ipcMain.handle('sdk:session.hydrate', async (_, id: string) =>
        serialize(await jules.session(id).activities.hydrate())
    )

    ipcMain.handle('sdk:session.applyPatch', async (_, id: string, options: { cwd: string }) => {
        const branchName = `jules-patch-${Date.now()}`;
        let patchPath: string | null = null;
        try {
            const snapshot = await jules.session(id).snapshot();
            const gitPatch = snapshot.changeSet()?.gitPatch;
            if (!gitPatch || !gitPatch.unidiffPatch) {
                return { success: false, error: 'No ChangeSet artifact with gitPatch data found in this session.' };
            }

            const commitMessage = gitPatch.suggestedCommitMessage || 'Applied changes from Jules';

            // Checkout a new branch to apply the changes
            execFileSync('git', ['checkout', '-b', branchName], { cwd: options.cwd, stdio: 'pipe' });

            // Save the patch to disk
            patchPath = path.join(options.cwd, 'jules_changes.patch');
            fs.writeFileSync(patchPath, gitPatch.unidiffPatch);

            // Apply the patch
            execFileSync('git', ['apply', patchPath], { cwd: options.cwd, stdio: 'pipe' });

            // Commit the applied changes
            execFileSync('git', ['add', '.'], { cwd: options.cwd, stdio: 'pipe' });
            execFileSync('git', ['commit', '-m', commitMessage], { cwd: options.cwd, stdio: 'pipe' });

            return { success: true, branch: branchName };
        } catch (error) {
            console.error('[sdk:session.applyPatch] error:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        } finally {
            if (patchPath) {
                try { fs.unlinkSync(patchPath); } catch (e) { /* ignore */ }
            }
        }
    })

    ipcMain.handle('sdk:session.stream.start', async (event, id: string, options?: StreamActivitiesOptions) => {
        for await (const item of jules.session(id).stream(options)) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:session.stream:${id}`, item)
        }
        send(event.sender, `sdk:session.stream.done:${id}`)
    })

    ipcMain.handle('sdk:session.history.start', async (event, id: string) => {
        for await (const item of jules.session(id).history()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:session.history:${id}`, item)
        }
        send(event.sender, `sdk:session.history.done:${id}`)
    })

    ipcMain.handle('sdk:session.updates.start', async (event, id: string) => {
        for await (const item of jules.session(id).updates()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:session.updates:${id}`, item)
        }
        send(event.sender, `sdk:session.updates.done:${id}`)
    })

    // ── activities ────────────────────────────────────────────────────────────────

    ipcMain.handle('sdk:activities.hydrate', async (_, id: string) =>
        serialize(await jules.session(id).activities.hydrate())
    )

    ipcMain.handle('sdk:activities.select', async (_, id: string, options?: SelectOptions) =>
        serialize(await jules.session(id).activities.select(options))
    )

    ipcMain.handle('sdk:activities.list', async (_, id: string, options?: ListOptions) =>
        serialize(await jules.session(id).activities.list(options))
    )

    ipcMain.handle('sdk:activities.get', async (_, id: string, activityId: string) =>
        serialize(await jules.session(id).activities.get(activityId))
    )

    ipcMain.handle('sdk:activities.history.start', async (event, id: string) => {
        for await (const item of jules.session(id).activities.history()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:activities.history:${id}`, item)
        }
        send(event.sender, `sdk:activities.history.done:${id}`)
    })

    ipcMain.handle('sdk:activities.updates.start', async (event, id: string) => {
        for await (const item of jules.session(id).activities.updates()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:activities.updates:${id}`, item)
        }
        send(event.sender, `sdk:activities.updates.done:${id}`)
    })

    ipcMain.handle('sdk:activities.stream.start', async (event, id: string) => {
        for await (const item of jules.session(id).activities.stream()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:activities.stream:${id}`, item)
        }
        send(event.sender, `sdk:activities.stream.done:${id}`)
    })

    // ── sources ───────────────────────────────────────────────────────────────────

    ipcMain.handle('sdk:sources.list', async (_) => {
        const sources = []
        for await (const src of jules.sources()) {
            sources.push(src)
        }
        return serialize(sources)
    })

    ipcMain.handle('sdk:sources.get', async (_, filter: { github: string }) =>
        serialize(await jules.sources.get(filter))
    )

    ipcMain.handle('sdk:sources.resolve', (_,  cwd?: string) =>
        resolveGitSource(cwd)
    )

    // ── artifact ──────────────────────────────────────────────────────────────────
    // MediaArtifact.save() — re-implemented via fs (platform dep can't cross IPC)

    ipcMain.handle('sdk:artifact.save', async (_, data: string, filepath: string) => {
        const resolved = path.resolve(filepath)
        await fs.promises.mkdir(path.dirname(resolved), { recursive: true })
        await fs.promises.writeFile(resolved, Buffer.from(data, 'base64'))
        return resolved
    })
}