import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";
import * as fs from "fs";

let popupWindow: BrowserWindow | null = null;

const POPUP_WIDTH  = 380;
const POPUP_HEIGHT = 520;

interface PopupConfig {
  preloadPath: string;
  isDev:       boolean;
  devUrl:      string;
  distDir:     string; // absolute path to the dist folder
}

let config: PopupConfig | null = null;

function getPosition(): { x: number; y: number } {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: width  - POPUP_WIDTH  - 20,
    y: height - POPUP_HEIGHT - 20,
  };
}

function create(): BrowserWindow {
  if (!config) throw new Error("[popup] not initialised — call registerPopupHandlers first");

  if (!fs.existsSync(config.preloadPath)) {
    console.log(`[popup] preload not found at ${config.preloadPath}`);
  }

  const win = new BrowserWindow({
    width:  POPUP_WIDTH,
    height: POPUP_HEIGHT,
    frame:       false,
    resizable:   false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show:        false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload:          config.preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  if (config.isDev) {
    void win.loadURL(config.devUrl + "/popup.html");
  } else {
    const prodFile = path.join(config.distDir, "popup.html");
    if (!fs.existsSync(prodFile)) {
      console.log(`[popup] popup.html not found at ${prodFile}`);
    }
    void win.loadFile(prodFile);
  }

  win.on("blur",   () => { win.hide(); });
  win.on("closed", () => { popupWindow = null; });

  return win;
}

function ensure(): BrowserWindow {
  if (!popupWindow) popupWindow = create();
  return popupWindow;
}

function show(): void {
  const win = ensure();
  const { x, y } = getPosition();
  win.setPosition(x, y);
  win.show();
  win.focus();
}

// ── public ─────────────────────────────────────────────────────────────────────

export function registerPopupHandlers(
  preloadPath: string,
  isDev:       boolean,
  devUrl:      string,
  distDir:     string,
): void {
  config = { preloadPath, isDev, devUrl, distDir };

  ipcMain.on("popup.show", () => { show(); });

  ipcMain.on("popup.hide", () => popupWindow?.hide());

  ipcMain.on("popup.close", () => popupWindow?.hide()); // Added popup.close mapping

  ipcMain.on("popup.notify", (_event, payload: unknown) => {
    show();
    popupWindow?.webContents.send("popup.notification", payload);
  });
}

export function togglePopup(): void {
  if (popupWindow?.isVisible()) {
    popupWindow.hide();
  } else {
    show();
  }
}
