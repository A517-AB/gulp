import {useCallback, useEffect, useMemo, useState} from 'react'
import {useOverview} from '@/store/overview'
import {useSnippets} from '@/hooks/use-snippets'
import {DynamicDropdown} from '@/ui/dynamic-dropdown'
import {SessionPicker} from './SessionPicker'
import {jules} from '@jules'
import {filesystem} from '@shared/bridge'
import type {FuseManifestItem} from '@shared/fuse'
import {fuseFilePath} from '@shared/fuse'
import type {Command} from '@shared/commands'

const TRIGGER_ITEMS = [
    {id: '@', label: '@ (snippet)', color: '#9061f9'},
    {id: '/', label: '/ (display)', color: '#0d9488'},
    {id: ':', label: ': (preview)', color: '#2563eb'},
    {id: '>', label: '> (script)', color: '#d97706'},
]

export function CommandsPanel() {
    const commands = useOverview(s => s.commands)
    const addCommand = useOverview(s => s.addCommand)
    const removeCommand = useOverview(s => s.removeCommand)
    const updateCommand = useOverview(s => s.updateCommand)
    const toggleCommand = useOverview(s => s.toggleCommand)
    const loadOverview = useOverview(s => s.load)

    const {items: snippets, saveItem: saveSnippet} = useSnippets()

    // New Command form state
    const [newTrigger, setNewTrigger] = useState<'@' | '/' | '>' | ':'>('@')
    const [newAlias, setNewAlias] = useState('')

    // New target states
    const [newSnippetId, setNewSnippetId] = useState('')
    const [newSessionId, setNewSessionId] = useState('')
    const [newScriptPath, setNewScriptPath] = useState('')

    // Helpers for creating new entities
    const [creating, setCreating] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    // Load commands on mount
    useEffect(() => {
        void loadOverview()
    }, [loadOverview])

    // Convert snippets list into dropdown items
    const snippetDropdownItems = useMemo(() => {
        return snippets.map(s => ({
            id: s.id,
            label: `${s.title ?? 'untitled'} (${s.languageId})`,
            color: '#9061f9',
        }))
    }, [snippets])

    // Add quick snippet
    const handleQuickSnippet = useCallback(async () => {
        const title = window.prompt('Enter snippet title:')
        if (!title) return
        const lang = window.prompt('Enter language (python, javascript, typescript, bash, pwsh):', 'typescript')
        if (!lang) return

        setCreating(true)
        try {
            const id = crypto.randomUUID()
            const file = fuseFilePath('snippet', lang, title)
            const item: FuseManifestItem = {
                id,
                title,
                languageId: lang,
                type: 'snippet',
                file,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            await saveSnippet(item, `// ${title}\n`)
            setNewSnippetId(id)
            setMsg(`Snippet "${title}" created.`)
            setTimeout(() => {
                setMsg(null)
            }, 3000)
        } catch (err) {
            console.error(err)
            setMsg('Failed to create snippet.')
        } finally {
            setCreating(false)
        }
    }, [saveSnippet])

    // Add quick script file
    const handleQuickScript = useCallback(async () => {
        const filename = window.prompt('Enter script name (e.g. hello.py):', 'script.py')
        if (!filename) return
        const filepath = `D:/fuse/scripts/${filename}`

        setCreating(true)
        try {
            if (!filesystem) throw new Error('filesystem api not ready')
            await filesystem.writeFile(filepath, '#!/usr/bin/env python\n# new python script\n')
            setNewScriptPath(filepath)
            setMsg(`Script created at ${filepath}`)
            setTimeout(() => {
                setMsg(null)
            }, 3000)
        } catch (err) {
            console.error(err)
            setMsg('Failed to write script file.')
        } finally {
            setCreating(false)
        }
    }, [])

    // Create quick session
    const handleQuickSession = useCallback(async () => {
        const prompt = window.prompt('Enter session initial prompt:', 'New automated session')
        if (!prompt) return

        setCreating(true)
        try {
            const res = await jules.session({prompt})
            const info = await res.info()
            setNewSessionId(res.id)
            setMsg(`Session "${info.title}" created.`)
            setTimeout(() => {
                setMsg(null)
            }, 3000)
        } catch (err) {
            console.error(err)
            setMsg('Failed to start Jules session.')
        } finally {
            setCreating(false)
        }
    }, [])

    // Handle new command submit
    const handleAddCommand = useCallback(async () => {
        if (!newAlias.trim()) {
            alert('Alias is required.')
            return
        }

        const commandId = `cmd_${newTrigger}_${Date.now()}`
        let newCmd: Command

        if (newTrigger === '@') {
            if (!newSnippetId) {
                alert('Please select or create a snippet.');
                return
            }
            newCmd = {
                id: commandId,
                trigger: '@',
                alias: newAlias.trim(),
                enabled: true,
                createdAt: Date.now(),
                snippetId: newSnippetId,
            }
        } else if (newTrigger === '>') {
            if (!newScriptPath.trim()) {
                alert('Script path is required.');
                return
            }
            newCmd = {
                id: commandId,
                trigger: '>',
                alias: newAlias.trim(),
                enabled: true,
                createdAt: Date.now(),
                script: newScriptPath.trim(),
                cwd: 'D:/fuse',
            }
        } else if (newTrigger === '/') {
            if (!newSessionId) {
                alert('Session ID is required.');
                return
            }
            newCmd = {
                id: commandId,
                trigger: '/',
                alias: newAlias.trim(),
                enabled: true,
                createdAt: Date.now(),
                sessionId: newSessionId,
            }
        } else {
            if (!newSessionId) {
                alert('Session ID is required.');
                return
            }
            newCmd = {
                id: commandId,
                trigger: ':',
                alias: newAlias.trim(),
                enabled: true,
                createdAt: Date.now(),
                sessionId: newSessionId,
            }
        }

        await addCommand(newCmd)
        setNewAlias('')
        setMsg('Command added.')
        setTimeout(() => {
            setMsg(null)
        }, 2000)
    }, [newTrigger, newAlias, newSnippetId, newSessionId, newScriptPath, addCommand])

    return (
        <div className="space-y-6 text-[11px] font-mono">
            {/* Existing commands */}
            <div className="space-y-4">
                <h4 className="text-3xs font-mono uppercase tracking-wider text-fg-dim">Existing Commands</h4>
                <div className="divide-y divide-hair">
                    {commands.map((cmd) => {
                        const currentTriggerMeta = TRIGGER_ITEMS.find(t => t.id === cmd.trigger)
                        return (
                            <div key={cmd.id} className="py-2.5 flex items-center justify-between gap-4">
                                {/* Left: toggle, symbol, alias */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={cmd.enabled}
                                        onChange={() => {
                                            void toggleCommand(cmd.id)
                                        }}
                                        className="accent-purple-500"
                                    />
                                    <span
                                        className="text-xs font-bold w-4 text-center"
                                        style={{color: currentTriggerMeta?.color}}
                                    >
                    {cmd.trigger}
                  </span>
                                    <input
                                        type="text"
                                        value={cmd.alias}
                                        onChange={(e) => {
                                            void updateCommand(cmd.id, {alias: e.target.value})
                                        }}
                                        className="bg-transparent border-none p-0 text-fg-primary font-mono text-[11px] outline-none w-20"
                                        placeholder="alias"
                                    />
                                </div>

                                {/* Middle: Target selection */}
                                <div className="flex-1 flex items-center justify-end gap-2 overflow-hidden">
                                    {cmd.trigger === '@' && (
                                        <DynamicDropdown
                                            items={snippetDropdownItems}
                                            value={cmd.snippetId}
                                            onChange={(val) => {
                                                void updateCommand(cmd.id, {snippetId: val})
                                            }}
                                            placeholder="Select snippet..."
                                            className="max-w-xs truncate"
                                        />
                                    )}
                                    {cmd.trigger === '>' && (
                                        <input
                                            type="text"
                                            value={cmd.script}
                                            onChange={(e) => {
                                                void updateCommand(cmd.id, {script: e.target.value})
                                            }}
                                            className="bg-hover border border-hair rounded px-2 py-1 text-[10px] text-fg-primary outline-none max-w-xs flex-1"
                                            placeholder="script path"
                                        />
                                    )}
                                    {(cmd.trigger === '/' || cmd.trigger === ':') && (
                                        <div className="w-48 shrink-0">
                                            <SessionPicker
                                                value={cmd.sessionId}
                                                onChange={(val) => {
                                                    void updateCommand(cmd.id, {sessionId: val})
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Right: Actions */}
                                <div className="shrink-0">
                                    <button
                                        onClick={() => {
                                            void removeCommand(cmd.id)
                                        }}
                                        className="text-fg-ghost hover:text-red-400 font-mono text-[10px] transition-colors px-1"
                                        title="Delete command"
                                    >
                                        delete
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Add New Command Form */}
            <div className="space-y-4 pt-4 border-t border-hair">
                <h4 className="text-3xs font-mono uppercase tracking-wider text-fg-dim">Add New Command</h4>

                {msg && (
                    <p className="text-[10px] text-purple-400 font-mono">{msg}</p>
                )}

                <div className="space-y-3 bg-surface p-3 border border-hair rounded">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-fg-secondary">Trigger Symbol</span>
                        <DynamicDropdown
                            items={TRIGGER_ITEMS}
                            value={newTrigger}
                            onChange={(val) => {
                                setNewTrigger(val as '@' | '/' | '>' | ':')
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-fg-secondary">Alias</span>
                        <input
                            type="text"
                            value={newAlias}
                            onChange={(e) => {
                                setNewAlias(e.target.value.replace(/\s+/g, ''))
                            }}
                            placeholder="e.g. run-tests"
                            className="bg-hover border border-hair rounded px-2 py-1 text-[10px] text-fg-primary outline-none focus:border-purple-500/40 text-right w-40 font-mono"
                        />
                    </div>

                    {/* Dynamic Target Picker based on newTrigger */}
                    {newTrigger === '@' && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-fg-secondary">Snippet</span>
                                <button
                                    type="button"
                                    disabled={creating}
                                    onClick={() => {
                                        void handleQuickSnippet()
                                    }}
                                    className="text-[9px] text-purple-400 hover:underline"
                                >
                                    + create new
                                </button>
                            </div>
                            <DynamicDropdown
                                items={snippetDropdownItems}
                                value={newSnippetId}
                                onChange={setNewSnippetId}
                                placeholder="Select snippet"
                            />
                        </div>
                    )}

                    {newTrigger === '>' && (
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-fg-secondary">Script File Path</span>
                                    <button
                                        type="button"
                                        disabled={creating}
                                        onClick={() => {
                                            void handleQuickScript()
                                        }}
                                        className="text-[9px] text-amber-500 hover:underline"
                                    >
                                        + create new
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={newScriptPath}
                                onChange={(e) => {
                                    setNewScriptPath(e.target.value)
                                }}
                                placeholder="D:/fuse/scripts/my_script.py"
                                className="w-full bg-hover border border-hair rounded px-2 py-1 text-[10px] text-fg-primary outline-none focus:border-purple-500/40 font-mono"
                            />
                        </div>
                    )}

                    {(newTrigger === '/' || newTrigger === ':') && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-fg-secondary">Jules Session</span>
                                <button
                                    type="button"
                                    disabled={creating}
                                    onClick={() => {
                                        void handleQuickSession()
                                    }}
                                    className="text-[9px] text-teal-400 hover:underline"
                                >
                                    + create new
                                </button>
                            </div>
                            <div className="w-48 shrink-0">
                                <SessionPicker
                                    value={newSessionId}
                                    onChange={setNewSessionId}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                void handleAddCommand()
                            }}
                            className="px-4 py-1.5 rounded border border-hair text-[10px] font-mono text-fg-secondary hover:text-fg-primary hover:border-subtle transition-colors"
                        >
                            Add Command
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
