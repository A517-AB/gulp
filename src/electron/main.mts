import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[Electron Main] Starting Electron process...');

let mainWindow: BrowserWindow | null = null;

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
      await mainWindow.loadURL(devUrl);
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } catch (error: unknown) {
    console.error('Failed to load app:', error instanceof Error ? error.message : error);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady()
  .then(() => {
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

    void createWindow();

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
