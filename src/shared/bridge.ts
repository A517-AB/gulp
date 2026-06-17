import type { ElectronAPI } from "./electron";
import type { SdkIpc } from '../jules/sdk-ipc'

const el: ElectronAPI | undefined = typeof globalThis !== "undefined" && "electron" in globalThis ? (globalThis as unknown as { electron: ElectronAPI }).electron : undefined;

export const isElectron = !!el?.window;
export const isWeb = !isElectron;

console.log(`[bridge] mode: ${isElectron ? "electron" : "browser"}`);

export const terminal       = el?.terminal       ?? null;
export const queues         = el?.queues         ?? null;
export const windowControls = el?.window         ?? null;
export const power          = el?.power          ?? null;
export const popup          = el?.popup          ?? null;
export const filesystem     = el?.filesystem     ?? null;
export const history        = el?.history        ?? null;
export const notes          = el?.notes          ?? null;
export const snippets       = el?.snippets       ?? null;
export const uiNotification = el?.uiNotification ?? null;
export const scheduler      = el?.scheduler      ?? null;
export const notifLog       = el?.notifLog       ?? null;
export const git            = el?.git            ?? null;
export const julesEvents    = el?.julesEvents    ?? null;
export const sdkIpc: SdkIpc | null = (el as unknown as { sdk?: SdkIpc } | undefined)?.sdk ?? null;
export const store         = el?.store         ?? null;
