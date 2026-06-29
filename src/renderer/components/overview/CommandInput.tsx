import {type KeyboardEvent, useCallback, useMemo, useState} from 'react'
import {AnimatePresence} from 'framer-motion'
import type {AtCommand, Command, DisplayCommand, PreviewCommand, TerminalCommand} from '@shared/commands'
import {isParseOk, parseInput} from '@shared/commands'
import {useOverview} from '@/store/overview'
import {GhostInput} from './GhostInput'
import {CommandMenu} from './CommandMenu'
import {HistoryPanel} from './HistoryPanel'
import {cn} from '@/utils'

type PanelMode = 'none' | 'commands' | 'history'

const TRIGGER_CHARS: string[] = ['/', '@', '>', ':']

interface Props {
    commands: Command[]
    onDisplay: (command: DisplayCommand) => void
    onSend: (command: AtCommand) => void
    onRun: (command: TerminalCommand) => void
    onPreview: (command: PreviewCommand) => void
    className?: string
}


export function CommandInput({commands, onDisplay, onSend, onRun, onPreview, className}: Props) {
    const [input, setInput] = useState('')
    const [panelMode, setPanelMode] = useState<PanelMode>('none')
    const [activeIndex, setIndex] = useState(0)

    const history = useOverview(s => s.history)
    const pushHistory = useOverview(s => s.pushHistory)
    const removeHistory = useOverview(s => s.removeHistory)

    const closePanel = useCallback(() => {
        setPanelMode('none');
        setIndex(0)
    }, [])

    const visibleCommands = useMemo(() => {
        if (panelMode !== 'commands') return []
        const trigger = input[0]
        if (!trigger) return []
        const query = input.slice(1).toLowerCase()
        return commands.filter(c =>
            c.trigger === trigger && c.enabled && (!query || c.alias.toLowerCase().startsWith(query))
        )
    }, [panelMode, input, commands])

    const selectCommand = useCallback((cmd: Command) => {
        if (cmd.trigger === '/') {
            onDisplay(cmd)
            setInput('')
            closePanel()
        } else if (cmd.trigger === '>') {
            onRun(cmd)
            setInput('')
            closePanel()
        } else if (cmd.trigger === ':') {
            onPreview(cmd)
            setInput('')
            closePanel()
        } else {
            onSend(cmd)
            setInput('')
            closePanel()
        }
    }, [onDisplay, onRun, onPreview, onSend, closePanel])

    const handleChange = useCallback((val: string) => {
        setInput(val)
        const trigger = val[0]
        const isTriggerOnly = trigger !== undefined && TRIGGER_CHARS.includes(trigger) && !val.includes(' ')
        if (isTriggerOnly) {
            setPanelMode('commands')
            setIndex(0)
        } else if (panelMode === 'commands') {
            closePanel()
        }
        if (panelMode === 'history') closePanel()
    }, [panelMode, closePanel])

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (panelMode === 'commands') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex(i => Math.min(i + 1, visibleCommands.length - 1));
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex(i => Math.max(i - 1, 0));
                return
            }
            if ((e.key === 'Enter' || e.key === 'Tab') && visibleCommands.length > 0) {
                e.preventDefault()
                const sel = visibleCommands[activeIndex] ?? visibleCommands[0]
                if (sel) selectCommand(sel)
                return
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closePanel();
                return
            }
        }

        if (panelMode === 'history') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex(i => Math.min(i + 1, history.length - 1));
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex(i => Math.max(i - 1, 0));
                return
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                const sel = history[activeIndex]
                if (sel) {
                    setInput(sel.text);
                    closePanel()
                }
                return
            }
            if (e.key === 'Delete' && e.shiftKey) {
                e.preventDefault()
                const sel = history[activeIndex]
                if (sel) {
                    void removeHistory(sel.id);
                    setIndex(i => Math.max(0, i - 1))
                }
                return
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closePanel();
                return
            }
        }

        if (e.key === 'ArrowUp' && input === '' && panelMode === 'none' && history.length > 0) {
            e.preventDefault()
            setPanelMode('history')
            setIndex(0)
            return
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const parsed = parseInput(input.trim(), commands)
            if (!isParseOk(parsed)) return

            if (parsed.value.trigger === '@') {
                onSend(parsed.value.command)
            } else if (parsed.value.trigger === '/') {
                onDisplay(parsed.value.command)
            } else if (parsed.value.trigger === '>') {
                onRun(parsed.value.command)
            } else {
                onPreview(parsed.value.command)
            }

            void pushHistory(input.trim())
            setInput('')
            closePanel()
        }
    }, [panelMode, visibleCommands, history, activeIndex, input, commands,
        selectCommand, removeHistory, onSend, onDisplay, onRun, onPreview, pushHistory, closePanel])

    return (
        <div className={cn('relative', className)}>
            <AnimatePresence>
                {panelMode === 'commands' && visibleCommands.length > 0 && (
                    <CommandMenu
                        key="commands"
                        commands={visibleCommands}
                        activeIndex={activeIndex}
                        onSelect={selectCommand}
                    />
                )}
                {panelMode === 'history' && history.length > 0 && (
                    <HistoryPanel
                        key="history"
                        entries={history}
                        activeIndex={activeIndex}
                        onSelect={e => {
                            setInput(e.text);
                            closePanel()
                        }}
                        onRemove={id => {
                            void removeHistory(id)
                        }}
                    />
                )}
            </AnimatePresence>
            <GhostInput
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder=""
            />
        </div>
    )
}
