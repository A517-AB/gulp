import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { ActivityFeed } from '@/components/activity-feed'
import { GeneratedFileList } from '@/components/generated-file-list'
import { PresetPicker } from '@/components/preset-picker'
import { applyPreset } from '@/lib/presets'
import type { WsActivity, WsStatus, WsOutcome } from '@/hooks/use-session-ws'
import type { Preset } from '@/lib/presets'

interface ChatInterfaceProps {
  activities: WsActivity[]
  status: WsStatus
  outcome: WsOutcome | null
  error: string | null
  presets: Preset[]
  onSend: (prompt: string) => void | Promise<void>
  isTerminal?: boolean
  sending?: boolean
  placeholder?: string
  header?: React.ReactNode
  banner?: React.ReactNode
}

export function ChatInterface({
  activities,
  status,
  outcome,
  error,
  presets,
  onSend,
  isTerminal = false,
  sending = false,
  placeholder = 'Message Jules… (Enter to send)',
  header,
  banner,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [input])

  async function handleSend() {
    if (!input.trim() || isTerminal || sending) return
    const currentInput = input.trim()
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await onSend(currentInput)
    textareaRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base">
      {header}
      {banner}

      <ActivityFeed
        activities={activities}
        status={status}
        outcome={outcome}
        error={error}
      />

      {outcome?.generatedFiles && outcome.generatedFiles.length > 0 && (
        <GeneratedFileList files={outcome.generatedFiles} />
      )}

      <div className="shrink-0 border-t border-hair p-3 bg-surface/30">
        <div className="flex items-end gap-2 rounded-lg border border-hair bg-surface px-3 py-2 focus-within:border-moderate transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isTerminal || sending}
            placeholder={isTerminal ? 'Session ended' : placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-fg-primary placeholder:text-fg-ghost outline-none min-h-[1.5rem] max-h-32 overflow-y-auto disabled:opacity-50 leading-relaxed py-0.5"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
            <PresetPicker
              presets={presets}
              onSelect={p => setInput(applyPreset(p, input))}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isTerminal || sending}
              className="p-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
