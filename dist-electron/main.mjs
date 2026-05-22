import { BrowserWindow as e, app as t, ipcMain as n } from "electron";
import * as r from "path";
import { fileURLToPath as i } from "url";
//#region src/electron/main.mts
var a = i(import.meta.url), o = r.dirname(a);
console.log("[Electron Main] Starting Electron process...");
var s = null, c = async () => {
	s = new e({
		width: 800,
		height: 600,
		frame: !1,
		webPreferences: {
			preload: r.join(o, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	});
	let t = process.env.VITE_DEV_SERVER_URL;
	try {
		t ? await s.loadURL(t) : await s.loadFile(r.join(o, "../dist/index.html"));
	} catch (e) {
		console.error("Failed to load app:", e instanceof Error ? e.message : e);
	}
	s.on("closed", () => {
		s = null;
	});
};
t.whenReady().then(() => {
	n.handle("ping", () => "pong"), n.on("window-minimize", () => s?.minimize()), n.on("window-maximize", () => {
		s?.isMaximized() ? s.unmaximize() : s?.maximize();
	}), n.on("window-close", () => s?.close()), c(), t.on("activate", () => {
		e.getAllWindows().length === 0 && c();
	});
}).catch((e) => {
	console.error("App initialization failed:", e instanceof Error ? e.message : e);
}), t.on("window-all-closed", () => {
	t.quit();
});
//#endregion
