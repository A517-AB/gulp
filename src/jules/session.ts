import type { SessionResource } from '@google/jules-sdk/types'

export type SessionStatus = SessionResource['state']

export interface SessionStatusInfo {
    color: string
    bgColor: string
    label: string
    icon: string
}

export interface SessionInitialValues {
    sourceId?: string
    title?: string
    prompt?: string
    startingBranch?: string
}
