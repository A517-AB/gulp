import {useCallback, useEffect, useRef, useState} from 'react';
import type {PyodideInterface} from 'pyodide';
import type {PyProxy, PyProxyWithGet} from 'pyodide/ffi';
import type {LogEntry} from '@/store/repl';
import {useReplStore} from '@/store/repl';
import {useTheme} from '@renderer/providers/theme';
import {usePythonHighlight} from './use-python-highlight';

interface CompletionResult {
    0: { toJs: () => string[] };
    1: number;
    destroy: () => void;
}

interface PyodideConsoleInstance {
    stdout_callback: (s: string) => void;
    stderr_callback: (s: string) => void;
    buffer: { clear: () => void };
    push: (line: string) => {
        syntax_check: 'syntax-error' | 'incomplete' | 'complete';
        formatted_error: string;
        destroy: () => void;
    };
    complete: (text: string) => CompletionResult;
    destroy?: () => void;
}

interface PyConsoleModule {
    repr_shorten: { callKwargs: (val: unknown, options: { separator: string }) => string };
    BANNER: string;
    PyodideConsole: (globals: unknown) => PyodideConsoleInstance;
}

// Module-level caches — survive component unmounts and hot reloads
let cachedPyodide: PyodideInterface | null = null;
let cachedPyconsole: PyodideConsoleInstance | null = null;
let cachedAwaitFutFn: ((fut: unknown) => Promise<[unknown]>) | null = null;
let cachedReprShorten: { callKwargs: (val: unknown, options: { separator: string }) => string } | null = null;
let cachedInterruptBuffer: Uint8Array | null = null;

let activeStdoutCallback: ((s: string) => void) | null = null;
let activeStderrCallback: ((s: string) => void) | null = null;

// Reading through a function (instead of the bare module binding) stops
// TypeScript from narrowing these as non-null for the rest of an async
// function — they can be nulled out mid-await by other event handlers.
function getCachedPyconsole(): PyodideConsoleInstance | null {
    return cachedPyconsole;
}

function getCachedAwaitFutFn(): ((fut: unknown) => Promise<[unknown]>) | null {
    return cachedAwaitFutFn;
}

function isProxyAlive(proxy: unknown): boolean {
    if (!proxy || typeof proxy !== 'object') return false;
    try {
        return typeof (proxy as { type: string }).type === 'string';
    } catch {
        return false;
    }
}

function longestCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    return strings.reduce((a, b) => {
        let idx = 0;
        while (idx < a.length && idx < b.length && a[idx] === b[idx]) idx++;
        return a.slice(0, idx);
    });
}

