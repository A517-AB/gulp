import type {LucideIcon} from 'lucide-react'
import {Bell, Clock, Diamond, Flag, Sparkles, Star, Zap} from 'lucide-react'

export type NotifIconId = 'bell' | 'clock' | 'diamond' | 'flag' | 'zap' | 'sparkles' | 'star'

export const NOTIF_ICONS: Record<NotifIconId, LucideIcon> = {
    bell: Bell,
    clock: Clock,
    diamond: Diamond,
    flag: Flag,
    zap: Zap,
    sparkles: Sparkles,
    star: Star,
}

export const NOTIF_ICON_IDS = Object.keys(NOTIF_ICONS) as NotifIconId[]

export function resolveNotifIcon(id: string | undefined): LucideIcon | undefined {
    if (id === undefined) return undefined
    return Object.prototype.hasOwnProperty.call(NOTIF_ICONS, id) ? NOTIF_ICONS[id as NotifIconId] : undefined
}
