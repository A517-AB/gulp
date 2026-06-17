import {ipcMain} from 'electron'
import Store from 'electron-store'

export const store = new Store()

export function registerStoreHandlers() {
    ipcMain.handle('store:get', (_, key: string) =>
        store.get(key) ?? null
    )
    ipcMain.handle('store:set', (_, key: string, value: unknown) => {
        store.set(key, value as string)
    })
    ipcMain.handle('store:delete', (_, key: string) => {
        store.delete(key)
    })
}