export function Repl() {
    const {logs, setLogs, clearLogs, history, setHistory} = useReplStore();
    const {theme} = useTheme();
    const [input, setInput] = useState('');
    const [prompt, setPrompt] = useState('>>> ');
    const [ready, setReady] = useState(() => !!cachedPyodide && isProxyAlive(cachedPyconsole));

    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const historyIndexRef = useRef<number | null>(null);
    const lineBufferRef = useRef('');
    const isDisposedRef = useRef(false);

    // Auto-scroll on new output
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const initPyodide = useCallback(async () => {
        try {
            const {loadPyodide} = await import('pyodide');
            const py = await loadPyodide({indexURL: './pyodide/'});
            if (isDisposedRef.current) return;

            cachedPyodide = py;

            // Pyodide's WASM runtime can die outright (distinct from normal Python
            // exceptions, which `pyconsole.push` already handles) — self-heal by
            // dropping the caches so the next visit boots a fresh instance.
            (py as unknown as { _api: { on_fatal?: (e: unknown) => void } })._api.on_fatal = (e) => {
                if (isDisposedRef.current) return;
                const err = e as { name?: string; message?: string };
                const msg = err.name === 'Exit'
                    ? `Pyodide exited: ${String(e)}`
                    : `Pyodide has suffered a fatal error: ${err.message ?? String(e)}`;
                setLogs((prev) => [...prev, {type: 'error', text: msg}]);
                cachedPyodide = null;
                cachedPyconsole = null;
                cachedAwaitFutFn = null;
                cachedReprShorten = null;
                setReady(false);
            };

            const {PyodideConsole, repr_shorten} =
                py.pyimport('pyodide.console') as unknown as PyConsoleModule;

            cachedReprShorten = repr_shorten;

            const globals = py.globals as PyProxyWithGet;
            const dictConstructor = globals.get('dict') as () => PyProxy;
            const namespace = dictConstructor();

            const awaitFutFn = py.runPython(
                `
import builtins
from pyodide.ffi import to_js
async def await_fut(fut):
    res = await fut
    if res is not None:
        builtins._ = res
    return to_js([res], depth=1)
await_fut
`,
                {globals: namespace}
            ) as (fut: unknown) => Promise<[unknown]>;

            namespace.destroy();
            cachedAwaitFutFn = awaitFutFn;

            const pyconsole = PyodideConsole(py.globals);
            cachedPyconsole = pyconsole;

            pyconsole.stdout_callback = (s: string) => {
                activeStdoutCallback?.(s);
            };
            pyconsole.stderr_callback = (s: string) => {
                activeStderrCallback?.(s);
            };

            if (logs.length === 0) {
                // start clean — no banner
            }

            // Wire up interrupt buffer for real Ctrl+C (works for async code;
            // tight sync loops still need a worker)
            try {
                if (!cachedInterruptBuffer) {
                    const buf = new SharedArrayBuffer(1);
                    cachedInterruptBuffer = new Uint8Array(buf);
                }
                py.setInterruptBuffer(cachedInterruptBuffer);
            } catch {
                // SharedArrayBuffer unavailable — needs COOP/COEP headers
            }

            setReady(true);
        } catch (err) {
            if (!isDisposedRef.current) {
                setLogs((prev) => [
                    ...prev,
                    {type: 'error', text: `Failed to initialize: ${String(err)}`},
                ]);
                setReady(true);
            }
        }
    }, [logs.length, setLogs]);

    useEffect(() => {
        isDisposedRef.current = false;

        activeStdoutCallback = (s: string) => {
            if (isDisposedRef.current) return;
            setLogs((prev) => {
                const last = prev[prev.length - 1];
                if (last?.type === 'stdout') {
                    return [...prev.slice(0, -1), {...last, text: last.text + s}];
                }
                return [...prev, {type: 'stdout', text: s}];
            });
        };

        activeStderrCallback = (s: string) => {
            if (isDisposedRef.current) return;
            setLogs((prev) => {
                const last = prev[prev.length - 1];
                if (last?.type === 'stderr') {
                    return [...prev.slice(0, -1), {...last, text: last.text + s}];
                }
                return [...prev, {type: 'stderr', text: s}];
            });
        };

        const consoleInstance = cachedPyconsole;
        if (cachedPyodide && consoleInstance && isProxyAlive(consoleInstance)) {
            consoleInstance.stdout_callback = (s: string) => {
                activeStdoutCallback?.(s);
            };
            consoleInstance.stderr_callback = (s: string) => {
                activeStderrCallback?.(s);
            };
            setReady(true);
        } else {
            void initPyodide();
        }

        return () => {
            isDisposedRef.current = true;
            activeStdoutCallback = null;
            activeStderrCallback = null;
        };
    }, [initPyodide, setLogs]);

    const handleProxyError = useCallback(
        (err: unknown) => {
            if (String(err).includes('destroyed')) {
                cachedPyodide = null;
                cachedPyconsole = null;
                cachedAwaitFutFn = null;
                cachedReprShorten = null;
                setReady(false);
                void initPyodide();
                return true;
            }
            return false;
        },
        [initPyodide]
    );

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const raw = e.clipboardData.getData('text');
        if (!/^(>>> |\.\.\. )/m.test(raw)) return; // nothing to sanitize — let default paste happen

        e.preventDefault();
        const cleaned = raw
            .split('\n')
            .map((line) => line.replace(/^(>>> |\.\.\. )/, ''))
            .join('\n');

        const el = textareaRef.current;
        const start = el?.selectionStart ?? input.length;
        const end = el?.selectionEnd ?? input.length;
        const next = input.slice(0, start) + cleaned + input.slice(end);
        setInput(next);
        setTimeout(() => {
            el?.setSelectionRange(start + cleaned.length, start + cleaned.length);
        }, 0);
    };

    const addToHistory = (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;
        setHistory((prev) => {
            if (prev[prev.length - 1] === trimmed) return prev;
            return [...prev, trimmed];
        });
        historyIndexRef.current = null;
    };

    const handleTabCompletion = () => {
        if (!cachedPyconsole) return;
        const el = textareaRef.current;
        if (!el) return;
        const cursorIdx = el.selectionStart;
        const source = input.slice(0, cursorIdx);
        if (!source.trim() || /[([{\s]$/.test(source)) return;

        try {
            const result = cachedPyconsole.complete(source);
            const completions = result[0].toJs();
            const start = result[1];
            result.destroy();

            const currentWord = source.slice(start);
            if (!currentWord.trim() || /^\d+$/.test(currentWord)) return;

            if (completions.length === 1) {
                const c = completions[0];
                if (c === undefined) return;
                const filled = input.slice(0, start) + c + input.slice(cursorIdx);
                setInput(filled);
                setTimeout(() => {
                    el.setSelectionRange(start + c.length, start + c.length);
                }, 0);
            } else if (completions.length > 1) {
                const prefix = longestCommonPrefix(completions);
                if (prefix.length > currentWord.length) {
                    setInput(input.slice(0, start) + prefix + input.slice(cursorIdx));
                } else {
                    setLogs((prev) => [
                        ...prev,
                        {type: 'stdout', text: completions.slice(0, 200).join('  ')},
                    ]);
                }
            }
        } catch (err) {
            if (!handleProxyError(err)) {
                setLogs((prev) => [...prev, {type: 'error', text: `Tab error: ${String(err)}`}]);
            }
        }
    };

    const executeLine = async (line: string) => {
        if (!cachedPyconsole || !cachedAwaitFutFn) return;

        if (line.trim() === 'clear') {
            clearLogs();
            return;
        }

        const lines = line.replace(/\u00a0/g, ' ').split('\n');

        for (const singleLine of lines) {
            const pyconsole = getCachedPyconsole();
            const awaitFut = getCachedAwaitFutFn();
            if (!pyconsole || !awaitFut) break;

            setLogs((prev) => [...prev, {type: 'input', text: prompt + singleLine}]);

            const fullStatement = lineBufferRef.current
                ? lineBufferRef.current + '\n' + singleLine
                : singleLine;

            try {
                const fut = pyconsole.push(singleLine);

                switch (fut.syntax_check) {
                    case 'syntax-error':
                        setLogs((prev) => [...prev, {type: 'error', text: fut.formatted_error.trimEnd()}]);
                        setPrompt('>>> ');
                        lineBufferRef.current = '';
                        addToHistory(fullStatement);
                        fut.destroy();
                        break;

                    case 'incomplete':
                        setPrompt('... ');
                        lineBufferRef.current = fullStatement;
                        break;

                    case 'complete':
                        setPrompt('>>> ');
                        lineBufferRef.current = '';
                        addToHistory(fullStatement);
                        try {
                            const results = await awaitFut(fut);
                            const value = results[0];
                            if (value !== undefined && cachedReprShorten) {
                                const out = cachedReprShorten.callKwargs(value, {
                                    separator: '\n<output truncated>\n',
                                });
                                setLogs((prev) => [...prev, {type: 'result', text: out}]);
                            }
                            try {
                                (value as { destroy?: () => void }).destroy?.();
                            } catch {
                                // already destroyed
                            }
                        } catch (e) {
                            const msg = fut.formatted_error || (e as Error).message;
                            setLogs((prev) => [...prev, {type: 'error', text: msg.trimEnd()}]);
                        } finally {
                            fut.destroy();
                        }
                        break;
                }
            } catch (err) {
                if (!handleProxyError(err)) {
                    setLogs((prev) => [...prev, {type: 'error', text: `Error: ${String(err)}`}]);
                }
                break;
            }
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const cmd = input;
            setInput('');
            void executeLine(cmd);
        } else if (e.key === 'ArrowUp') {
            if (textareaRef.current?.selectionStart !== 0) return;
            e.preventDefault();
            if (history.length === 0) return;
            const next =
                historyIndexRef.current === null
                    ? history.length - 1
                    : Math.max(0, historyIndexRef.current - 1);
            historyIndexRef.current = next;
            setInput(history[next] ?? '');
        } else if (e.key === 'ArrowDown') {
            if (textareaRef.current?.selectionStart !== input.length) return;
            e.preventDefault();
            if (historyIndexRef.current === null) return;
            const next = historyIndexRef.current + 1;
            if (next >= history.length) {
                historyIndexRef.current = null;
                setInput('');
            } else {
                historyIndexRef.current = next;
                setInput(history[next] ?? '');
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleTabCompletion();
        } else if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            // Signal SIGINT into the interrupt buffer so Python's bytecode
            // checker picks it up between instructions (async code, sleep, etc)
            if (cachedInterruptBuffer) {
                cachedInterruptBuffer[0] = 2; // SIGINT
                setTimeout(() => {
                    if (cachedInterruptBuffer) cachedInterruptBuffer[0] = 0;
                }, 100);
            }
            if (cachedPyconsole) {
                try {
                    cachedPyconsole.buffer.clear();
                } catch (err) {
                    if (handleProxyError(err)) return;
                }
            }
            lineBufferRef.current = '';
            setPrompt('>>> ');
            setLogs((prev) => [
                ...prev,
                {type: 'input', text: prompt + input + '^C'},
                {type: 'error', text: 'KeyboardInterrupt'},
            ]);
            setInput('');
        }
    };

    const logClass = (type: LogEntry['type']): string => {
        switch (type) {
            case 'input':
                return 'text-fg-primary';
            case 'result':
                return 'text-fg-secondary';
            case 'stderr':
            case 'error':
                return 'text-fg-muted';
            case 'info':
                return 'text-fg-ghost';
            default:
                return 'text-fg-secondary';
        }
    };

    const inputTokens = usePythonHighlight(input, theme);

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto p-4 font-mono text-sm cursor-text select-text"
            onClick={() => {
                if (!window.getSelection()?.toString()) {
                    textareaRef.current?.focus();
                }
            }}
        >
            <pre className="whitespace-pre-wrap break-words m-0 bg-transparent">
                {logs.map((log, i) => (
                    <code key={i} className={`block bg-transparent p-0 rounded-none ${logClass(log.type)}`}>
                        {log.text}
                    </code>
                ))}
                {ready && (
                    <div className="flex items-start">
                        <code className="text-fg-ghost select-none whitespace-pre shrink-0">
                            {prompt}
                        </code>
                        <div className="relative flex-1 min-w-0">
                            {/* Highlighted mirror — sizes the wrapper, textarea overlays it */}
                            <pre
                                aria-hidden
                                className={`whitespace-pre-wrap break-words m-0 p-0 rounded-none bg-transparent font-mono text-xs leading-relaxed pointer-events-none ${inputTokens ? '' : 'text-fg-primary'}`}
                            >
                                {inputTokens
                                    ? inputTokens.map((line, i) => (
                                        <span key={i}>
                                            {line.map((tok, j) => (
                                                <span key={j} style={{color: tok.color ?? 'inherit'}}>
                                                    {tok.content}
                                                </span>
                                            ))}
                                            {i < inputTokens.length - 1 ? '\n' : null}
                                        </span>
                                    ))
                                    : input}
                                {'\u200b'}
                            </pre>
                            <textarea
                                ref={textareaRef}
                                className="absolute inset-0 w-full h-full bg-transparent border-none outline-none ring-0 resize-none overflow-hidden text-transparent caret-fg-primary font-mono text-xs leading-relaxed p-0 m-0"
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                }}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                autoFocus
                                spellCheck={false}
                                autoCapitalize="off"
                                autoCorrect="off"
                            />
                        </div>
                    </div>
                )}
            </pre>
        </div>
    );
}
