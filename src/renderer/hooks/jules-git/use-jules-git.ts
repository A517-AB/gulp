import type {JulesGitIPC} from '@shared/jules-ipc'
import {useJulesCtx} from './context'

export function useJulesGit(): JulesGitIPC | null {
    return useJulesCtx()?.git ?? null
}
