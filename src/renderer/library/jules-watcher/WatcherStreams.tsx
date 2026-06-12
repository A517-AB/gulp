import { useWatcherStore } from './store'
import { JulesWatcher } from './JulesWatcher'

export function WatcherStreams() {
    const watched = useWatcherStore(s => s.watched)
    return (
        <>
            {Object.values(watched).map(s => (
                <JulesWatcher key={s.id} id={s.id} title={s.title} />
            ))}
        </>
    )
}
