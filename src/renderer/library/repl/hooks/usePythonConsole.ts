import {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {PythonContext, suppressedMessages} from '../providers/PythonProvider'
import type {Remote} from 'comlink'
import {proxy, wrap} from 'comlink'
import useFilesystem from './useFilesystem'

import type {Packages} from '../types/Packages'
import type {PythonRunner} from '../types/Runner'
import type {ConsoleState} from '../types/Console'
import {ConsoleStates} from '../types/Console'

interface UsePythonConsoleProps {
    packages?: Packages
}

export default function usePythonConsole(props?: UsePythonConsoleProps) {
    const {packages = {}} = props ?? {}

    const [runnerId, setRunnerId] = useState<string>()
    const [banner, setBanner] = useState<string | undefined>()
    const [consoleState, setConsoleState] = useState<ConsoleState>()
    const [isRunning, setIsRunning] = useState(false)
    const [stdout, setStdout] = useState('')
    const [stderr, setStderr] = useState('')

    const {
        packages: globalPackages,
        timeout,
        autoImportPackages,
        sendInput,
        workerAwaitingInputIds,
        getPrompt
    } = useContext(PythonContext)

    const workerRef = useRef<Worker | undefined>(undefined)
    const runnerRef = useRef<Remote<PythonRunner> | undefined>(undefined)
    const outputRef = useRef<string[]>([])

    const {
        readFile,
        writeFile,
        mkdir,
        rmdir,
        watchModules,
        unwatchModules,
        watchedModules
    } = useFilesystem({runner: runnerRef?.current})

    const createWorker = () => {
        const worker = new Worker(
            new URL('../workers/python-worker', import.meta.url),
            {type: 'module'}
        )
        workerRef.current = worker
    }

    useEffect(() => {
        // Spawn worker eagerly on mount
        createWorker()

        // Cleanup worker on unmount
        return () => {
            cleanup()
        }
    }, [])

    const allPackages = useMemo(() => {
        const official = [
            ...new Set([
                ...(globalPackages.official ?? []),
                ...(packages.official ?? [])
            ])
        ]
        const micropip = [
            ...new Set([
                ...(globalPackages.micropip ?? []),
                ...(packages.micropip ?? [])
            ])
        ]
        return [official, micropip]
    }, [globalPackages, packages])

    const isReady = !!runnerId

    useEffect(() => {
        if (workerRef.current && !isReady) {
            const init = async () => {
                try {
                    const runner: Remote<PythonRunner> = wrap(workerRef.current as Worker)
                    runnerRef.current = runner

                    await runner.init(
                        proxy((msg: string) => {
                            // Suppress messages that are not useful for the user
                            if (suppressedMessages.includes(msg)) {
                                return
                            }
                            outputRef.current.push(msg)
                        }),
                        proxy(({id, version, banner}) => {
                            setRunnerId(id)
                            setBanner(banner)
                            console.debug('Loaded pyodide version:', version)
                        }),
                        'console',
                        allPackages
                    )
                } catch (error) {
                    console.error('Error loading Pyodide:', error)
                }
            }
            init()
        }
    }, [workerRef.current])

    // prettier-ignore
    const moduleReloadCode = (modules: Set<string>) => `
import importlib
import sys
${Array.from(modules).map((name) => `
if """${name}""" in sys.modules:
    importlib.reload(sys.modules["""${name}"""])
`).join('')}
del importlib
del sys
`

    const runPython = useCallback(
        async (code: string) => {
            // Clear stdout and stderr
            outputRef.current = []
            setStdout('')
            setStderr('')

            if (!isReady) {
                throw new Error('Pyodide is not loaded yet')
            }
            let timeoutTimer
            try {
                setIsRunning(true)
                if (!isReady || !runnerRef.current) {
                    throw new Error('Pyodide is not loaded yet')
                }
                if (timeout > 0) {
                    timeoutTimer = setTimeout(() => {
                        setStdout('')
                        setStderr(`Execution timed out. Reached limit of ${timeout} ms.`)
                        interruptExecution()
                    }, timeout)
                }
                if (watchedModules.size > 0) {
                    await runnerRef.current.run(
                        moduleReloadCode(watchedModules),
                        autoImportPackages
                    )
                }
                const runResult = await runnerRef.current.run(code, autoImportPackages)
                const {state, error} = runResult ?? {}
                setStdout(outputRef.current.join(''))
                setConsoleState(ConsoleStates[state as keyof typeof ConsoleStates])
                if (error) {
                    setStderr(error)
                }
            } catch (error: unknown) {
                console.error('Error pushing to console:', error)
            } finally {
                setIsRunning(false)
                clearTimeout(timeoutTimer)
            }
        },
        [isReady, timeout, watchedModules]
    )

    const interruptExecution = () => {
        cleanup()
        setIsRunning(false)
        setRunnerId(undefined)
        setBanner(undefined)
        setConsoleState(undefined)
        outputRef.current = []

        // Spawn new worker
        createWorker()
    }

    const cleanup = () => {
        if (!workerRef.current) {
            return
        }
        console.debug('Terminating worker')
        workerRef.current.terminate()
    }

    const isAwaitingInput =
        !!runnerId && workerAwaitingInputIds.includes(runnerId)

    const sendUserInput = (value: string) => {
        if (!runnerId) {
            console.error('No runner id')
            return
        }
        sendInput(runnerId, value)
    }

    const getCompletions = useCallback(
        async (text: string): Promise<string[]> => {
            if (!runnerRef.current) return []
            try {
                return await runnerRef.current.getCompletions(text)
            } catch (err) {
                console.error('Failed to get completions:', err)
                return []
            }
        },
        []
    )

    return {
        runPython,
        stdout,
        stderr,
        isReady,
        isRunning,
        interruptExecution,
        readFile,
        writeFile,
        mkdir,
        rmdir,
        watchModules,
        unwatchModules,
        banner,
        consoleState,
        isAwaitingInput,
        sendInput: sendUserInput,
        prompt: runnerId ? getPrompt(runnerId) : '',
        getCompletions
    }
}
