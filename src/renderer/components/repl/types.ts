import type {PackageData, PyodideInterface} from 'pyodide'

export type {PyodideInterface, PackageData}

// ── output lines ───────────────────────────────────────────────────────────────

export type LineKind = 'in' | 'out' | 'err' | 'info'

export interface ReplLine {
    id: number
    text: string
    kind: LineKind
}

// ── pyodide.console ────────────────────────────────────────────────────────────

export type SyntaxCheck = 'complete' | 'incomplete' | 'syntax-error'

export interface PushResult {
    syntax_check: SyntaxCheck
    formatted_error: string

    destroy(): void
}

export interface CompletionResult {
    0: { toJs(): string[] }
    1: number

    destroy(): void
}

export interface PyConsole {
    stdout_callback: (s: string) => void
    stderr_callback: (s: string) => void
    buffer: { clear(): void }

    push(line: string): PushResult

    complete(text: string): CompletionResult
}

export interface PyConsoleModule {
    PyodideConsole(globals: unknown): PyConsole

    repr_shorten: { callKwargs(val: unknown, opts: { separator: string }): string }
    BANNER: string
}

// ── micropip ───────────────────────────────────────────────────────────────────

export interface MicropipModule {
    install(
        requirements: string | string[],
        options?: {
            keep_going?: boolean
            deps?: boolean
            credentials?: string
            pre?: boolean
        }
    ): Promise<void>

    list(): Record<string, { name: string; version: string; source: string }>

    freeze(): Promise<string>
}

// ── autocomplete ───────────────────────────────────────────────────────────────

export interface CompletionState {
    items: string[]
    index: number
    prefix: string
    start: number
}

// ── feedback ───────────────────────────────────────────────────────────────────

export type FeedbackKind = 'installing' | 'installed' | 'error'

export interface PackageFeedback {
    kind: FeedbackKind
    name: string
}

// ── await_fut ──────────────────────────────────────────────────────────────────

export type AwaitFutResult = { destroy(): void } & PromiseLike<[unknown]>
export type AwaitFutFn = (fut: unknown) => AwaitFutResult

// ── singleton state ────────────────────────────────────────────────────────────

export interface ReplState {
    py: PyodideInterface
    console: PyConsole
    awaitFut: AwaitFutFn
    reprShorten: PyConsoleModule['repr_shorten']
    micropip: MicropipModule | null
    history: string[]
    lines: ReplLine[]
    consoleState: SyntaxCheck
}
