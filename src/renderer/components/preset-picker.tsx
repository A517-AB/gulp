import { ChevronDown, Zap } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils'
import type { Preset } from '@/lib/presets'

interface PresetPickerProps {
  presets: Preset[]
  onSelect: (preset: Preset) => void
  className?: string
}

export function PresetPicker({ presets, onSelect, className }: PresetPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (presets.length === 0) return null

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-fg-muted hover:text-fg-primary hover:bg-hover border border-hair transition-colors"
      >
        <Zap size={11} />
        <span>Presets</span>
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 min-w-48 rounded-lg border border-hair bg-surface shadow-lg py-1 overflow-hidden">
          {presets.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => { onSelect(preset); setOpen(false) }}
              className="w-full flex flex-col items-start gap-0.5 px-3 py-2 hover:bg-hover text-left transition-colors"
            >
              <span className="text-xs font-medium text-fg-primary">{preset.name}</span>
              <span className="text-[10px] text-fg-dim truncate max-w-full">
                {preset.prompt.slice(0, 60)}{preset.prompt.length > 60 ? '…' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
