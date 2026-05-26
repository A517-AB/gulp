import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Preset {
  id: string
  name: string
  prompt: string
  icon?: string
}

export interface SettingsStore {
  presets: Preset[]
  addPreset: (preset: Omit<Preset, 'id'>) => void
  updatePreset: (id: string, preset: Omit<Preset, 'id'>) => void
  deletePreset: (id: string) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      presets: [
        {
          id: 'default-code-review',
          name: 'Code Review',
          prompt: 'Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings.',
          icon: 'Play'
        }
      ],
      addPreset: (preset) => set((state) => ({
        presets: [...state.presets, { ...preset, id: crypto.randomUUID() }]
      })),
      updatePreset: (id, preset) => set((state) => ({
        presets: state.presets.map((p) => (p.id === id ? { ...p, ...preset } : p))
      })),
      deletePreset: (id) => set((state) => ({
        presets: state.presets.filter((p) => p.id !== id)
      }))
    }),
    {
      name: 'jules-settings'
    }
  )
)
