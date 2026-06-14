const DEFAULT_DURATION_MS = 220
const DEFAULT_GAP_MS = 90
const DEFAULT_VOLUME = 0.2

type OscillatorShape = OscillatorType

export type SoundId = 'none' | 'beep' | 'chime' | 'bell' | 'pulse'

export interface SoundPlaybackOptions {
  volume?: number
  durationMs?: number
  loopCount?: number
  gapMs?: number
}

interface SoundStep {
  frequency: number
  durationMs: number
  volume: number
  type: OscillatorShape
}

export interface BrowserSoundControllerOptions {
  enabled?: boolean
  volume?: number
  audioContext?: AudioContext
}

export class BrowserSoundController {
  private readonly providedAudioContext: AudioContext | undefined
  private readonly baseVolume: number
  private enabled: boolean
  private ownedAudioContext: AudioContext | null = null
  private readonly activeNodes = new Set<OscillatorNode>()

  constructor(options: BrowserSoundControllerOptions = {}) {
    this.providedAudioContext = options.audioContext
    this.baseVolume = clampVolume(options.volume ?? DEFAULT_VOLUME)
    this.enabled = options.enabled ?? true
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.stop()
    }
  }

  async play(soundId: SoundId, options: SoundPlaybackOptions = {}): Promise<void> {
    if (!this.enabled || soundId === 'none') return
    if (!hasWebAudioSupport()) return

    const audioContext = this.getAudioContext()
    if (audioContext === null) return
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const steps = getSoundPattern(soundId, options, this.baseVolume)
    const loopCount = Math.max(1, options.loopCount ?? 1)
    const gapMs = Math.max(0, options.gapMs ?? DEFAULT_GAP_MS)
    let startAt = audioContext.currentTime

    for (let loopIndex = 0; loopIndex < loopCount; loopIndex += 1) {
      for (const step of steps) {
        this.scheduleStep(audioContext, step, startAt)
        startAt += step.durationMs / 1000
      }

      startAt += gapMs / 1000
    }
  }

  stop(): void {
    for (const node of this.activeNodes) {
      node.stop()
      node.disconnect()
    }

    this.activeNodes.clear()
  }

  async preview(soundId: SoundId): Promise<void> {
    await this.play(soundId, { loopCount: 1 })
  }

  destroy(): void {
    this.stop()

    if (this.ownedAudioContext !== null) {
      void this.ownedAudioContext.close()
      this.ownedAudioContext = null
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.providedAudioContext !== undefined) {
      return this.providedAudioContext
    }

    if (!hasWebAudioSupport()) {
      return null
    }

    this.ownedAudioContext ??= new AudioContext()

    return this.ownedAudioContext
  }

  private scheduleStep(audioContext: AudioContext, step: SoundStep, startAt: number): void {
    const gainNode = audioContext.createGain()
    const oscillator = audioContext.createOscillator()
    const stopAt = startAt + (step.durationMs / 1000)

    oscillator.type = step.type
    oscillator.frequency.setValueAtTime(step.frequency, startAt)

    gainNode.gain.setValueAtTime(0.0001, startAt)
    gainNode.gain.exponentialRampToValueAtTime(step.volume, startAt + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.onended = () => {
      this.activeNodes.delete(oscillator)
      oscillator.disconnect()
      gainNode.disconnect()
    }

    this.activeNodes.add(oscillator)
    oscillator.start(startAt)
    oscillator.stop(stopAt)
  }
}

export function hasWebAudioSupport(): boolean {
  return typeof globalThis.AudioContext !== 'undefined'
}

function getSoundPattern(soundId: SoundId, options: SoundPlaybackOptions, baseVolume: number): SoundStep[] {
  const durationMs = Math.max(50, options.durationMs ?? DEFAULT_DURATION_MS)
  const volume = clampVolume(options.volume ?? baseVolume)

  switch (soundId) {
    case 'beep':
      return [{ frequency: 880, durationMs, volume, type: 'sine' }]

    case 'chime':
      return [523.25, 659.25, 783.99].map((frequency) => ({
        frequency,
        durationMs: Math.max(120, Math.round(durationMs * 0.7)),
        volume,
        type: 'sine',
      }))

    case 'bell':
      return [440, 660, 880].map((frequency, index) => ({
        frequency,
        durationMs: durationMs + (index * 40),
        volume: clampVolume(volume - (index * 0.03)),
        type: 'triangle',
      }))

    case 'pulse':
      return [740, 740, 988].map((frequency, index) => ({
        frequency,
        durationMs: index === 2 ? durationMs : Math.max(90, Math.round(durationMs * 0.45)),
        volume,
        type: 'square',
      }))

    case 'none':
      return []

    default:
      throw new Error(`Unsupported sound id: ${String(soundId)}`)
  }
}

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0.0001, value))
}