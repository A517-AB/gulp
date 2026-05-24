import { useRef, useEffect, useState, type ReactNode } from 'react'
import { MessageSquare, Send, ChevronRight, ChevronLeft } from 'lucide-react'
import { ScrollArea } from '@/ui/scroll-area'
import { Input } from '@/ui/input'
import { Button } from '@/ui/button'
import { cn } from '@/utils'

export interface ChatMessage {
  id: string
  origin: 'agent' | 'user'
  message: string
  time: Date
}

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isActive: boolean
  canSend: boolean
  agentLabel?: string
}

export function ChatPanel({
  messages,
  onSend,
  isActive,
  canSend,
  agentLabel = 'Agent',
}: ChatPanelProps): ReactNode {
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    onSend(msg)
  }

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col items-center border-l border-hair bg-base pt-3">
        <Button size="icon-sm" variant="ghost" onClick={() => { setCollapsed(false) }} title="Open chat">
          <ChevronLeft className="size-3.5" />
        </Button>
        <div className="mt-2 flex flex-col items-center">
          <MessageSquare className="size-3.5 text-fg-dim" />
          {messages.length > 0 && (
            <span className="text-3xs font-mono text-fg-dim mt-1">{messages.length}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[320px] shrink-0 flex flex-col border-l border-hair bg-base">
      <div className="flex items-center justify-between px-4 h-toolbar border-b border-hair shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-3.5 text-fg-dim" />
          <span className="label-mono text-fg-ghost">{agentLabel}</span>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => { setCollapsed(true) }} title="Collapse chat">
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {messages.length === 0 && (
            <p className="label-mono text-fg-ghost text-center pt-8">
              {isActive ? 'Listening…' : 'No messages yet'}
            </p>
          )}
          {messages.map(entry => (
            <div
              key={entry.id}
              className={cn(
                'rounded-lg p-3 space-y-1',
                entry.origin === 'agent'
                  ? 'bg-raised border border-hair'
                  : 'bg-purple-600/10 border border-purple-500/20 ml-4',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-3xs font-mono uppercase tracking-widest',
                  entry.origin === 'agent' ? 'text-fg-dim' : 'text-purple-400',
                )}>
                  {entry.origin === 'agent' ? agentLabel : 'You'}
                </span>
                <span className="text-3xs font-mono text-fg-ghost">
                  {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xxs text-fg-secondary leading-relaxed whitespace-pre-wrap">
                {entry.message}
              </p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {canSend && (
        <div className="p-3 border-t border-hair shrink-0">
          <div className="flex gap-1.5">
            <Input
              value={input}
              onChange={e => { setInput(e.target.value) }}
              placeholder={`Message ${agentLabel}…`}
              className="font-mono text-2xs"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button size="icon-sm" onClick={handleSend} disabled={!input.trim()}>
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
