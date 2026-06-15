import {ipcMain} from 'electron'
import {jules} from '@google/jules-sdk'
import type {SelectOptions} from '@google/jules-sdk/types'
import {serialize, send} from './util'

interface ListOptions {
    pageSize?: number;
    pageToken?: string;
    filter?: string
}

export function registerActivityHandlers() {

    ipcMain.handle('sdk:activities.hydrate', async (_, id: string) =>
        serialize(await jules.session(id).activities.hydrate())
    )

    ipcMain.handle('sdk:activities.select', async (_, id: string, options?: SelectOptions) =>
        serialize(await jules.session(id).activities.select(options))
    )

    ipcMain.handle('sdk:activities.list', async (_, id: string, options?: ListOptions) =>
        serialize(await jules.session(id).activities.list(options))
    )

    ipcMain.handle('sdk:activities.get', async (_, id: string, activityId: string) =>
        serialize(await jules.session(id).activities.get(activityId))
    )

    ipcMain.handle('sdk:activities.history.start', async (event, id: string) => {
        for await (const item of jules.session(id).activities.history()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:activities.history:${id}`, item)
        }
        send(event.sender, `sdk:activities.history.done:${id}`)
    })

    ipcMain.handle('sdk:activities.updates.start', async (event, id: string) => {
        for await (const item of jules.session(id).activities.updates()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:activities.updates:${id}`, item)
        }
        send(event.sender, `sdk:activities.updates.done:${id}`)
    })

    ipcMain.handle('sdk:activities.stream.start', async (event, id: string) => {
        for await (const item of jules.session(id).activities.stream()) {
            if (event.sender.isDestroyed()) break
            send(event.sender, `sdk:activities.stream:${id}`, item)
        }
        send(event.sender, `sdk:activities.stream.done:${id}`)
    })
}
