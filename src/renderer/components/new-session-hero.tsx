import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { PresetPicker } from '@/components/preset-picker'
import { applyPreset } from '@/lib/presets'
import type { Preset } from '@/lib/presets'

interface NewSessionHeroProps {
  presets: Preset[]
  onSubmit: (prompt: string) => void | Promise<void>
  isSending?: boolean
  placeholder?: string
}

export function NewSessionHero({ presets, onSubmit, isSending = false, placeholder = "What should Jules work on?" }: NewSessionHeroProps) {
  const [input, setInput] = useState('')

  function handleSend() {
    if (!input.trim() || isSending) return
    const currentInput = input.trim()
    setInput('')
    void onSubmit(currentInput)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 bg-base">
      <p className="text-sm text-fg-dim">Start a new session or select one from the list</p>
      <div className="w-full max-w-lg space-y-2">
        <div className="rounded-lg border border-hair bg-surface px-3 py-2 focus-within:border-moderate transition-colors shadow-sm">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={placeholder}
            rows={3}
            disabled={isSending}
            className="w-full resize-none bg-transparent text-sm text-fg-primary placeholder:text-fg-ghost outline-none leading-relaxed"
          />
        </div>
        <div className="flex items-center justify-between">
          <PresetPicker
            presets={presets}
            onSelect={p => setInput(applyPreset(p, input))}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            New session
          </button>
        </div>
      </div>
    </div>
  )
}
