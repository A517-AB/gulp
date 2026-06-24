import type {JulesGitHubIPC} from '@shared/jules-ipc'
import {useJulesCtx} from './context'

export function useJulesGitHub(): JulesGitHubIPC | null {
    return useJulesCtx()?.github ?? null
}
