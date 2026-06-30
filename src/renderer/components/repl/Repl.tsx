import {useCallback, useEffect, useRef, useState} from 'react';
import type {PyodideInterface} from 'pyodide';
import type {PyProxy, PyProxyWithGet} from 'pyodide/ffi';

interface CompletionResult {
    0: {
        toJs: () => string[];
    };
    1: number;
    destroy: () => void;
}

interface PyodideConsoleInstance {
    stdout_callback: (s: string) => void;
    stderr_callback: (s: string) => void;
    buffer: {
        clear: () => void;
    };
    push: (line: string) => {
        syntax_check: 'syntax-error' | 'incomplete' | 'complete';
        formatted_error: string;
        destroy: () => void;
    };
    complete: (text: string) => CompletionResult;
    destroy?: () => void;
}

interface PyConsoleModule {
    repr_shorten: {
        callKwargs: (val: unknown, options: { separator: string }) => string;
    };
    BANNER: string;
    PyodideConsole: (globals: unknown) => PyodideConsoleInstance;
}

export interface LogEntry {
    type: 'input' | 'stdout' | 'stderr' | 'result' | 'error' | 'info';
    text: string;
}

// Global cached instances to survive unmounting / page navigation
let cachedPyodide: PyodideInterface | null = null;
let cachedPyconsole: PyodideConsoleInstance | null = null;
let cachedAwaitFutFn: ((fut: unknown) => Promise<[unknown]>) | null = null;
let cachedReprShorten: { callKwargs: (val: unknown, options: { separator: string }) => string } | null = null;
let cachedLogs: LogEntry[] = [];
let cachedCommandHistory: string[] = [];

// Load cached command history once at startup
try {
    const saved = localStorage.getItem('0_commands');
    if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
            cachedCommandHistory = parsed as string[];
        }
    }
} catch (e) {
    console.error('Failed to load history:', e);
}

// Helper to safely check if a Pyodide PyProxy is still active/alive.
// Accessing the 'type' getter on a destroyed proxy will throw an error.
function isProxyAlive(proxy: unknown): boolean {
    if (!proxy || typeof proxy !== 'object') return false;
    try {
        // 'type' is a getter on PyProxy returning a string (e.g. 'module' or class name)
        return typeof (proxy as { type: string }).type === 'string';
    } catch {
        return false;
    }
}

// Active callback refs to route stdout/stderr to the currently mounted component
let activeStdoutCallback: ((s: string) => void) | null = null;
let activeStderrCallback: ((s: string) => void) | null = null;

