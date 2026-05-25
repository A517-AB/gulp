import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { approveSession } from '@/api/sdk'
import { cn } from '@/utils'
import type { WsActivity } from '@/hooks/use-session-ws'

interface PlanApprovalBannerProps {
  sessionId: string
  planActivity: WsActivity | undefined
  onApproved: () => void
}

export function PlanApprovalBanner({ sessionId, planActivity, onApproved }: PlanApprovalBannerProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  const steps = planActivity?.plan?.steps ?? []

  async function approve() {
    setLoading('approve')
    console.log(`[plan] approving session=${sessionId}`)
    try {
      await approveSession(sessionId)
      console.log(`[plan] approved session=${sessionId}`)
      onApproved()
    } catch (err) {
      console.error('[plan] approve failed', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="shrink-0 border-b border-hair bg-yellow-500/5 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-yellow-400 mb-1.5">Plan ready for approval</p>
          {steps.length > 0 && (
            <ol className="space-y-0.5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-baseline gap-1.5 text-[11px] text-fg-secondary">
                  <span className="shrink-0 text-fg-dim">{i + 1}.</span>
                  <span>{step.title}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={approve}
            disabled={loading !== null}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25',
              loading !== null && 'opacity-50 cursor-not-allowed',
            )}
          >
            {loading === 'approve' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}
