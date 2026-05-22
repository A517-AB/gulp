import { BrowserWindow, shell } from 'electron'
import { resolve } from 'node:path'
import { rendererDevUrl, rendererHtmlPath } from './paths'

export async function createMainWindow() {
  const preloadPath = resolve(import.meta.dirname, 'preload.mjs')
  console.info('[electron:window] creating BrowserWindow', {
    preloadPath,
    rendererDevUrl: rendererDevUrl ?? null,
  })

  const window = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5efe4',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  window.on('ready-to-show', () => {
    console.info('[electron:window] ready-to-show')
    window.show()
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    console.info('[electron:window] external url requested', { url })
    void shell.openExternal(url)

    return { action: 'deny' }
  })

  if (rendererDevUrl) {
    console.info('[electron:window] loading renderer dev server')
    await window.loadURL(rendererDevUrl)
    return window
  }

  console.info('[electron:window] loading built renderer html')
  await window.loadFile(rendererHtmlPath)
  return window
}