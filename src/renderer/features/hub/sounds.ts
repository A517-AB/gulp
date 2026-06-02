import type { SoundId } from '@shared/hub'

export const SOUND_LABELS: Record<SoundId, string> = {
  none:   'Silent',
  chime:  'Chime',
  bell:   'Bell',
  beep:   'Beep',
  soft:   'Soft',
  urgent: 'Urgent',
}

async function ctx(): Promise<AudioContext> {
  const c = new AudioContext()
  await c.resume()
  return c
}

function schedule(
  c: AudioContext,
  freq: number,
  type: OscillatorType,
  startAt: number,
  duration: number,
  volume = 0.3,
) {
  const osc  = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01)
  gain.gain.setValueAtTime(volume, startAt + duration - 0.02)
  gain.gain.linearRampToValueAtTime(0, startAt + duration)
  osc.start(startAt)
  osc.stop(startAt + duration)
}

const players: Record<SoundId, (c: AudioContext) => void> = {
  none: () => {},

  chime: (c) => {
    // three descending tones
    const notes = [880, 698, 523]
    notes.forEach((freq, i) => {
      schedule(c, freq, 'sine', c.currentTime + i * 0.18, 0.4, 0.25)
    })
  },

  bell: (c) => {
    // single resonant bell
    schedule(c, 523, 'sine', c.currentTime, 1.2, 0.3)
    schedule(c, 1046, 'sine', c.currentTime, 0.4, 0.1)
  },

  beep: (c) => {
    // two short beeps
    schedule(c, 1200, 'square', c.currentTime, 0.08, 0.2)
    schedule(c, 1200, 'square', c.currentTime + 0.15, 0.08, 0.2)
  },

  soft: (c) => {
    // gentle single sine
    schedule(c, 440, 'sine', c.currentTime, 0.8, 0.15)
  },

  urgent: (c) => {
    // rapid four-beep pattern
    for (let i = 0; i < 4; i++) {
      schedule(c, 1400, 'square', c.currentTime + i * 0.12, 0.08, 0.25)
    }
  },
}

/** Play a sound once. Fire-and-forget. */
export async function playSound(id: SoundId): Promise<void> {
  if (id === 'none') return
  try {
    const c = await ctx()
    players[id]?.(c)
    setTimeout(() => { c.close().catch(() => {}) }, 3000)
  } catch { /* AudioContext unavailable */ }
}

// ── Looping alarm sound ───────────────────────────────────────────────────────

class LoopManager {
  private active = new Map<string, { stop: () => void }>()

  play(id: string, sound: SoundId) {
    if (this.active.has(id) || sound === 'none') return
    let running = true
    let audioCtx: AudioContext | null = null

    const loop = async () => {
      try {
        if (!running) return
        audioCtx = await ctx()
        players[sound]?.(audioCtx)
        const dur = sound === 'urgent' ? 1200 : sound === 'bell' ? 2000 : 1500
        setTimeout(() => {
          audioCtx?.close().catch(() => {})
          if (running) loop()
        }, dur)
      } catch { /* ignore */ }
    }

    void loop()
    this.active.set(id, {
      stop: () => {
        running = false
        audioCtx?.close().catch(() => {})
        this.active.delete(id)
      },
    })
  }

  stop(id: string) {
    this.active.get(id)?.stop()
  }
}

export const alarmLoop = new LoopManager()
