import {createContext, useContext} from 'react'
import type {ReactNode} from 'react'
import type {JulesIPC} from '@shared/jules-ipc'

const Ctx = createContext<JulesIPC | null>(null)

export function JulesProvider({children}: { children: ReactNode }) {
    return <Ctx value={window.jules ?? null}>{children}</Ctx>
}

export function useJulesCtx(): JulesIPC | null {
    return useContext(Ctx)
}
