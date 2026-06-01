import type { ElectronAPI } from "./electron";

const el: ElectronAPI | undefined = typeof window !== "undefined" ? window.electron : undefined;

export const isElectron = !!el?.window;
export const isWeb = !isElectron;

console.log(`[bridge] mode: ${isElectron ? "electron" : "browser"}`);

export const terminal       = el?.terminal    ?? null;
export const queues         = el?.queues      ?? null;
export const windowControls = el?.window      ?? null;
export const power          = el?.power       ?? null;
export const popup          = el?.popup       ?? null;
export const filesystem     = el?.filesystem  ?? null;
export const history       = el?.history       ?? null;
export const aliases       = el?.aliases       ?? null;
export const notes         = el?.notes         ?? null;
export const alarms        = el?.alarms        ?? null;
export const notifications = el?.notifications ?? null;
export const snippets      = el?.snippets      ?? null;
export const sdkIpc   = el?.sdkIpc   ?? null;
