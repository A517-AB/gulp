import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('notif', {
  onShow: (cb: (data: unknown) => void) => {
    ipcRenderer.on('notif.show', (_e, data) => { cb(data) })
  },
  clicked: (extraData?: unknown) => {
    ipcRenderer.send('notif.internal.clicked', extraData)
  },
  dismissed: (extraData?: unknown) => {
    ipcRenderer.send('notif.internal.dismissed', extraData)
  },
})
