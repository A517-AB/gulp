import mitt from 'mitt'

export type BusEvents = {
    'jules.complete': { sessionId: string; label?: string | undefined }
    'jules.error': { sessionId: string; reason?: string | undefined }
    'jules.running': { sessionId: string; minutesElapsed: number }
    'git.commit': { repo: string; message: string }
    'todo.done': { id: string; label: string }
    'timer.done': { label: string }
    'timer.warning': { label: string; secondsLeft: number }
}

export const bus = mitt<BusEvents>()
