import {useEffect} from 'react'
import {useStore} from '@/store/app'

const SYNC_INTERVAL = 30_000

export function useAppSync() {
    const sync = useStore(s => s.sync)

    useEffect(() => {
        const id = setInterval(() => { void sync() }, SYNC_INTERVAL)
        return () => { clearInterval(id) }
    }, [sync])
}
