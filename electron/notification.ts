import { BrowserWindow, ipcMain, screen } from 'electron'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WebContents } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const WIDTH    = 340
const HEIGHT   = 96
const OFFSET   = 12

let win: BrowserWindow | null = null

function getOrCreateWindow(): BrowserWindow {
  if (win && !win.isDestroyed()) return win

  const { x, y, width, height } = screen.getPrimaryDisplay().workArea

  win = new BrowserWindow({
    width:         WIDTH,
    height:        HEIGHT,
    x:             x + width  - WIDTH  - OFFSET,
    y:             y + height - HEIGHT - OFFSET,
    frame:         false,
    transparent:   true,
    alwaysOnTop:   true,
    skipTaskbar:   true,
    resizable:     false,
    movable:       false,
    focusable:     false,
    show:          false,
    webPreferences: {
      preload:              path.join(__dirname, 'notification-preload.mjs'),
      contextIsolation:     true,
      nodeIntegration:      false,
      backgroundThrottling: false,
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')

  const isDev  = process.env.NODE_ENV === 'development'
  const devUrl = process.env.VITE_DEV_SERVER_URL

  if (isDev && devUrl) {
    void win.loadURL(`${devUrl}notification.html`)
  } else {
    void win.loadFile(path.join(__dirname, '../dist/notification.html'))
  }

  win.on('closed', () => { win = null })

  return win
}

export function registerUINotificationHandlers(getWebContents: () => WebContents | null): void {
  ipcMain.on('uikit:notification', (_e, info) => {
    if (!info) {
      win?.close()
      return
    }

    const w = getOrCreateWindow()

    if (w.isVisible()) {
      w.webContents.send('notification:show', info)
    } else {
      w.once('ready-to-show', () => {
        w.webContents.send('notification:show', info)
        w.showInactive()
      })
      if (w.webContents.isLoading()) return
      w.webContents.send('notification:show', info)
      w.showInactive()
    }
  })

  ipcMain.on('notification:close', (_e) => {
    BrowserWindow.fromWebContents(_e.sender)?.close()
  })

  ipcMain.on('notification:click', (_e, extraData) => {
    getWebContents()?.send('uinotification.click', extraData)
    BrowserWindow.fromWebContents(_e.sender)?.close()
  })

  ipcMain.on('notification:cancel', (_e, extraData) => {
    getWebContents()?.send('uinotification.cancel', extraData)
    BrowserWindow.fromWebContents(_e.sender)?.close()
  })
}
