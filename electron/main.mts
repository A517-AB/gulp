import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, powerMonitor } from "electron";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import log from "electron-log/main";

log.initialize();
Object.assign(console, log.functions);

import { registerTerminalHandlers } from "./Terminal";
import { registerQueuesHandlers } from "./queues";
import { registerFilesystemHandlers } from "./filesystem/handlers";
import { registerSnippetsHandlers } from "./snippets";
import { registerGitHandlers } from "./git";
import { registerGitHubHandlers } from "./github";
import { registerHistoryHandlers } from "./history";
import { registerNotesHandlers } from "./notes";
import { registerUINotificationHandlers, prewarmNotificationWindow } from "./notification";
import { registerSchedulerHandlers } from "./scheduler";
import { registerSdkHandlers } from "./ipc/handlers";
import { startJulesWorker, registerJulesEventsHandlers } from "./jules-events";
import { registerStoreHandlers } from "./store";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";



let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let forceQuit = false;

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

      // Flat-topped hexagon equation
      if (dy <= R * (sqrt3 / 2) && (dy + sqrt3 * dx <= sqrt3 * R)) {
        buf[idx] = 139; buf[idx + 1] = 92; buf[idx + 2] = 246; buf[idx + 3] = 255
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

// ── window ────────────────────────────────────────────────────────────────────
function createWindow() {
  const preloadPath = path.join(__dirname, "preload.mjs");
  console.log("[main] preload path:", preloadPath, "exists:", fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    frame: false,
      transparent: false,
    backgroundColor: "#000000", // prevents white flash on startup
    icon: isDev
      ? path.join(__dirname, "../public/icon.png")
      : path.join(__dirname, "../dist/icon.png"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    console.log("[main] loading dev URL:", DEV_URL);
    void mainWindow.loadURL(DEV_URL);
  } else {
    const prodFile = path.join(__dirname, "../dist/index.html");
    console.log("[main] loading prod file:", prodFile);
    void mainWindow.loadFile(prodFile);
  }

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[main] renderer loaded ok");
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] renderer failed to load:", url, code, desc);
    if (isDev) {
      console.log("[main] retrying in 1s — is 'npm run dev' running?");
      setTimeout(() => { void mainWindow?.loadURL(DEV_URL) }, 1000);
    }
  });

  mainWindow.on("close", (e) => {
    if (!forceQuit) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── window controls ───────────────────────────────────────────────────────────
ipcMain.on("window.minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window.maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("window.close", () => {
  mainWindow?.close();
});

ipcMain.on("window.quit", () => {
  app.quit();
});

// ── lifecycle ─────────────────────────────────────────────────────────────────
void app.whenReady().then(() => {
  console.log("[main] app ready");
  registerTerminalHandlers(() => mainWindow?.webContents ?? null);
  registerQueuesHandlers();
  registerFilesystemHandlers();
  registerSnippetsHandlers(() => mainWindow?.webContents ?? null);
  registerGitHandlers();
  registerGitHubHandlers();
  registerHistoryHandlers();
  registerNotesHandlers(() => mainWindow?.webContents ?? null);
  registerUINotificationHandlers(() => mainWindow?.webContents ?? null);
  prewarmNotificationWindow();
  registerSchedulerHandlers(() => mainWindow?.webContents ?? null);
  registerSdkHandlers();
  registerJulesEventsHandlers();
  registerStoreHandlers();
  startJulesWorker();
  createWindow();

  tray = new Tray(buildTrayIcon());
  tray.setToolTip("Last");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Quit", click: () => { forceQuit = true; app.quit(); } },
  ]));
  tray.on("click", () => {
    if (mainWindow?.isVisible()) mainWindow.hide();
    else { mainWindow?.show(); mainWindow?.focus(); }
  });

  globalShortcut.register("Ctrl+Shift+Space", () => {
    if (mainWindow?.isVisible() && mainWindow.isFocused()) mainWindow.hide();
    else { mainWindow?.show(); mainWindow?.focus(); }
  });

  powerMonitor.on("suspend", () => mainWindow?.webContents.send("power.suspend"));
  powerMonitor.on("resume",  () => mainWindow?.webContents.send("power.resume"));
  powerMonitor.on("lock-screen",   () => mainWindow?.webContents.send("power.suspend"));
  powerMonitor.on("unlock-screen", () => mainWindow?.webContents.send("power.resume"));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  // hides to tray; only quit via tray menu or forceQuit
});

// ── env ───────────────────────────────────────────────────────────────────────
ipcMain.handle("env.getApiKey", () => {
  const apiKey = process.env.JULES_API_KEY ?? null;
  console.log('[main] env.getApiKey called, returning:', apiKey ? 'API Key SET' : 'API Key NOT SET');
  return apiKey;
});
