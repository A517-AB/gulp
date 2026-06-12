import {useEffect} from 'react'
import {useStore} from '@/store/app'
import {sdkIpc} from '@shared/bridge'

const SYNC_INTERVAL = 30_000

export function useAppSync() {
    const sync = useStore(s => s.sync)

    useEffect(() => {
        if (!sdkIpc) return
        const id = setInterval(() => { void sync() }, SYNC_INTERVAL)
        return () => { clearInterval(id) }
    }, [sync])
}
