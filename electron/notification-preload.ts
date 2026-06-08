import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('notif', {
  onShow: (cb: (data: unknown) => void) => {
    ipcRenderer.on('notification:show', (_e, data) => { cb(data) })
  },
  click: (extraData?: unknown) => {
    ipcRenderer.send('notification:click', extraData)
  },
  cancel: (extraData?: unknown) => {
    ipcRenderer.send('notification:cancel', extraData)
  },
})
