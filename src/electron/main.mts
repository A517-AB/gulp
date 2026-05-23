import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { registerSdkHandlers } from './jules/handlers.js';
import { registerGitHandlers } from './git/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[Electron Main] Starting Electron process...');

let mainWindow: BrowserWindow | null = null;

const createWindow = async (): Promise<BrowserWindow> => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env['VITE_DEV_SERVER_URL'];

  try {
    if (devUrl) {
      await win.loadURL(devUrl);
    } else {
      await win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } catch (error: unknown) {
    console.error('Failed to load app:', error instanceof Error ? error.message : error);
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
};

app.whenReady()
  .then(async () => {
    ipcMain.handle('ping', () => 'pong');

    ipcMain.on('window-minimize', () => mainWindow?.minimize());

    ipcMain.on('window-maximize', () => {
      if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow?.maximize();
      }
    });

    ipcMain.on('window-close', () => mainWindow?.close());

    mainWindow = await createWindow();
    registerSdkHandlers();
    registerGitHandlers();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error('App initialization failed:', error instanceof Error ? error.message : error);
  });

app.on('window-all-closed', () => {
  app.quit();
});
