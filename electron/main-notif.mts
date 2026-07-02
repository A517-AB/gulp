import {app, Menu, nativeImage, Tray} from 'electron'
import log from 'electron-log/main'
import {
    prewarmNotificationWindow,
    registerNotifLogHandlers,
    registerSchedulerHandlers,
    registerUINotificationHandlers
} from './notifications/index.js'

log.initialize()
Object.assign(console, log.functions)

function buildTrayIcon(): ReturnType<typeof nativeImage.createFromBuffer> {
  const size = 16
  const buf = Buffer.alloc(size * size * 4, 0)
  const R = 8.0
  const sqrt3 = Math.sqrt(3)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - size / 2 + 0.5)
      const dy = Math.abs(y - size / 2 + 0.5)
      const idx = (y * size + x) * 4

      if (dy <= R * (sqrt3 / 2) && (dy + sqrt3 * dx <= sqrt3 * R)) {
        buf[idx] = 139; buf[idx + 1] = 92; buf[idx + 2] = 246; buf[idx + 3] = 255
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Fix 60-second startup delay on Windows caused by WPAD (Web Proxy Auto-Discovery) timing out
app.commandLine.appendSwitch("no-proxy-server");

void app.whenReady().then(() => {
  console.log('[notif-main] notification daemon starting')

  registerUINotificationHandlers(() => null)
  registerNotifLogHandlers()
  prewarmNotificationWindow()
    registerSchedulerHandlers()

  const tray = new Tray(buildTrayIcon())
  tray.setToolTip('Last — Notifications')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Quit', click: () => { app.quit() } },
  ]))

  console.log('[notif-main] ready')
})

app.on('window-all-closed', () => {
  // intentionally empty — tray-only app stays running
})
