import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc'
import { createMainWindow } from './window'

console.info('[electron:main] waiting for app readiness')
await app.whenReady()
console.info('[electron:main] app ready')

registerIpcHandlers()
console.info('[electron:main] ipc handlers registered')
await createMainWindow()
console.info('[electron:main] main window bootstrapped')

app.on('activate', () => {
  console.info('[electron:main] activate event received')
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow()
  }
})

app.on('window-all-closed', () => {
  console.info('[electron:main] all windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})