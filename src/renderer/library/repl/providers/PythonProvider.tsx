import {createContext} from 'react'
import type {Packages} from '../types/Packages'

const PythonContext = createContext({
    packages: {},
    timeout: 0,
    lazy: false,
    terminateOnCompletion: false,
    autoImportPackages: true,
    sendInput: (_id: string, _value: string) => { /* no-op: input() not supported */
    },
    workerAwaitingInputIds: [] as string[],
    getPrompt: (_id: string) => undefined as string | undefined,
})

export const suppressedMessages = ['Python initialization complete']

interface PythonProviderProps {
    packages?: Packages
    timeout?: number
    lazy?: boolean
    terminateOnCompletion?: boolean
    autoImportPackages?: boolean
    children: React.ReactNode
}

function PythonProvider(props: PythonProviderProps) {
    const {
        packages = {},
        timeout = 0,
        lazy = false,
        terminateOnCompletion = false,
        autoImportPackages = true,
    } = props

    return (
        <PythonContext.Provider
            value={{
                packages,
                timeout,
                lazy,
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
