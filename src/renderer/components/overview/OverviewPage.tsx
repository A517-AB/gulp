import { useState, useCallback, useEffect, useRef } from 'react'
import {sdkIpc, terminal, filesystem, store} from '@shared/bridge'
import { useCommands } from '@/store/commands'
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
            if (!sdkIpc) throw new Error("Jules SDK IPC is not available")
            const snapshot = await sdkIpc.session.snapshot(activeSessionId)
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
    }, [activeSessionId])

    const handlePreview = useCallback(async (command: PreviewCommand) => {
        if (!sdkIpc) {
            setStatus('no connection')
            return
        }

        if (unsubRef.current) {
            unsubRef.current()
            unsubRef.current = null
        }

        setStatus('refreshing...')
        const result = await executePreview({hydrate: sdkIpc.session.hydrate, select: sdkIpc.session.select}, command)

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
            const unsub = sdkIpc.activities.updates(command.sessionId, (activity) => {
                const artifacts = (activity as { artifacts?: { type?: string }[] }).artifacts ?? []
                let hasChangeSet = false
                for (const art of artifacts) {
                    if (art.type === 'changeSet') {
                        hasChangeSet = true
                        break
                    }
                }
                if (hasChangeSet && sdkIpc) {
                    void executePreview({hydrate: sdkIpc.session.hydrate, select: sdkIpc.session.select}, command)
                        .then(res => {
                            if (res.status === 'ok') {
                                setPreviewDiff(res.patch)
                            }
                        })
                }
            })
            unsubRef.current = unsub
        } catch (err) {
            console.warn('[OverviewPage] failed to start real-time updates watcher:', err)
        }
    }, [])

    const handleDisplay = useCallback(async (command: DisplayCommand) => {
        if (!sdkIpc) {
            setStatus('no connection');
            return
        }
        setStatus('refreshing...')
        const result = await executeDisplay({hydrate: sdkIpc.session.hydrate, select: sdkIpc.session.select}, command)
        if (result.status === 'ok') {
            setMarkdown(result.markdown)
            setMode('markdown')
            setStatus(null)
        } else {
            setStatus(result.status === 'empty' ? 'no messages yet' : (result.error ?? 'error'))
        }
    }, [])

    const handleSend = useCallback(async (command: AtCommand, prompt: string) => {
        if (!sdkIpc) {
            setStatus('no connection');
            return
        }
        setStatus('sending...')
        const result = await executeAt(sdkIpc.session.send, command, prompt)
        if (result.status === 'sent') {
            setStatus('sent')
            setTimeout(() => {
                setStatus(null)
            }, 2000)
        } else {
            setStatus(result.error ?? 'error')
        }
    }, [])

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
