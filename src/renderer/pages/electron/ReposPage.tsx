import { useState, useEffect } from 'react'
import { Play, PlayCircle, Loader2, ChevronDown, ChevronRight, Tag } from 'lucide-react'
import { createSession, batchRun } from '@api/sdk'
import { isElectron, queues as queuesBridge } from '@shared/bridge'
import { cn } from '@/utils'

interface Task {
    id?: string
    folder: string | null
    topic: string
    task: string
    flags?: string[]
}

interface TaskGroup {
    id?: string
    group: string
    repo: string | null
    baseBranch: string | null
    tasks: Task[]
}

type FiringValue = 'firing' | 'done' | 'error' | { sessionId: string }
type FiringState = Record<string, FiringValue>;

export async function loader(): Promise<Record<string, never>> {
    return {}
}

export default function QueuesPage() {
    const [groups, setGroups] = useState<TaskGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [firing, setFiring] = useState<FiringState>({})
    const [concurrency, setConcurrency] = useState(2)

    useEffect(() => {
        async function load() {
            try {
                if (isElectron && queuesBridge) {
                    const raw = await queuesBridge.getTasks()
                    setGroups(raw as TaskGroup[])
                    console.log('[queues] loaded from electron bridge:', (raw as TaskGroup[]).length, 'groups')
                } else {
                    console.log('[queues] not in electron — no tasks')
                }
            } catch (err) {
                console.error('[queues] failed to load tasks:', err)
            } finally {
                setLoading(false)
            }
        }
        void load()
    }, [])

    function toggleGroup(key: string) {
        setExpanded(e => ({ ...e, [key]: !e[key] }))
    }

    async function fireTask(group: TaskGroup, task: Task) {
        const key = `${group.id ?? group.group}::${task.id ?? task.topic}`
        setFiring(f => ({ ...f, [key]: 'firing' }))
        console.log(`[queues] firing task="${task.topic}" repo=${group.repo ?? 'repoless'}`)
        try {
            const { id } = await createSession({
                prompt: task.task,
                title: task.topic,
                ...(group.repo ? { source: { github: group.repo, baseBranch: group.baseBranch ?? 'main' } } : {}),
            })
            console.log(`[queues] session=${id} created for task="${task.topic}"`)
            setFiring(f => ({ ...f, [key]: { sessionId: id } }))
        } catch (err: unknown) {
            console.error(`[queues] task="${task.topic}" failed:`, err)
            setFiring(f => ({ ...f, [key]: 'error' }))
        }
    }

    async function fireGroup(group: TaskGroup) {
        const key = `batch::${group.id ?? group.group}`
        setFiring(f => ({ ...f, [key]: 'firing' }))
        console.log(`[queues] batch firing group="${group.group}" n=${group.tasks.length} concurrency=${concurrency}`)
        try {
            const configs = group.tasks.map(task => ({
                prompt: task.task,
                title: task.topic,
                ...(group.repo ? { source: { github: group.repo!, baseBranch: group.baseBranch ?? 'main' } } : {}),
            }))
            const sessions = await batchRun(configs, { concurrency, stopOnError: false })
            console.log(`[queues] batch launched ${sessions.length} sessions`)
            setFiring(f => ({ ...f, [key]: 'done' }))
        } catch (err: unknown) {
            console.error(`[queues] batch group="${group.group}" failed:`, err instanceof Error ? err.message : err)
            setFiring(f => ({ ...f, [key]: 'error' }))
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full gap-2 text-fg-dim">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm">Loading tasks…</span>
            </div>
        )
    }

    if (!isElectron) {
        return (
            <div className="p-6 max-w-2xl space-y-3">
                <h1 className="text-xl font-semibold text-fg-primary">Queues</h1>
                <p className="text-sm text-fg-muted rounded-lg border border-hair bg-surface px-4 py-3">
                    Task queue reads from <code className="font-mono text-fg-dim">D:/tired/tasks.json</code> via the Electron bridge.
                    Open the desktop app to manage and fire queued tasks.
                </p>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-fg-primary">Queues</h1>
                <div className="flex items-center gap-2 text-xs text-fg-dim">
                    <span>Concurrency</span>
                    <input
                        type="range"
                        min={1}
                        max={8}
                        value={concurrency}
                        onChange={e => setConcurrency(Number(e.target.value))}
                        className="w-20 accent-purple-500"
                    />
                    <span className="font-mono w-3 text-fg-primary">{concurrency}</span>
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="rounded-lg border border-hair bg-surface p-8 text-center text-sm text-fg-dim">
                    No tasks in <code className="font-mono">tasks.json</code>
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map((group, gi) => {
                        const groupKey = group.id ?? group.group
                        const batchKey = `batch::${groupKey}`
                        const batchFiring = firing[batchKey]
                        const isOpen = expanded[groupKey] ?? true

                        return (
                            <div key={gi} className="rounded-lg border border-hair overflow-hidden">
                                {/* Group header */}
                                <div className="flex items-center gap-3 px-4 py-3 bg-surface/50">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(groupKey)}
                                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                    >
                                        {isOpen
                                            ? <ChevronDown size={12} className="shrink-0 text-fg-dim" />
                                            : <ChevronRight size={12} className="shrink-0 text-fg-dim" />}
                                        <span className="text-sm font-medium text-fg-primary">{group.group}</span>
                                        <span className="text-[10px] text-fg-dim">{group.tasks.length}</span>
                                    </button>
                                    <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-fg-dim">
                      {group.repo ?? 'repoless'}
                    </span>
                                        <button
                                            type="button"
                                            onClick={() => void fireGroup(group)}
                                            disabled={batchFiring === 'firing'}
                                            className={cn(
                                                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                                                batchFiring === 'done' && 'bg-emerald-500/15 text-emerald-400',
                                                batchFiring === 'error' && 'bg-red-500/15 text-red-400',
                                                batchFiring === 'firing' && 'opacity-50 cursor-not-allowed text-fg-dim',
                                                !batchFiring && 'bg-purple-600 text-white hover:bg-purple-500',
                                            )}
                                        >
                                            {batchFiring === 'firing'
                                                ? <Loader2 size={10} className="animate-spin" />
                                                : <PlayCircle size={10} />}
                                            {batchFiring === 'done' ? 'Launched' : batchFiring === 'error' ? 'Failed' : 'Fire all'}
                                        </button>
                                    </div>
                                </div>

                                {/* Tasks */}
                                {isOpen && (
                                    <div className="divide-y divide-hair">
                                        {group.tasks.map((task, ti) => {
                                            const taskKey = `${groupKey}::${task.id ?? task.topic}`
                                            const taskFiring = firing[taskKey]

                                            return (
                                                <div key={ti} className="flex items-start gap-3 px-4 py-3 hover:bg-hover/40 transition-colors">
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-medium text-fg-primary">{task.topic}</span>
                                                            {task.flags?.map(flag => (
                                                                <span key={flag} className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-hover text-fg-dim">
                                  <Tag size={7} />
                                                                    {flag}
                                </span>
                                                            ))}
                                                            {task.folder && (
                                                                <span className="text-[10px] font-mono text-fg-ghost">{task.folder}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-fg-muted leading-relaxed">{task.task}</p>
                                                        {typeof taskFiring === 'object' && (
                                                            <p className="text-[10px] font-mono text-emerald-400">→ {taskFiring.sessionId}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => void fireTask(group, task)}
                                                        disabled={taskFiring === 'firing'}
                                                        className={cn(
                                                            'shrink-0 mt-0.5 p-1.5 rounded-md text-xs transition-colors',
                                                            typeof taskFiring === 'object' && 'text-emerald-400',
                                                            taskFiring === 'error' && 'text-red-400',
                                                            taskFiring === 'firing' && 'opacity-50 cursor-not-allowed',
                                                            !taskFiring && 'text-fg-muted hover:text-fg-primary hover:bg-hover',
                                                        )}
                                                    >
                                                        {taskFiring === 'firing'
                                                            ? <Loader2 size={12} className="animate-spin" />
                                                            : <Play size={12} />}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
