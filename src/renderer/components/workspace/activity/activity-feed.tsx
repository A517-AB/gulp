import {useCallback, useEffect, useRef, useState} from 'react'
import {ScrollArea} from '@/ui/scroll-area.tsx'
import {useStore} from '@/store/app.ts'
import type {Activity} from '@jules'
import type {ActivityFeedProps} from './types'
import {SingleActivity} from './single-activity.tsx'
import {ActivityFeedHeader} from './activity-feed-header.tsx'
import {ActivityFeedForm} from './activity-feed-form.tsx'
import {InsightsBar} from './insights-bar.tsx'
import {approvePlan, getActivities, sendMessage} from '@/lib/jules-client.ts'

const QUICK_REVIEW_PROMPT =
    'Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings.'

const EMPTY_ACTIVITIES: Activity[] = []

export function ActivityFeed({
    session,
    onArchive,
    onNewSession,
    showCodeDiffs,
    onToggleCodeDiffs,
}: ActivityFeedProps) {
    const [activities, setActivities] = useState<Activity[]>(EMPTY_ACTIVITIES)
    const [error, setError] = useState<string | null>(null)
    const planApproved = activities.some(a => a.type === 'planApproved')

    const cancelledRef = useRef(false)

    useEffect(() => {
        cancelledRef.current = false

        void (async () => {
            try {
                const cached = await getActivities(session.id)
                if (!cancelledRef.current) setActivities(cached)
            } catch (err) {
                if (!cancelledRef.current) {
                    console.error('[feed] activities:', err)
                    setError(String(err))
                }
            }
        })()

        return () => {
            cancelledRef.current = true
        }
    }, [session.id])

    const [sending, setSending] = useState(false)
    const [approving, setApproving] = useState(false)
    const [applyState, setApplyState] = useState<{
        status: 'idle' | 'applying' | 'done' | 'error'
        message?: string
    }>({status: 'idle'})

    const handleApplyLocally = useCallback(async () => {
        setApplyState({status: 'applying'})
        const result = await useStore.getState().applyPatch('', '')
        if (result.ok) {
            setApplyState({
                status: 'done',
                message: `Applied to branch: ${'branch' in result ? (result.branch ?? 'unknown') : 'unknown'}`,
            })
        } else {
            setApplyState({status: 'error', message: result.error ?? 'Unknown error'})
        }
    }, [])

    const handleApprovePlan = useCallback(() => {
        setApproving(prev => {
            if (prev) return prev
            approvePlan(session.id)
                .catch((err: unknown) => {
                    console.error('Failed to approve plan:', err)
                })
                .finally(() => {
                    setApproving(false)
                })
            return true
        })
    }, [session.id])

    const onSubmitMessage = useCallback((msg: string) => {
        if (!msg.trim()) return
        setSending(prev => {
            if (prev) return prev
            sendMessage(session.id, msg)
                .catch((err: unknown) => {
                    console.error('Failed to send:', err)
                })
                .finally(() => {
                    setSending(false)
                })
            return true
        })
    }, [session.id])

    const handleQuickReview = useCallback(() => {
        setSending(prev => {
            if (prev) return prev
            sendMessage(session.id, QUICK_REVIEW_PROMPT)
                .catch((err: unknown) => {
                    console.error('Failed to send review:', err)
                })
                .finally(() => {
                    setSending(false)
                })
            return true
        })
    }, [session.id])

    return (
        <div className="flex flex-col h-full bg-base">
            <ActivityFeedHeader
                session={session}
                showCodeDiffs={showCodeDiffs}
                onToggleCodeDiffs={onToggleCodeDiffs}
                sending={sending}
                applyStateStatus={applyState.status}
                handleQuickReview={handleQuickReview}
                handleApplyLocally={() => {
                    void handleApplyLocally()
                }}
                onNewSession={onNewSession}
                onArchive={onArchive}
            />

            <InsightsBar key={session.id} sessionId={session.id}/>

            {error && (
                <div className="border-b border-hair bg-red-950/20 px-4 py-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-red-400 uppercase">{error}</p>
                </div>
            )}
            {applyState.status === 'done' && (
                <div
                    className="border-b border-hair bg-emerald-950/20 px-4 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-emerald-400 uppercase">{applyState.message}</p>
                    <button
                        onClick={() => {
                            setApplyState({status: 'idle'})
                        }}
                        className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase"
                    >✕
                    </button>
                </div>
            )}
            {applyState.status === 'error' && (
                <div className="border-b border-hair bg-red-950/20 px-4 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-red-400 uppercase">{applyState.message}</p>
                    <button
                        onClick={() => {
                            setApplyState({status: 'idle'})
                        }}
                        className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase"
                    >✕
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-3 flex flex-col space-y-2.5">
                        {activities.map(activity => (
                            <SingleActivity
                                key={activity.id}
                                activity={activity}
                                onApprovePlan={handleApprovePlan}
                                approvingPlan={approving}
                                planApproved={planApproved}
                            />
                        ))}
                        {(() => {
                            const pr = session.outputs.find(o => o.type === 'pullRequest')
                            if (pr?.type !== 'pullRequest') return null
                            return (
                                <div className="flex justify-center py-2 px-6">
                                    <p className="text-[10px] font-mono text-fg-dim/80 text-center leading-relaxed select-none">
                                        <span className="text-purple-400">✦ </span>
                                        <span className="text-fg-secondary">{pr.pullRequest.title}</span>
                                        <span className="mx-2 text-purple-500/50">•</span>
                                        <a
                                            href={pr.pullRequest.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-purple-400/70 hover:text-purple-400 transition-colors"
                                        >PR</a>
                                    </p>
                                </div>
                            )
                        })()}
                    </div>
                </ScrollArea>
            </div>

            <ActivityFeedForm sessionId={session.id} onSubmitMessage={onSubmitMessage} sending={sending}/>
        </div>
    )
}

export default ActivityFeed
