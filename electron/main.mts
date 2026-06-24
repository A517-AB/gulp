import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, powerMonitor } from "electron";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import log from "electron-log/main";
import { execFileSync } from "child_process";

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
import { registerUINotificationHandlers, prewarmNotificationWindow, registerSchedulerHandlers, registerNotifLogHandlers } from "./notifications";
// SDK IPC handlers removed — Jules SDK moved to renderer (direct fetch, no IPC overhead)
// import { registerSdkHandlers } from "./ipc/handlers";
// Jules events w@jorker removed — moving to renderer-side SDK
// import { startJulesWorker, registerJulesEventsHandlers } from "./jules-events";
import { registerStoreHandlers } from "./store";
import {registerJulesGitHandlers} from "./ipc/jules-git";


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
  if (!fs.existsSync(preloadPath)) console.error("[main] preload missing:", preloadPath);

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
    void mainWindow.loadURL(DEV_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  const windowStart = performance.now();
  mainWindow.webContents.on("did-finish-load", () => {
    const ms = (performance.now() - windowStart).toFixed(0);
    console.log(`[main] renderer ready (${isDev ? DEV_URL : "prod"}) — ${ms}ms to load`);
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
app.setAppUserModelId("com.last.app");

void app.whenReady().then(() => {
  const t0 = performance.now();
  const t = (label: string) => {
    const ms = (performance.now() - t0).toFixed(1);
    console.log(`[main:startup] +${ms}ms  ${label}`);
  };

  console.log("[main] app ready");

  t("registerTerminalHandlers start");
  registerTerminalHandlers(() => mainWindow?.webContents ?? null);
  t("registerTerminalHandlers done");

  registerQueuesHandlers();
  t("registerQueuesHandlers done");

  registerFilesystemHandlers();
  t("registerFilesystemHandlers done");

  registerSnippetsHandlers(() => mainWindow?.webContents ?? null);
  t("registerSnippetsHandlers done");

  registerGitHandlers();
  t("registerGitHandlers done");

  registerGitHubHandlers();
  t("registerGitHubHandlers done");

  registerHistoryHandlers();
  t("registerHistoryHandlers done");

  registerNotesHandlers(() => mainWindow?.webContents ?? null);
  t("registerNotesHandlers done");

  registerUINotificationHandlers(() => mainWindow?.webContents ?? null);
  t("registerUINotificationHandlers done");

  prewarmNotificationWindow();
  t("prewarmNotificationWindow done");

  registerSchedulerHandlers(() => mainWindow?.webContents ?? null);
  t("registerSchedulerHandlers done");

  registerNotifLogHandlers();
  t("registerNotifLogHandlers done");


  // registerSdkHandlers(); // SDK IPC removed — Jules SDK runs directly in renderer
  // registerJulesEventsHandlers(); // Jules events worker removed — renderer handles this now
  // startJulesWorker(); // Jules worker removed — renderer handles this now

  registerStoreHandlers();
  t("registerStoreHandlers done");

    registerJulesGitHandlers();
    t("registerJulesGitHandlers done");

  createWindow();
  t("createWindow done");

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
  t("tray done");

  globalShortcut.register("Ctrl+Shift+Space", () => {
    if (mainWindow?.isVisible() && mainWindow.isFocused()) mainWindow.hide();
    else { mainWindow?.show(); mainWindow?.focus(); }
  });
  t("globalShortcut done");

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

// Date: 2026-06-23
// Why: Requires node-level filesystem access ('fs') and shell execution ('git' commands).
// For: Saving base64 patches to files and executing git apply/commit tasks.
ipcMain.handle("ipc.artifact.save", async (_, base64Patch: string, savePath: string) => {
  const buffer = Buffer.from(base64Patch, 'base64');
  await fs.promises.writeFile(savePath, buffer);
  return { success: true };
});

ipcMain.handle("ipc.session.applyPatch", async (_, _sessionId: string, options: { cwd: string; patch: string }) => {
  const branchName = `jules-patch-${String(Date.now())}`;
  let patchPath: string | null = null;
  try {
      const unidiffPatch = options.patch;
      if (!unidiffPatch) {
          return { success: false, error: 'No patch content provided.' };
      }
      const commitMessage = 'Applied changes from Jules';

      // Checkout a new branch to apply the changes
      execFileSync('git', ['checkout', '-b', branchName], { cwd: options.cwd, stdio: 'pipe' });

      // Save the patch to disk
      patchPath = path.join(options.cwd, 'jules_changes.patch');
      fs.writeFileSync(patchPath, unidiffPatch);

      // Apply the patch
      execFileSync('git', ['apply', patchPath], { cwd: options.cwd, stdio: 'pipe' });

      // Commit the applied changes
      execFileSync('git', ['add', '.'], { cwd: options.cwd, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', commitMessage], { cwd: options.cwd, stdio: 'pipe' });

      return { success: true, branch: branchName };
  } catch (error) {
      console.error('[ipc.session.applyPatch] error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
      if (patchPath) {
          try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
      }
  }
});
