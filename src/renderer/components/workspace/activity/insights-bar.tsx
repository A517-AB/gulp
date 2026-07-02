import {useEffect, useState} from 'react'
import {
    AlertTriangle,
    Check,
    Clipboard,
    Clock,
    ExternalLink,
    GitPullRequest,
    RotateCcw,
    UserRound,
    Zap
} from 'lucide-react'
import {getSnapshot} from '@/lib/jules-client.ts'
import type {JulesSessionSnapshot} from '@shared/jules-ipc'

function formatDuration(ms: number): string {
    const minutes = Math.round(ms / 60_000)
    if (minutes < 1) return '<1m'
    if (minutes < 60) return `${String(minutes)}m`
    const hours = Math.floor(minutes / 60)
    return `${String(hours)}h ${String(minutes % 60)}m`
}

function humanizeType(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
}

function Stat({icon: Icon, label, value, warn}: {
    icon: typeof Clock
    label: string
    value: string | number
    warn?: boolean
}) {
    return (
        <div className={`flex items-center gap-1.5 ${warn ? 'text-red-400' : 'text-fg-dim'}`}>
            <Icon className="h-3 w-3 shrink-0"/>
            <span className="text-3xs font-mono uppercase tracking-wide">{label}</span>
            <span
                className={`text-2xs font-mono font-bold ${warn ? 'text-red-400' : 'text-fg-secondary'}`}>{value}</span>
        </div>
    )
}

function ToolButton({icon: Icon, label, onClick, href}: {
    icon: typeof Clock
    label: string
    onClick?: () => void
    href?: string
}) {
    const [done, setDone] = useState(false)
    const DisplayIcon = done ? Check : Icon

    const handleClick = () => {
        onClick?.()
        if (onClick) {
            setDone(true)
            setTimeout(() => {
                setDone(false)
            }, 1200)
        }
    }

    const className = `flex items-center gap-1.5 px-2 py-1 rounded border border-hair text-2xs font-mono text-fg-muted hover:text-fg-primary hover:border-subtle transition-colors ${done ? 'text-emerald-400 border-emerald-500/40' : ''}`

    if (href) {
        return (
            <a href={href} target="_blank" rel="noreferrer" className={className}>
                <DisplayIcon className="h-3 w-3"/>
                {label}
            </a>
        )
    }

    return (
        <button onClick={handleClick} className={className}>
            <DisplayIcon className="h-3 w-3"/>
            {label}
        </button>
    )
}

export function InsightsBar({sessionId}: { sessionId: string }) {
    const [snapshot, setSnapshot] = useState<JulesSessionSnapshot | null>(null)

    useEffect(() => {
        let cancelled = false
        void getSnapshot(sessionId).then(s => {
            if (!cancelled) setSnapshot(s)
        }).catch((err: unknown) => {
            console.error('[insights-bar] snapshot:', err)
        })
        return () => {
            cancelled = true
        }
    }, [sessionId])

    if (!snapshot) return null

    const {insights, durationMs, activityCounts, url, prompt, pr} = snapshot
    const counts = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])

    return (
        <div className="border-b border-hair bg-surface px-4 py-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-5 flex-wrap">
                <Stat icon={Clock} label="Duration" value={formatDuration(durationMs)}/>
                <Stat icon={Zap} label="Attempts" value={insights.completionAttempts}/>
                <Stat
                    icon={RotateCcw}
                    label="Replans"
                    value={insights.planRegenerations}
                    warn={insights.planRegenerations > 0}
                />
                <Stat
                    icon={UserRound}
                    label="Interventions"
                    value={insights.userInterventions}
                    warn={insights.userInterventions > 0}
                />
                <Stat
                    icon={AlertTriangle}
                    label="Failed cmds"
                    value={insights.failedCommandCount}
                    warn={insights.failedCommandCount > 0}
                />
            </div>

            {counts.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    {counts.map(([type, count]) => (
                        <span key={type} className="text-3xs font-mono text-fg-ghost">
                            {humanizeType(type)} <span className="text-fg-dim font-bold">×{count}</span>
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                <ToolButton
                    icon={Clipboard}
                    label="Copy ID"
                    onClick={() => {
                        void navigator.clipboard.writeText(sessionId)
                    }}
                />
                <ToolButton
                    icon={Clipboard}
                    label="Copy prompt"
                    onClick={() => {
                        void navigator.clipboard.writeText(prompt)
                    }}
                />
                <ToolButton icon={ExternalLink} label="Open in Jules" href={url}/>
                {pr && (
                    <ToolButton icon={GitPullRequest} label="Open PR" href={pr.url}/>
                )}
            </div>
        </div>
    )
}

export default InsightsBar
