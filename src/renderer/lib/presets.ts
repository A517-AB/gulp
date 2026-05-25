export type PresetAfter = 'copy' | 'save' | 'chain' | 'repeat' | 'none'

export interface Preset {
  id: string
  name: string
  prompt: string
  after: PresetAfter
  savePath?: string
  chainDepth?: number
}

const KEY = 'jules:presets'

export function getPresets(): Preset[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Preset[]
  } catch {
    return []
  }
}

export function savePresets(presets: Preset[]): void {
  localStorage.setItem(KEY, JSON.stringify(presets))
}

export function createPreset(p: Omit<Preset, 'id'>): Preset {
  return { ...p, id: crypto.randomUUID() }
}

export function deletePreset(presets: Preset[], id: string): Preset[] {
  return presets.filter(p => p.id !== id)
}

export function updatePreset(presets: Preset[], updated: Preset): Preset[] {
  return presets.map(p => p.id === updated.id ? updated : p)
}

export function applyPreset(preset: Preset, input: string): string {
  return preset.prompt.replace(/\{input\}/g, input)
}
