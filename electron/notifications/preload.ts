import {contextBridge, ipcRenderer} from 'electron'

contextBridge.exposeInMainWorld('notif', {
    onShow: (cb: (data: unknown) => void) => {
        ipcRenderer.on('notif.show', (_e, data) => {
            cb(data)
        })
    },
    clicked: (actionId: string, extraData?: unknown) => {
        ipcRenderer.send('notif.internal.clicked', {actionId, extraData})
    },
    dismissed: (extraData?: unknown) => {
        ipcRenderer.send('notif.internal.dismissed', extraData)
    },
})
