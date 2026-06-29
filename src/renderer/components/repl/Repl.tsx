import {useCallback, useEffect, useRef} from 'react'
import {usePythonConsole} from '@/library/repl'
import {ConsoleState} from '@/library/repl/types/Console'
import {useReplStore} from '@/store/repl'

let seq = 0

export function Repl() {
    const {
        lines,
        input,
        history,
        histCursor,
        setLines,
        setInput,
        setHistory,
        setHistCursor,
        clearLines
    } = useReplStore()

    const inputRef = useRef<HTMLTextAreaElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    const {
        runPython,
        stdout,
        stderr,
        consoleState,
        isReady,
        isRunning,
        interruptExecution,
        isAwaitingInput,
        sendInput,
        prompt,
        getCompletions,
        banner
    } = usePythonConsole()

    const wasRunning = useRef(false)

    // Scroll to bottom on lines change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: 'instant'})
    }, [lines])

    // Show banner on startup if console is empty
    useEffect(() => {
        if (banner && lines.length === 0) {
            const next = banner.trimEnd().split('\n').map(text => ({id: seq++, text, kind: 'out' as const}))
            setLines(next)
        }
    }, [banner, lines.length, setLines])

    // Process execution outputs safely to avoid duplicate prints on remount
    useEffect(() => {
        if (wasRunning.current && !isRunning) {
            if (stdout) {
                const next = stdout.trimEnd().split('\n').map(text => ({id: seq++, text, kind: 'out' as const}))
                setLines(p => [...p, ...next])
            }
            if (stderr) {
                const next = stderr.trimEnd().split('\n').map(text => ({id: seq++, text, kind: 'err' as const}))
                setLines(p => [...p, ...next])
            }
        }
        wasRunning.current = isRunning
    }, [isRunning, stdout, stderr, setLines])

    const ps = isAwaitingInput
        ? prompt || '>>> '
        : consoleState === ConsoleState.incomplete
            ? '... '
            : '>>> '

    const submit = useCallback(async () => {
        if (!isReady || isRunning) return
        const code = input

        if (code.trim() === 'clear()' || code.trim() === 'clear') {
            clearLines()
            setInput('')
            return
        }

        setLines(p => [...p, {id: seq++, text: ps + code, kind: 'in'}])
        if (code.trim()) {
            setHistory(h => [code, ...h])
        }
        setHistCursor(-1)
        setInput('')

        if (isAwaitingInput) {
            sendInput(code)
        } else {
            await runPython(code)
        }
        inputRef.current?.focus()
    }, [input, isReady, isRunning, ps, isAwaitingInput, runPython, sendInput, setLines, setHistory, setHistCursor, setInput, clearLines])

    const onKey = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const {selectionStart, selectionEnd, value} = e.currentTarget

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void submit()
            return
        }

        if (e.key === 'Tab') {
            e.preventDefault()
            const textBefore = value.slice(0, selectionStart)
            const match = textBefore.match(/[\w\.]*$/)
            const prefix = match ? match[0] : ''

            if (prefix) {
                // Query python rlcompleter for live matches
                const completions = await getCompletions(prefix)
                if (completions && completions.length > 0) {
                    const first = completions[0]
                    if (completions.length === 1 && first !== undefined) {
                        const newText = value.slice(0, selectionStart - prefix.length) + first + value.slice(selectionEnd)
                        setInput(newText)
                        const newCursor = selectionStart - prefix.length + first.length
                        setTimeout(() => {
                            if (inputRef.current) {
                                inputRef.current.selectionStart = newCursor
                                inputRef.current.selectionEnd = newCursor
                            }
                        }, 0)
                    } else {
                        // Print matching options on screen, keep current input intact
                        const suggestions = completions.map(c => c.split('.').pop() || c).join('   ')
                        setLines(p => [...p, {id: seq++, text: suggestions, kind: 'out'}])
                    }
                    return
                }
            }

            // Default tab behavior: insert 4 spaces
            const newText = value.slice(0, selectionStart) + '    ' + value.slice(selectionEnd)
            setInput(newText)
            const newCursor = selectionStart + 4
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.selectionStart = newCursor
                    inputRef.current.selectionEnd = newCursor
                }
            }, 0)
            return
        }

        if (e.key === 'ArrowUp' && selectionStart === 0 && selectionEnd === 0) {
            e.preventDefault()
            if (history.length === 0) return
            const next = Math.min(histCursor + 1, history.length - 1)
            setHistCursor(next)
            setInput(history[next] ?? '')
            return
        }

        if (e.key === 'ArrowDown' && selectionStart === value.length) {
            e.preventDefault()
            const next = Math.max(histCursor - 1, -1)
            setHistCursor(next)
            setInput(next < 0 ? '' : (history[next] ?? ''))
            return
        }

        if (e.ctrlKey && e.key === 'c') {
            interruptExecution()
            setLines(p => [...p, {id: seq++, text: 'KeyboardInterrupt', kind: 'err'}])
            setInput('')
            setHistCursor(-1)
        }
    }

    return (
        <div
            className="flex flex-col h-full w-full overflow-hidden font-mono text-2xs"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {lines.map(l => (
                    <div
                        key={l.id}
                        className={
                            l.kind === 'err' ? 'text-destructive' :
                                l.kind === 'in' ? 'text-fg-muted' :
                                    'text-fg-primary'
                        }
                    >
                        {l.text}
                    </div>
                ))}

                {isReady && (
                    <div className="flex items-start gap-1">
                        <span className="text-fg-ghost shrink-0 select-none">{ps}</span>
                        <textarea
                            ref={inputRef}
                            value={input}
                            autoFocus
                            rows={1}
                            onChange={e => {
                                setInput(e.target.value)
                            }}
                            onKeyDown={onKey}
                            onInput={e => {
                                const t = e.currentTarget
                                t.style.height = 'auto'
                                t.style.height = `${t.scrollHeight}px`
                            }}
                            className="flex-1 resize-none bg-transparent text-fg-primary outline-none leading-relaxed"
                            style={{height: 'auto', minHeight: '1.25rem'}}
                        />
                    </div>
                )}

                <div ref={bottomRef}/>
            </div>
        </div>
    )
}
