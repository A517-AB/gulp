import { useState, useCallback, useEffect, useRef } from 'react'
import {terminal, filesystem, store} from '@shared/bridge'
import { useCommands } from '@/store/commands'
import { useStore } from '@/store/app'
import {executeAt, executeDisplay, executeTerminal, executePreview} from '@shared/commands'
import { CommandInput } from './CommandInput'
import { BlockDisplay } from './BlockDisplay'
import {TerminalPane} from './TerminalPane'
import { DiffViewer } from '@/ui/diff-viewer'
import type {AtCommand, DisplayCommand, TerminalCommand, PreviewCommand} from '@shared/commands'

type PanelMode = 'markdown' | 'terminal' | 'preview'


export function OverviewPage() {
    const commands = useCommands(s => s.commands)
    const load = useCommands(s => s.load)
    const sessionSnapshot = useStore(s => s.sessionSnapshot)
    const hydrateSession = useStore(s => s.hydrateSession)
    const selectSessionActivities = useStore(s => s.selectSessionActivities)
    const sendMessage = useStore(s => s.sendMessage)
    const subscribeActivity = useStore(s => s.subscribeActivity)

    useEffect(() => {
        void load()
    }, [load])

    const [markdown, setMarkdown] = useState<string | null>(null)
    const [previewDiff, setPreviewDiff] = useState<string | null>(null)
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [mode, setMode] = useState<PanelMode>('markdown')
    const [status, setStatus] = useState<string | null>(null)

    const unsubRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        return () => {
            if (unsubRef.current) {
                unsubRef.current()
            }
        }
    }, [])

    const handleDownloadFile = useCallback(async (filename: string) => {
        if (!activeSessionId) return
        try {
            const snapshot = await sessionSnapshot(activeSessionId)
            const matchedFile = snapshot.generatedFiles.find(f => f.path === filename)
            const defaultName = filename.split("/").pop() ?? "file"

            if (matchedFile) {
                if (filesystem) {
                    const savePath = await filesystem.showSaveDialog(defaultName)
                    if (!savePath) return // cancelled
                    await filesystem.writeFile(savePath, matchedFile.content)
                } else {
                    // Web fallback
                    const blob = new Blob([matchedFile.content], { type: "text/plain" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = defaultName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                }
            } else {
                // Not found in snapshot (possibly binary file like an image)
                if (filesystem && store) {
                    const cwd = await store.get(`session-cwd-${activeSessionId}`)
                    if (typeof cwd === "string" && cwd) {
                        const srcPath = `${cwd}/${filename}`
                        const exists = await filesystem.exists(srcPath)
                        if (exists) {
                            const savePath = await filesystem.showSaveDialog(defaultName)
                            if (!savePath) return // cancelled
                            await filesystem.copy(srcPath, savePath)
                            return
                        }
                    }
                }
                throw new Error(`Full content for ${filename} was not found in the session snapshot. Please apply the patch first to access binary files locally.`)
            }
        } catch (err) {
            console.error("[OverviewPage] failed to download file:", err)
            throw err
        }
    }, [activeSessionId, sessionSnapshot])

    const handlePreview = useCallback(async (command: PreviewCommand) => {
        if (unsubRef.current) {
            unsubRef.current()
            unsubRef.current = null
        }

        setStatus('refreshing...')
        const result = await executePreview({hydrate: hydrateSession, select: selectSessionActivities}, command)

        if (result.status === 'ok') {
            setPreviewDiff(result.patch)
            setActiveSessionId(command.sessionId)
            setMode('preview')
            setStatus(null)
        } else {
            setStatus(result.status === 'empty' ? 'no preview diff available' : (result.error ?? 'error'))
            setActiveSessionId(command.sessionId)
            setMode('preview')
            setPreviewDiff(null)
        }

        try {
            const unsub = subscribeActivity(command.sessionId, (activity) => {
                const artifacts = (activity as { artifacts?: { type?: string }[] }).artifacts ?? []
                const hasChangeSet = artifacts.some(art => art.type === 'changeSet')
                if (hasChangeSet) {
                    void executePreview({hydrate: hydrateSession, select: selectSessionActivities}, command)
                        .then(res => { if (res.status === 'ok') { setPreviewDiff(res.patch) } })
                }
            })
            unsubRef.current = unsub
        } catch (err) {
            console.warn('[OverviewPage] failed to start real-time updates watcher:', err)
        }
    }, [hydrateSession, selectSessionActivities, subscribeActivity])

    const handleDisplay = useCallback(async (command: DisplayCommand) => {
        setStatus('refreshing...')
        const result = await executeDisplay({hydrate: hydrateSession, select: selectSessionActivities}, command)
        if (result.status === 'ok') {
            setMarkdown(result.markdown)
            setMode('markdown')
            setStatus(null)
        } else {
            setStatus(result.status === 'empty' ? 'no messages yet' : (result.error ?? 'error'))
        }
    }, [hydrateSession, selectSessionActivities])

    const handleSend = useCallback(async (command: AtCommand, prompt: string) => {
        setStatus('sending...')
        const result = await executeAt(
            (sessionId, msg) => sendMessage(sessionId, msg),
            command,
            prompt,
        )
        if (result.status === 'sent') {
            setStatus('sent')
            setTimeout(() => { setStatus(null) }, 2000)
        } else {
            setStatus(result.error ?? 'error')
        }
    }, [sendMessage])

    const handleRun = useCallback((command: TerminalCommand) => {
        if (!terminal) {
            setStatus('no terminal');
            return
        }
        setMode('terminal')
        setStatus(null)
        const result = executeTerminal({start: terminal.start, input: terminal.input}, command)
        if (result.status === 'error') {
            setStatus(result.error ?? 'error running script')
        }
    }, [])

    return (
        <div className="flex flex-row h-full w-full overflow-hidden">

            {/* left: input anchored to bottom */}
            <div className="relative w-1/2 h-full overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 px-14 pb-10">
                    {status && (
                        <p className="pb-2 text-xs text-fg-ghost">{status}</p>
                    )}
                    <CommandInput
                        commands={commands}
                        onDisplay={command => {
                            void handleDisplay(command)
                        }}
                        onSend={(command, prompt) => {
                            void handleSend(command, prompt)
                        }}
                        onRun={handleRun}
                        onPreview={command => {
                            void handlePreview(command)
                        }}
                    />
                </div>
            </div>

            {/* right: panel */}
            <div className="flex-1 h-full overflow-hidden px-10 pt-16 pb-10">
                {mode === 'markdown' && markdown !== null && (
                    <div className="h-full overflow-y-auto" style={{scrollbarWidth: 'none'}}>
                        <BlockDisplay content={markdown}/>
                    </div>
                )}
                {mode === 'preview' && (
                    <div className="h-full overflow-y-auto" style={{scrollbarWidth: 'none'}}>
                        <DiffViewer
                            diff={previewDiff}
                            onDownloadFile={handleDownloadFile}
                            branch="main"
                        />
                    </div>
                )}
                <TerminalPane active={mode === 'terminal'}/>
            </div>

        </div>
    )
}
