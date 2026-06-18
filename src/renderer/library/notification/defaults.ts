import type { SoundId } from './types'

const KEY = 'gulp:notif-defaults'

export interface NotifDefaults {
    sound: SoundId
    duration: number
}

const FALLBACK: NotifDefaults = { sound: 'chime', duration: 5000 }

export function getDefaults(): NotifDefaults {
    try {
        return { ...FALLBACK, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<NotifDefaults>) }
    } catch {
        return FALLBACK
    }
}

export function saveDefaults(d: Partial<NotifDefaults>): void {
    localStorage.setItem(KEY, JSON.stringify({ ...getDefaults(), ...d }))
}
