import {useEffect} from 'react'
import {useTimerStore} from '@/store/timer'
import {useNotification} from '@/library/notification'

/** Mounted once at the app root so timers keep ticking (and notifying) no matter which page is open. */
export function useTimerEngine(): void {
    const {warning, success} = useNotification()

    useEffect(() => {
        const id = setInterval(() => {
            const before = useTimerStore.getState().timers
            useTimerStore.getState().tick()
            const after = useTimerStore.getState().timers

            for (const t of after) {
                const prev = before.find(p => p.id === t.id)
                if (!prev) continue
                if (t.warned30 && !prev.warned30) warning({title: 'Timer — 30s left', body: t.label})
                if (t.state === 'done' && prev.state !== 'done') {
                    success({title: 'Timer done', body: t.label, sound: 'alarm', duration: 0, id: t.id})
                }
            }
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [warning, success])
}