export function Repl() {
    const [logs, setLogsState] = useState<LogEntry[]>(cachedLogs);
    const [inputVal, setInputVal] = useState('');
    const [prompt, setPrompt] = useState('>>> ');
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
        cachedPyodide && isProxyAlive(cachedPyconsole) ? 'ready' : 'loading'
    );
    const [errorMessage, setErrorMessage] = useState('');

    const logsContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyIndexRef = useRef<number | null>(null);
    const lineBufferRef = useRef<string>('');
    const isDisposedRef = useRef(false);

    // Helper to update logs state and the global cache
    const setLogs = (updater: LogEntry[] | ((prev: LogEntry[]) => LogEntry[])) => {
        setLogsState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            cachedLogs = next;
            return next;
        });
    };

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Initialize Pyodide VM
    const initPyodide = useCallback(async () => {
        setStatus('loading');
        try {
            const {loadPyodide} = await import('pyodide');
            const py = await loadPyodide({
                indexURL: '/pyodide/',
            });

            if (isDisposedRef.current) return;

            cachedPyodide = py;

            const {BANNER, PyodideConsole, repr_shorten} =
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

            // Initialize welcome banner logs if logs are currently empty
            setLogs((prev) => {
                if (prev.length === 0) {
                    return [
                        {type: 'info', text: `🐍 Welcome to Pyodide ${py.version} terminal emulator`},
                        {type: 'info', text: BANNER}
                    ];
                }
                return prev;
            });
            setStatus('ready');
        } catch (err) {
            if (!isDisposedRef.current) {
                setStatus('error');
                setErrorMessage(String(err));
                setLogs((prev) => [
                    ...prev,
                    {type: 'error', text: `❌ Error initializing Pyodide: ${String(err)}`}
                ]);
            }
        }
    }, []);

    // Handle initial load or caching logic
    useEffect(() => {
        isDisposedRef.current = false;

        // Route globals stdout/stderr callbacks to this component's local setters
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
            // Bind the active callbacks to the cached console
            consoleInstance.stdout_callback = (s: string) => {
                activeStdoutCallback?.(s);
            };
            consoleInstance.stderr_callback = (s: string) => {
                activeStderrCallback?.(s);
            };
            setStatus('ready');
        } else {
            void initPyodide();
        }

        return () => {
            isDisposedRef.current = true;
            activeStdoutCallback = null;
            activeStderrCallback = null;
        };
    }, [initPyodide]);

    // Self-healing check: Clears cache and triggers reinit if Pyodide instances are destroyed
    const handleProxyError = useCallback((err: unknown) => {
        const errStr = String(err);
        if (errStr.includes('destroyed')) {
            console.warn('Detected destroyed Pyodide instance. Re-initializing...');
            cachedPyodide = null;
            cachedPyconsole = null;
            cachedAwaitFutFn = null;
            cachedReprShorten = null;
            void initPyodide();
            return true;
        }
        return false;
    }, [initPyodide]);

    const addToCommandHistory = (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;
        const last = cachedCommandHistory[cachedCommandHistory.length - 1];
        if (last !== trimmed) {
            cachedCommandHistory.push(trimmed);
            try {
                localStorage.setItem('0_commands', JSON.stringify(cachedCommandHistory));
            } catch (e) {
                console.error('Failed to save history:', e);
            }
        }
    };

    const longestCommonPrefix = (strings: string[]): string => {
        if (strings.length === 0) return '';
        return strings.reduce((a, b) => {
            let idx = 0;
            while (idx < a.length && idx < b.length && a[idx] === b[idx]) idx++;
            return a.slice(0, idx);
        });
    };

    const handleTabCompletion = () => {
        if (!cachedPyconsole) return;
        const input = inputRef.current;
        if (!input) return;

        const cursorIdx = input.selectionStart ?? 0;
        const sourceToComplete = inputVal.slice(0, cursorIdx);
        if (!sourceToComplete.trim()) return;
        if (/[([{]\s*$/.test(sourceToComplete)) return;

        try {
            const completionResult = cachedPyconsole.complete(sourceToComplete);
            const completions = completionResult[0].toJs();
            const start = completionResult[1];
            completionResult.destroy();

            const currentWord = sourceToComplete.slice(start);
            if (!currentWord.trim() || /^\d+$/.test(currentWord.trim())) return;

            const firstCompletion = completions[0];
            if (completions.length === 1 && firstCompletion) {
                const newBuf = inputVal.slice(0, start) + firstCompletion + inputVal.slice(cursorIdx);
                setInputVal(newBuf);
                setTimeout(() => {
                    input.setSelectionRange(start + firstCompletion.length, start + firstCompletion.length);
                }, 0);
            } else if (completions.length > 1) {
                const prefix = longestCommonPrefix(completions);
                if (prefix.length > currentWord.length) {
                    const newBuf = inputVal.slice(0, start) + prefix + inputVal.slice(cursorIdx);
                    setInputVal(newBuf);
                    setTimeout(() => {
                        input.setSelectionRange(start + prefix.length, start + prefix.length);
                    }, 0);
                } else {
                    const displayCompletions = completions.slice(0, 200);
                    let text = displayCompletions.join('  ');
                    if (completions.length > 200) {
                        text += `\n... and ${completions.length - 200} more`;
                    }
                    setLogs((prev) => [...prev, {type: 'stdout', text}]);
                }
            }
        } catch (err) {
            if (!handleProxyError(err)) {
                setLogs((prev) => [...prev, {type: 'error', text: `Autocomplete error: ${String(err)}`}]);
            }
        }
    };

    const executeLine = async (line: string) => {
        if (!cachedPyconsole || !cachedAwaitFutFn) return;
        const cleanedLine = line.replace(/\u00a0/g, ' ');

        if (cleanedLine === 'clear') {
            setLogs([]);
            return;
        }

        // Add to input logs history
        setLogs((prev) => [...prev, {type: 'input', text: prompt + line}]);

        // Build multi-line statement if needed
        const fullStatement = lineBufferRef.current
            ? lineBufferRef.current + '\n' + cleanedLine
            : cleanedLine;

        try {
            const fut = cachedPyconsole.push(cleanedLine);

            switch (fut.syntax_check) {
                case 'syntax-error':
                    setLogs((prev) => [
                        ...prev,
                        {type: 'error', text: fut.formatted_error.trimEnd()}
                    ]);
                    setPrompt('>>> ');
                    lineBufferRef.current = '';
                    addToCommandHistory(fullStatement);
                    historyIndexRef.current = null;
                    fut.destroy();
                    break;

                case 'incomplete':
                    setPrompt('... ');
                    lineBufferRef.current = fullStatement;
                    break;

                case 'complete':
                    setPrompt('>>> ');
                    lineBufferRef.current = '';
                    addToCommandHistory(fullStatement);
                    historyIndexRef.current = null;
                    try {
                        const wrapped = cachedAwaitFutFn(fut);
                        const results = await wrapped;
                        const value = results[0];
                        if (value !== undefined) {
                            if (cachedReprShorten) {
                                const output = cachedReprShorten.callKwargs(value, {
                                    separator: '\n<long output truncated>\n',
                                });
                                setLogs((prev) => [...prev, {type: 'result', text: output}]);
                            }
                        }
                        if (value && typeof value === 'object' && 'destroy' in value) {
                            try {
                                if (typeof value.destroy === 'function') {
                                    (value as unknown as { destroy: () => void }).destroy();
                                }
                            } catch {
                                // Ignore if already destroyed
                            }
                        }
                    } catch (e) {
                        const msg = fut.formatted_error || (e as Error).message;
                        setLogs((prev) => [
                            ...prev,
                            {type: 'error', text: msg.trimEnd()}
                        ]);
                    } finally {
                        fut.destroy();
                    }
                    break;
            }
        } catch (err) {
            if (!handleProxyError(err)) {
                setLogs((prev) => [...prev, {type: 'error', text: `Execution error: ${String(err)}`}]);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = inputVal;
            setInputVal('');
            void executeLine(cmd);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cachedCommandHistory.length === 0) return;
            let nextIndex = historyIndexRef.current;
            if (nextIndex === null) {
                nextIndex = cachedCommandHistory.length - 1;
            } else if (nextIndex > 0) {
                nextIndex -= 1;
            }
            historyIndexRef.current = nextIndex;
            setInputVal(cachedCommandHistory[nextIndex] ?? '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndexRef.current === null) return;
            let nextIndex: number | null = historyIndexRef.current + 1;
            if (nextIndex >= cachedCommandHistory.length) {
                nextIndex = null;
                setInputVal('');
            } else {
                setInputVal(cachedCommandHistory[nextIndex] ?? '');
            }
            historyIndexRef.current = nextIndex;
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleTabCompletion();
        } else if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            if (cachedPyconsole) {
                try {
                    cachedPyconsole.buffer.clear();
                } catch (err) {
                    if (handleProxyError(err)) return;
                }
            }
            lineBufferRef.current = '';
            setPrompt('>>> ');
            historyIndexRef.current = null;
            setLogs((prev) => [
                ...prev,
                {type: 'input', text: prompt + inputVal + '^C'},
                {type: 'error', text: 'KeyboardInterrupt'}
            ]);
            setInputVal('');
        }
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div
            onClick={handleContainerClick}
            className="flex flex-col h-full bg-[#0e1112] font-mono text-sm text-[#e2e8f0] cursor-text select-text"
        >
            {/* Scrollable logs area */}
            <div
                ref={logsContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1"
            >
                {logs.map((log, index) => {
                    switch (log.type) {
                        case 'input':
                            return (
                                <div key={index} className="flex gap-2">
                                    <span className="text-indigo-400 select-none whitespace-pre-wrap">
                                        {log.text.slice(0, 4)}
                                    </span>
                                    <span className="whitespace-pre-wrap">{log.text.slice(4)}</span>
                                </div>
                            );
                        case 'stdout':
                            return (
                                <pre key={index} className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {log.text}
                                </pre>
                            );
                        case 'stderr':
                            return (
                                <pre key={index} className="text-red-400 whitespace-pre-wrap leading-relaxed">
                                    {log.text}
                                </pre>
                            );
                        case 'result':
                            return (
                                <pre key={index} className="text-blue-400 whitespace-pre-wrap leading-relaxed">
                                    {log.text}
                                </pre>
                            );
                        case 'error':
                            return (
                                <pre key={index} className="text-red-500 whitespace-pre-wrap leading-relaxed">
                                    {log.text}
                                </pre>
                            );
                        case 'info':
                        default:
                            return (
                                <pre key={index} className="text-fg-ghost whitespace-pre-wrap leading-relaxed">
                                    {log.text}
                                </pre>
                            );
                    }
                })}

                {status === 'loading' && (
                    <div className="text-fg-ghost select-none">
                        ⏳ Loading Pyodide runtime (WebAssembly Python)...
                    </div>
                )}
            </div>

            {/* Input bar at the bottom */}
            {status === 'ready' && (
                <div className="flex items-center gap-2 border-t border-[#1a1d1f] p-4 bg-[#0a0c0d]">
                    <span className="text-indigo-400 font-bold select-none">{prompt}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputVal}
                        onChange={(e) => {
                            setInputVal(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none caret-blue-500 font-mono text-[#e2e8f0] text-sm placeholder-fg-ghost"
                        autoFocus
                        placeholder="Type Python code here..."
                    />
                </div>
            )}

            {status === 'error' && (
                <div className="p-4 bg-red-950/20 border-t border-red-900/50 text-red-400 text-xs">
                    Failed to initialize: {errorMessage}
                </div>
            )}
        </div>
    );
}
