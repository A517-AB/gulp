export type ConsoleState = 'complete' | 'incomplete' | 'syntax-error'

export const ConsoleState = {
    complete: 'complete',
    incomplete: 'incomplete',
    syntaxError: 'syntax-error'
} as const
