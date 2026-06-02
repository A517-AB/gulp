import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimerPreset, SoundId } from '@shared/hub'
import { playSound } from '../sounds'
import { dispatch } from '../bus'

const STORAGE_KEY = 'hub:timer:presets'

const DEFAULT_PRESETS: TimerPreset[] = [
  { id: 'p5',  label: '5 min',  duration: 300,  sound: 'chime',  locked: true },
  { id: 'p10', label: '10 min', duration: 600,  sound: 'chime',  locked: true },
  { id: 'p25', label: '25 min', duration: 1500, sound: 'bell',   locked: true },
  { id: 'p45', label: '45 min', duration: 2700, sound: 'bell',   locked: true },
]

function loadPresets(): TimerPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PRESETS
    const parsed = JSON.parse(raw) as TimerPreset[]
    // merge: keep defaults if missing
    const ids = new Set(parsed.map((p) => p.id))
    const missing = DEFAULT_PRESETS.filter((p) => !ids.has(p.id))
    return [...parsed, ...missing]
  } catch { return DEFAULT_PRESETS }
}

function savePresets(presets: TimerPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export type TimerState = 'idle' | 'running' | 'paused' | 'done'

export function useTimer() {
  const [presets, setPresets]       = useState<TimerPreset[]>(loadPresets)
  const [remaining, setRemaining]   = useState(0)
  const [total, setTotal]           = useState(0)
  const [state, setState]           = useState<TimerState>('idle')
  const [activeSound, setActiveSound] = useState<SoundId>('chime')
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const finish = useCallback((sound: SoundId) => {
    clear()
    setState('done')
    void playSound(sound)
    dispatch({
      id:        crypto.randomUUID(),
      channel:   'system',
      title:     'Timer done',
      sound,
      actions:   ['dismiss'],
      timestamp: new Date().toISOString(),
    })
  }, [])

  const start = useCallback((duration: number, sound: SoundId) => {
    clear()
    setTotal(duration)
    setRemaining(duration)
    setActiveSound(sound)
    setState('running')

    let left = duration
    intervalRef.current = setInterval(() => {
      left -= 1
      setRemaining(left)
      if (left <= 0) finish(sound)
    }, 1000)
  }, [finish])

  const pause = useCallback(() => {
    clear()
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    if (state !== 'paused' || remaining <= 0) return
    setState('running')
    let left = remaining
    intervalRef.current = setInterval(() => {
      left -= 1
      setRemaining(left)
      if (left <= 0) finish(activeSound)
    }, 1000)
  }, [state, remaining, activeSound, finish])

  const reset = useCallback(() => {
    clear()
    setRemaining(0)
    setTotal(0)
    setState('idle')
  }, [])

  const startPreset = useCallback((preset: TimerPreset) => {
    start(preset.duration, preset.sound)
  }, [start])

  const addPreset = (preset: Omit<TimerPreset, 'id'>) => {
    const p = { ...preset, id: crypto.randomUUID() }
    const next = [...presets, p]
    setPresets(next)
    savePresets(next)
  }

  const removePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id || p.locked)
    setPresets(next)
    savePresets(next)
  }

  useEffect(() => () => { clear() }, [])

  const progress = total > 0 ? (total - remaining) / total : 0

  return {
    presets, state, remaining, total, progress,
    start, pause, resume, reset, startPreset,
    addPreset, removePreset,
  }
}

export function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
