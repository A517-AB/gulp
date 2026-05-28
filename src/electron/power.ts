import { powerMonitor, type BrowserWindow, type Tray } from "electron";
import { type TrayState } from "./main.mts";

type PowerDeps = {
  getWindow: () => BrowserWindow | null;
  getTray: () => Tray | null;
  buildTrayIcon: (state: TrayState) => Electron.NativeImage;
};

export function registerPowerMonitor({ getWindow, getTray, buildTrayIcon }: PowerDeps): void {
  function goLow() {
    getTray()?.setImage(buildTrayIcon('low-power'));
    getWindow()?.webContents.send("power.low");
    getWindow()?.webContents.send("lowPower.enter");
  }
  function goActive() {
    const isVisible = getWindow()?.isVisible() ?? false;
    getTray()?.setImage(buildTrayIcon(isVisible ? 'active' : 'idle'));
    getWindow()?.webContents.send("power.active");
    getWindow()?.webContents.send("lowPower.exit");
  }

  powerMonitor.on("suspend",       goLow);
  powerMonitor.on("lock-screen",   goLow);
  powerMonitor.on("resume",        goActive);
  powerMonitor.on("unlock-screen", goActive);
}