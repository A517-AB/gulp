import { useState } from 'react'
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react'
import { useTimer, fmt } from './useTimer'
import { SOUND_LABELS } from '../sounds'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import type { SoundId } from '@shared/hub'
import { cn } from '@/utils'

export function TimerView() {
  const { presets, state, remaining, progress, pause, resume, reset, startPreset, addPreset, removePreset } = useTimer()
  const [expanded, setExpanded]   = useState(false)
  const [adding, setAdding]       = useState(false)
  const [newLabel, setNewLabel]   = useState('')
  const [newMins, setNewMins]     = useState('25')
  const [newSound, setNewSound]   = useState<SoundId>('chime')

  const isActive = state === 'running' || state === 'paused'

  function submitPreset() {
    const mins = parseInt(newMins, 10)
    if (!newLabel.trim() || isNaN(mins) || mins < 1) return
    addPreset({ label: newLabel.trim(), duration: mins * 60, sound: newSound, locked: false })
    setAdding(false)
    setNewLabel('')
    setNewMins('25')
  }

  const inner = (
    <div className={cn(
      'flex flex-col gap-6',
      expanded && 'h-full justify-center items-center',
    )}>
      {/* clock */}
      <div className={cn(
        'flex flex-col items-center gap-2',
        expanded && 'scale-150',
      )}>
        <span className={cn(
          'font-mono tabular-nums font-light',
          expanded ? 'text-8xl' : 'text-5xl',
          state === 'done' ? 'text-green-400' : 'text-fg-primary',
        )}>
          {fmt(remaining)}
        </span>

        {isActive && (
          <div className="w-48 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-fg-primary transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-3">
        {state === 'running' && (
          <Button size="sm" variant="outline" onClick={pause}>
            <Pause size={14} className="mr-1.5" /> Pause
          </Button>
        )}
        {state === 'paused' && (
          <Button size="sm" onClick={resume}>
            <Play size={14} className="mr-1.5" /> Resume
          </Button>
        )}
        {isActive && (
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw size={14} />
          </Button>
        )}
        {state === 'done' && (
          <Button size="sm" onClick={reset}>Done</Button>
        )}
      </div>

      {/* presets */}
      {!isActive && state !== 'done' && (
        <div className={cn('flex flex-wrap gap-2 justify-center', expanded && 'max-w-md')}>
          {presets.map((p) => (
            <div key={p.id} className="group relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { startPreset(p) }}
                className="pr-7"
              >
                <Play size={11} className="mr-1.5 opacity-60" />
                {p.label}
              </Button>
              {!p.locked && (
                <button
                  onClick={() => { removePreset(p.id) }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-destructive transition-all"
                  aria-label="Remove preset"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => { setAdding(true) }}>
            <Plus size={12} />
          </Button>
        </div>
      )}

      {/* add preset form */}
      {adding && (
        <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-surface max-w-xs mx-auto w-full">
          <div className="space-y-1">
            <Label>Label</Label>
            <Input
              value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value) }}
              placeholder="Focus block"
              onKeyDown={(e) => { if (e.key === 'Enter') submitPreset() }}
            />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <Label>Minutes</Label>
              <Input
                type="number"
                min={1}
                value={newMins}
                onChange={(e) => { setNewMins(e.target.value) }}
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label>Sound</Label>
              <Select value={newSound} onValueChange={(v) => { setNewSound(v as SoundId) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOUND_LABELS) as SoundId[]).map((id) => (
                    <SelectItem key={id} value={id}>{SOUND_LABELS[id]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={submitPreset}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false) }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )

  if (expanded) {
    return (
      <div className="fixed inset-0 z-40 bg-base flex flex-col">
        <div className="flex justify-end p-4">
          <Button size="sm" variant="ghost" onClick={() => { setExpanded(false) }}>
            <Minimize2 size={14} className="mr-1.5" /> Collapse
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {inner}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <Button size="sm" variant="ghost" onClick={() => { setExpanded(true) }}>
          <Maximize2 size={12} />
        </Button>
      </div>
      {inner}
    </div>
  )
}
