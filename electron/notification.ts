import type {WebContents} from 'electron'
import {BrowserWindow, ipcMain, screen} from 'electron'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const WIDTH  = 340
const HEIGHT = 360
const OFFSET = 12

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

  win.once('ready-to-show', () => { win?.showInactive() })
  win.on('closed', () => { win = null })

  return win
}

function send(payload: unknown): void {
  const w = getOrCreateWindow()
  if (w.webContents.isLoading()) {
    w.once('ready-to-show', () => { w.webContents.send('notification:show', payload) })
  } else {
    w.webContents.send('notification:show', payload)
  }
}

export function prewarmNotificationWindow(): void {
  getOrCreateWindow()
}

export function dispatchNotification(payload: unknown): void {
  send(payload)
}

export function registerUINotificationHandlers(getWebContents: () => WebContents | null): void {
  ipcMain.on('uikit:notification', (_e, info) => { if (info) send(info) })

  ipcMain.on('notification:click', (_e, extraData) => {
    getWebContents()?.send('uinotification.click', extraData)
  })

  ipcMain.on('notification:cancel', (_e, extraData) => {
    getWebContents()?.send('uinotification.cancel', extraData)
  })
}
