import {useEffect, useRef} from 'react';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import type {PyodideInterface} from 'pyodide';
import '@xterm/xterm/css/xterm.css';

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
}

interface PyConsoleModule {
    repr_shorten: {
        callKwargs: (val: unknown, options: { separator: string }) => string;
    };
    BANNER: string;
    PyodideConsole: (globals: unknown) => PyodideConsoleInstance;
}

export function Repl() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initialize xterm.js Terminal
        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'block',
            convertEol: true,
            scrollback: 2000,
            fontSize: 12,
            fontFamily: 'Consolas, Monaco, monospace',
            theme: {
                background: '#0e1112', // subtle dark theme matching app colors
                foreground: '#e2e8f0',
                cursor: '#3b82f6',
                selection: 'rgba(59, 130, 246, 0.3)',
            },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(container);
        fitAddon.fit();
        term.focus();

        // Resize observer to handle dynamic layout changes (e.g. sidebar toggle)
        const resizeObserver = new ResizeObserver(() => {
            try {
                fitAddon.fit();
            } catch {
                // ignore errors during quick layout changes
            }
        });
        resizeObserver.observe(container);

        term.writeln('⏳ Loading Pyodide runtime (WebAssembly Python)...');

        let pyconsole: PyodideConsoleInstance | null = null;
        let pyodideInstance: PyodideInterface | null = null;
        let isDisposed = false;

        // Initialize Pyodide asynchronously
        const init = async () => {
            try {
                const {loadPyodide} = await import('pyodide');
                const py = await loadPyodide({
                    indexURL: '/pyodide/',
                });

                if (isDisposed) {
                    return;
                }

                pyodideInstance = py;

                const {repr_shorten, BANNER, PyodideConsole} =
                    py.pyimport('pyodide.console') as unknown as PyConsoleModule;

                term.writeln(`🐍 Welcome to Pyodide ${py.version} terminal emulator`);
                term.writeln(BANNER);

                pyconsole = PyodideConsole(py.globals);

                const namespace = py.globals.get('dict')() as { destroy: () => void };
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

                pyconsole.stdout_callback = (s: string) => {
                    if (!isDisposed) term.write(s);
                };
                pyconsole.stderr_callback = (s: string) => {
                    if (!isDisposed) term.write(`\x1b[31m${s}\x1b[0m`);
                };

                // REPL state variables
                const ps1 = '>>> ';
                const ps2 = '... ';
                let buffer = '';
                let cursorIndex = 0;
                let prompt = ps1;
                const history: string[] = [];
                let historyIndex: number | null = null;

                // Load history from localStorage
                try {
                    const savedHistory = localStorage.getItem('0_commands');
                    if (savedHistory) {
                        const parsed = JSON.parse(savedHistory) as unknown;
                        if (Array.isArray(parsed)) {
                            history.push(...(parsed as string[]));
                        }
                    }
                } catch (e) {
                    console.error('Failed to load history:', e);
        }

                term.write(prompt);

                const addToHistory = (command: string) => {
                    const trimmed = command.trimEnd();
                    if (!trimmed) return;
                    const last = history[history.length - 1];
                    if (last !== trimmed) {
                        history.push(trimmed);
                        try {
                            localStorage.setItem('0_commands', JSON.stringify(history));
                        } catch (e) {
                            console.error('Failed to save history:', e);
                        }
                    }
                };

                const refreshLine = () => {
                    const clearCommand = '\x1b[0K';
                    const leftPart = prompt + buffer.slice(0, cursorIndex);
                    const rightPart = buffer.slice(cursorIndex);
                    term.write(`\x1b[0G${leftPart}\x1b[s${rightPart}${clearCommand}\x1b[u`);
                };

                const setBuffer = (newBuffer: string, newCursorIndex: number | null = null) => {
                    buffer = newBuffer;
                    if (newCursorIndex === null) {
                        cursorIndex = buffer.length;
                    } else {
                        cursorIndex = Math.max(0, Math.min(newCursorIndex, buffer.length));
                    }
                    refreshLine();
                };

                const insertAtCursor = (text: string) => {
                    const before = buffer.slice(0, cursorIndex);
                    const after = buffer.slice(cursorIndex);
                    setBuffer(before + text + after, cursorIndex + text.length);
                };

                const clearBuffer = () => {
                    buffer = '';
                    cursorIndex = 0;
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
                    if (!pyconsole) return;
                    const sourceToComplete = buffer.slice(0, cursorIndex);
                    if (!sourceToComplete.trim()) return;
                    if (/[([{]\s*$/.test(sourceToComplete)) return;

                    const completionResult = pyconsole.complete(sourceToComplete);
                    const completions = completionResult[0].toJs();
                    const start = completionResult[1];
                    completionResult.destroy();

                    const currentWord = sourceToComplete.slice(start);
                    if (!currentWord.trim() || /^\d+$/.test(currentWord.trim())) return;

                    if (completions.length === 1 && completions[0]) {
                        const newBuf = buffer.slice(0, start) + completions[0] + buffer.slice(cursorIndex);
                        setBuffer(newBuf, start + completions[0].length);
                    } else if (completions.length > 1) {
                        const prefix = longestCommonPrefix(completions);
                        if (prefix.length > currentWord.length) {
                            const newBuf = buffer.slice(0, start) + prefix + buffer.slice(cursorIndex);
                            setBuffer(newBuf, start + prefix.length);
                        } else {
                            term.write('\r\n');
                            const displayCompletions = completions.slice(0, 200);
                            term.writeln(displayCompletions.join('  '));
                            if (completions.length > 200) {
                                term.writeln(`... and ${completions.length - 200} more`);
                            }
                            refreshLine();
                        }
                    }
                };

                const handlePaste = async (data: string) => {
                    const normalized = data.replace(/\r\n?/g, '\n');
                    if (normalized.includes('\n')) {
                        const hasTrailingNewline = normalized.endsWith('\n');
                        const parts = normalized.split('\n');
                        if (hasTrailingNewline) {
                            parts.pop();
                        }

                        const cleanedLines = parts.map((line) =>
                            line.replace(/^\s*(>>>|\.\.\.)\s?/, '')
                        );

                        const executableLines = hasTrailingNewline
                            ? cleanedLines
                            : cleanedLines.slice(0, -1);

                        for (const line of executableLines) {
                            insertAtCursor(line);
                            term.write('\r\n');
                            await execLine(buffer);
                            clearBuffer();
                        }

                        if (!hasTrailingNewline) {
                            const trailingFragment = cleanedLines[cleanedLines.length - 1];
                            if (trailingFragment) {
                                insertAtCursor(trailingFragment);
                            }
                        } else {
                            term.write(prompt);
                        }
                    } else {
                        insertAtCursor(data);
                    }
                };

                const execLine = async (line: string) => {
                    if (!pyconsole) return;
                    const cleanedLine = line.replace(/\u00a0/g, ' ');
                    if (cleanedLine === 'clear') {
                        term.clear();
                        return;
                    }

                    const fut = pyconsole.push(cleanedLine);

                    switch (fut.syntax_check) {
                        case 'syntax-error':
                            term.write(`\x1b[31m${fut.formatted_error.trimEnd()}\x1b[0m\r\n`);
                            prompt = ps1;
                            addToHistory(cleanedLine);
                            historyIndex = null;
                            fut.destroy();
                            break;
                        case 'incomplete':
                            prompt = ps2;
                            addToHistory(cleanedLine);
                            historyIndex = null;
                            break;
                        case 'complete':
                            prompt = ps1;
                            try {
                                const wrapped = awaitFutFn(fut);
                                const results = await wrapped;
                                const value = results[0];
                                if (value !== undefined) {
                                    const output = repr_shorten.callKwargs(value, {
                                        separator: '\n<long output truncated>\n',
                                    });
                                    term.write(output);
                                    term.write('\r\n');
                                }
                                if (value && typeof value === 'object' && 'destroy' in value && typeof value.destroy === 'function') {
                                    (value as unknown as { destroy: () => void }).destroy();
                                }
                            } catch (e) {
                                const msg = fut.formatted_error || (e as Error).message;
                                term.write(`\x1b[31m${String(msg).trimEnd()}\x1b[0m\r\n`);
                            } finally {
                                fut.destroy();
                            }
                            addToHistory(cleanedLine);
                            historyIndex = null;
                            break;
                    }
                };

                term.onData(async (data) => {
                    if (isDisposed) return;
                    switch (data) {
                        case '\r': // Enter
                            term.write('\r\n');
                            await execLine(buffer);
                            clearBuffer();
                            term.write(prompt);
                            break;
                        case '\u0003': // Ctrl-C
                            if (pyconsole) {
                                pyconsole.buffer.clear();
                            }
                            clearBuffer();
                            term.write('^C\r\nKeyboardInterrupt\r\n' + ps1);
                            prompt = ps1;
                            historyIndex = null;
                            break;
                        case '\u0016': // Ctrl-V
                            try {
                                const clipboard = await navigator.clipboard.readText();
                                await handlePaste(clipboard);
                            } catch (err) {
                                console.error('Failed to read clipboard:', err);
                            }
                            break;
                        case '\u007F': // Backspace
                            if (cursorIndex > 0) {
                                const before = buffer.slice(0, cursorIndex - 1);
                                const after = buffer.slice(cursorIndex);
                                cursorIndex -= 1;
                                setBuffer(before + after, cursorIndex);
                            }
                            break;
                        case '\x1B[A': // Up arrow
                            if (prompt === ps1) {
                                if (historyIndex === null) historyIndex = history.length;
                                if (historyIndex > 0) {
                                    historyIndex -= 1;
                                    const newBuf = history[historyIndex] ?? '';
                                    setBuffer(newBuf, newBuf.length);
                                }
                            }
                            break;
                        case '\x1B[B': // Down arrow
                            if (prompt === ps1 && historyIndex !== null) {
                                if (historyIndex < history.length - 1) {
                                    historyIndex += 1;
                                    const newBuf = history[historyIndex] ?? '';
                                    setBuffer(newBuf, newBuf.length);
                                } else {
                                    historyIndex = null;
                                    setBuffer('', 0);
                                }
                            }
                            break;
                        case '\x1B[C': // Right arrow
                            if (cursorIndex < buffer.length) {
                                cursorIndex += 1;
                                refreshLine();
                            }
                            break;
                        case '\x1B[D': // Left arrow
                            if (cursorIndex > 0) {
                                cursorIndex -= 1;
                                refreshLine();
                            }
                            break;
                        case '\x1B[Z': // Shift+Tab
                            break;
                        case '\t':
                            handleTabCompletion();
                            break;
                        default:
                            if (data) {
                                const cleanedData = data.replace(/\u00a0/g, ' ');
                                await handlePaste(cleanedData);
                            }
                    }
                });
            } catch (err) {
                term.writeln(`\r\n❌ Error initializing Pyodide: ${String(err)}`);
            }
        };

        void init();

        return () => {
            isDisposed = true;
            resizeObserver.disconnect();
            term.dispose();
            if (pyconsole && 'destroy' in pyconsole && typeof pyconsole.destroy === 'function') {
                (pyconsole as unknown as { destroy: () => void }).destroy();
            }
            if (pyodideInstance && 'destroy' in pyodideInstance && typeof pyodideInstance.destroy === 'function') {
                (pyodideInstance as unknown as { destroy: () => void }).destroy();
            }
        };
    }, []);

    return <div ref={containerRef} className="w-full h-full p-2 bg-[#0e1112]"/>;
}
