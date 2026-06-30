import {createContext} from 'react'
import type {Packages} from '../types/Packages'

interface PythonContextValue {
    packages: Packages
    timeout: number
    terminateOnCompletion: boolean
    autoImportPackages: boolean
    sendInput: (id: string, value: string) => void
    workerAwaitingInputIds: string[]
    getPrompt: (id: string) => string | undefined
}

const PythonContext = createContext<PythonContextValue>({
    packages: {},
    timeout: 0,
    terminateOnCompletion: false,
    autoImportPackages: true,
    sendInput: () => { /* no-op: input() not supported */
    },
    workerAwaitingInputIds: [],
    getPrompt: () => undefined,
})

export const suppressedMessages = ['Python initialization complete']

interface PythonProviderProps {
    packages?: Packages
    timeout?: number
    terminateOnCompletion?: boolean
    autoImportPackages?: boolean
    children: React.ReactNode
}

function PythonProvider(props: PythonProviderProps) {
    const {
        packages = {},
        timeout = 0,
        terminateOnCompletion = false,
        autoImportPackages = true,
    } = props

    return (
        <PythonContext.Provider
            value={{
                packages,
                timeout,
                terminateOnCompletion,
                autoImportPackages,
                sendInput: () => { /* no-op */
                },
                workerAwaitingInputIds: [],
                getPrompt: () => undefined,
            }}
            {...props}
        />
    )
}

export {PythonContext, PythonProvider}
