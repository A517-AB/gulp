export type ConsoleState = 'complete' | 'incomplete' | 'syntax-error'

export const ConsoleStates = {
    complete: 'complete',
    incomplete: 'incomplete',
    syntaxError: 'syntax-error'
} as const

