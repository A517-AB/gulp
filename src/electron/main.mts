import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } from "electron";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

import { registerTerminalHandlers } from "./Terminal";
import { registerQueuesHandlers } from "./queues";
import { registerFilesystemHandlers } from "./filesystem";
import { registerSnippetsHandlers } from "./snippets";
import { registerGitHandlers } from "./git";
import { registerGitHubHandlers } from "./github";
import { registerSdkHandlers } from "./jules/handlers";
import { registerReposHandlers } from "./repos";
import { registerPowerMonitor } from "./power";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";

console.log("[main] starting, isDev:", isDev);
console.log("[main] __dirname:", __dirname);
console.log("[main] JULES_API_KEY:", process.env.JULES_API_KEY ? "SET ✓" : "NOT SET ✗");

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let forceQuit = false;

// Guards an auto-reload-on-crash loop: reset on every clean load, capped so a
// renderer that crashes on boot doesn't reload forever.
let crashReloadCount = 0;
const MAX_CRASH_RELOADS = 3;

// --- Tray Icon Logic ---
export type TrayState = 'active' | 'idle' | 'low-power';

const TRAY_COLORS: Record<TrayState, [number, number, number]> = {
  'active':    [139, 92, 246], // Purple
  'idle':      [59, 130, 246], // Blue
  'low-power': [107, 114, 128], // Grey
};

export function buildTrayIcon(state: TrayState): ReturnType<typeof nativeImage.createFromBuffer> {
  const color = TRAY_COLORS[state];
  const size = 16;
  const buf = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2 + 0.5;
      const dy = y - size / 2 + 0.5;
      const idx = (y * size + x) * 4;
      if (Math.sqrt(dx * dx + dy * dy) <= size / 2 - 1) {
        buf[idx] = color[0]; buf[idx + 1] = color[1]; buf[idx + 2] = color[2]; buf[idx + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

// ── window ────────────────────────────────────────────────────────────────────
function createWindow() {
  const preloadPath = path.join(__dirname, "preload.mjs");
  console.log("[main] preload path:", preloadPath, "exists:", fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    // Explicit fully-transparent alpha. Without this the compositor has no
    // defined clear color for the surface, which makes the repaint-after-reload
    // bug (window goes fully see-through on Ctrl+R) more likely.
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
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
    crashReloadCount = 0; // a clean load clears the crash-loop guard
    // Transparent + frameless windows can fail to repaint their compositor
    // surface after a reload (Ctrl+R), leaving the window fully see-through —
    // i.e. "the whole window disappears". Force a full repaint after every
    // load. See electron/electron #18877, #28255, #11733.
    mainWindow?.webContents.invalidate();
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] renderer failed to load:", url, code, desc);
    if (isDev) {
      console.log("[main] retrying in 1s — is 'npm run dev' running?");
      setTimeout(() => {
        void mainWindow?.loadURL(DEV_URL);
      }, 1000);
    }
  });

  // ── crash / hang diagnostics ──────────────────────────────────────────────
  // Without these a renderer or GPU crash on a transparent frameless window is
  // silent: the window goes blank/transparent and looks like it "disappeared".
  // Surface the cause and auto-recover instead of leaving a dead window.
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render process gone:", details.reason, "exitCode:", details.exitCode);
    // 'clean-exit'/'killed' are intentional (e.g. shutdown); anything else is
    // a crash worth reloading from — but only up to the cap.
    const isCrash = details.reason !== "clean-exit" && details.reason !== "killed";
    if (isCrash && crashReloadCount < MAX_CRASH_RELOADS) {
      crashReloadCount++;
      console.log(`[main] reloading renderer after crash (${String(crashReloadCount)}/${String(MAX_CRASH_RELOADS)})…`);
      // render-process-gone can fire during teardown when the window is
      // already destroyed; reload() on a destroyed window throws.
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
    } else if (isCrash) {
      console.error("[main] renderer crashed too many times — leaving it; check logs above");
    }
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.warn("[main] renderer became unresponsive");
  });

  mainWindow.webContents.on("responsive", () => {
    console.log("[main] renderer responsive again");
  });

  mainWindow.webContents.on("preload-error", (_e, errPreloadPath, error) => {
    console.error("[main] preload error in", errPreloadPath, error);
  });

  // Add listeners for window show/hide to update tray state
  mainWindow.on('show', () => {
    tray?.setImage(buildTrayIcon('active'));
  });

  mainWindow.on('hide', () => {
    tray?.setImage(buildTrayIcon('idle'));
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

ipcMain.on("lowPower.manualEnter", () => {
  tray?.setImage(buildTrayIcon('low-power'));
  mainWindow?.webContents.send("lowPower.enter");
});

ipcMain.on("lowPower.manualExit", () => {
  const isVisible = mainWindow?.isVisible() ?? false;
  tray?.setImage(buildTrayIcon(isVisible ? 'active' : 'idle'));
  mainWindow?.webContents.send("lowPower.exit");
});

ipcMain.on("lowPower.toggleAlwaysOnTop", () => {
  if (mainWindow) {
    const next = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next);
    mainWindow.webContents.send("lowPower.alwaysOnTop", next);
  }
});

// ── lifecycle ─────────────────────────────────────────────────────────────────
void app.whenReady().then(() => {
  console.log("[main] app ready");
  registerTerminalHandlers(() => mainWindow?.webContents ?? null);
  registerQueuesHandlers();
  registerFilesystemHandlers();
  registerSnippetsHandlers();
  registerGitHandlers();
  registerGitHubHandlers();
  registerSdkHandlers();
  registerReposHandlers();
  createWindow();

  tray = new Tray(buildTrayIcon('active')); // Initial state is active
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

  globalShortcut.register("Ctrl+Shift+4", () => {
    tray?.setImage(buildTrayIcon('low-power'));
    mainWindow?.webContents.send("lowPower.enter");
  });
  globalShortcut.register("Ctrl+Shift+6", () => {
    const isVisible = mainWindow?.isVisible() ?? false;
    tray?.setImage(buildTrayIcon(isVisible ? 'active' : 'idle'));
    mainWindow?.webContents.send("lowPower.exit");
  });
  globalShortcut.register("Ctrl+Shift+5", () => {
    if (mainWindow) {
      const next = !mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(next);
      mainWindow.webContents.send("lowPower.alwaysOnTop", next);
    }
  });

  // Register the new power monitor
  registerPowerMonitor({
    getWindow: () => mainWindow,
    getTray: () => tray,
    buildTrayIcon,
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Catches GPU/utility process crashes. With hardware acceleration + a
// transparent window, a dead GPU process is a prime suspect for the window
// going blank, so make it loud rather than silent.
app.on("child-process-gone", (_e, details) => {
  console.error("[main] child process gone:", details.type, "-", details.reason);
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