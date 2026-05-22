import { BrowserWindow as e, app as t, ipcMain as n, shell as r } from "electron";
import { promises as i } from "node:fs";
import { join as a, relative as o, resolve as s } from "node:path";
//#region src/shared/bridge.ts
function c() {
	return {
		workspaceLabel: "Last Workspace",
		releaseChannel: "stable",
		cacheStrategy: "balanced",
		crashGuard: !0,
		topbarDensity: "comfortable"
	};
}
//#endregion
//#region src/electron/preferences.ts
function l() {
	return a(t.getPath("userData"), "workspace-preferences.json");
}
function u(e) {
	let t = c();
	return {
		workspaceLabel: e.workspaceLabel.trim().slice(0, 48) || t.workspaceLabel,
		releaseChannel: e.releaseChannel,
		cacheStrategy: e.cacheStrategy,
		crashGuard: e.crashGuard,
		topbarDensity: e.topbarDensity
	};
}
async function d() {
	try {
		let e = await i.readFile(l(), "utf8");
		return u(JSON.parse(e));
	} catch {
		return c();
	}
}
async function f(e) {
	await i.mkdir(t.getPath("userData"), { recursive: !0 }), await i.writeFile(l(), JSON.stringify(e, null, 2), "utf8");
}
//#endregion
//#region src/electron/paths.ts
var p = process.cwd(), m = process.env.VITE_DEV_SERVER_URL, h = a(p, "dist", "index.html");
//#endregion
//#region src/electron/workspace.ts
async function g(e) {
	try {
		return await i.access(e), !0;
	} catch {
		return !1;
	}
}
async function _() {
	let e = a(p, "package.json"), t = await i.readFile(e, "utf8"), n = JSON.parse(t);
	return {
		name: n.name ?? "last",
		version: n.version ?? "0.1.0",
		scripts: Object.keys(n.scripts ?? {})
	};
}
async function v(e, t) {
	let n = a(p, e);
	try {
		let e = await i.readdir(n, { withFileTypes: !0 });
		return (await Promise.all(e.filter((e) => e.isFile()).slice(0, t).map(async (e) => {
			let t = a(n, e.name), r = await i.stat(t);
			return {
				name: e.name,
				path: o(p, t).replaceAll("\\", "/"),
				bytes: r.size,
				updatedAt: r.mtime.toISOString()
			};
		}))).sort((e, t) => t.updatedAt.localeCompare(e.updatedAt));
	} catch {
		return [];
	}
}
async function y() {
	let [e, t, n, r] = await Promise.all([
		_(),
		d(),
		v("src/renderer", 6),
		v("src/electron", 8)
	]);
	return {
		appName: e.name,
		appVersion: e.version,
		platform: process.platform,
		projectRoot: p,
		sourceFolders: ["src/renderer", "src/electron"],
		scripts: e.scripts,
		preferences: t,
		files: [...n, ...r].slice(0, 10),
		lastScanAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
async function b() {
	let [e, t, n, r] = await Promise.all([
		y(),
		g(a(p, "src", "renderer", "router.tsx")),
		g(a(p, "src", "electron", "main.mts")),
		g(a(p, "src", "electron", "preload.mts"))
	]);
	return [
		{
			id: "router-shape",
			level: t ? "stable" : "blocking",
			title: "Hash data router surface",
			detail: t ? "The renderer route tree is present and can host nested pages, loaders, and actions." : "The route tree file is missing, so the renderer cannot compose nested routes yet.",
			hint: "Keep the root layout and route error boundary while the route map is still growing.",
			updatedAt: e.lastScanAt
		},
		{
			id: "electron-main",
			level: n ? "stable" : "blocking",
			title: "Electron main process entry",
			detail: n ? "The main process entry exists and now emits a real .mjs output for Electron." : "The main process entry is missing, so Electron cannot boot the shell.",
			hint: "Keep window creation and IPC registration separated so failures stay local.",
			updatedAt: e.lastScanAt
		},
		{
			id: "electron-preload",
			level: r ? "stable" : "blocking",
			title: "Preload bridge contract",
			detail: r ? "The preload entry exists and emits a matching .mjs file for the BrowserWindow bridge." : "The preload entry is missing, so the renderer has no safe bridge into Electron.",
			hint: "Keep the exposed API narrow so later route loaders do not become a dumping ground.",
			updatedAt: e.lastScanAt
		},
		{
			id: "crash-guard",
			level: e.preferences.crashGuard ? "stable" : "warning",
			title: "Crash guard preference",
			detail: e.preferences.crashGuard ? "The outer runtime boundary is enabled in your saved workspace preferences." : "The crash guard preference is off, so route-level failures will be more visible during edits.",
			hint: "Turn it off only after the bridge contract and route actions are routine instead of volatile.",
			updatedAt: e.lastScanAt
		}
	];
}
//#endregion
//#region src/electron/ipc.ts
function x() {
	console.info("[electron:ipc] registering handlers"), n.handle("last:get-shell-snapshot", () => y()), n.handle("last:get-diagnostics", () => b()), n.handle("last:save-preferences", async (e, t) => {
		console.info("[electron:ipc] saving preferences");
		let n = u(t);
		return await f(n), n;
	});
}
//#endregion
//#region src/electron/window.ts
async function S() {
	let t = s(import.meta.dirname, "preload.mjs");
	console.info("[electron:window] creating BrowserWindow", {
		preloadPath: t,
		rendererDevUrl: m ?? null
	});
	let n = new e({
		width: 1480,
		height: 960,
		minWidth: 1180,
		minHeight: 760,
		show: !1,
		autoHideMenuBar: !0,
		backgroundColor: "#f5efe4",
		webPreferences: {
			preload: t,
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1
		}
	});
	return n.on("ready-to-show", () => {
		console.info("[electron:window] ready-to-show"), n.show();
	}), n.webContents.setWindowOpenHandler(({ url: e }) => (console.info("[electron:window] external url requested", { url: e }), r.openExternal(e), { action: "deny" })), m ? (console.info("[electron:window] loading renderer dev server"), await n.loadURL(m), n) : (console.info("[electron:window] loading built renderer html"), await n.loadFile(h), n);
}
console.info("[electron:main] waiting for app readiness"), await t.whenReady(), console.info("[electron:main] app ready"), x(), console.info("[electron:main] ipc handlers registered"), await S(), console.info("[electron:main] main window bootstrapped"), t.on("activate", () => {
	console.info("[electron:main] activate event received"), e.getAllWindows().length === 0 && S();
}), t.on("window-all-closed", () => {
	console.info("[electron:main] all windows closed"), process.platform !== "darwin" && t.quit();
});
//#endregion
