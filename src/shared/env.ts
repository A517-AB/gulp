import type {ElectronAPI} from './electron'

const el: ElectronAPI | undefined =
    typeof globalThis !== 'undefined' && 'electron' in globalThis
        ? (globalThis as unknown as { electron: ElectronAPI }).electron
        : undefined

export const isElectron = !!el?.window
export const isWeb = !isElectron

console.log(`[env] ${isElectron ? 'electron' : 'web'}`)
