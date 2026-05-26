/// <reference path="../types/electron.d.ts" />

const el = typeof window !== "undefined" ? window.electron : undefined;

export const isElectron = true;
export const isWeb = !isElectron;

console.log(`[bridge] mode: ${isElectron ? "electron (IPC)" : "browser (HTTP)"}`);

export const terminal       = el?.terminal   ?? null;
export const queues         = el?.queues     ?? null;
export const windowControls = el?.window     ?? null;
export const power          = el?.power      ?? null;
export const popup          = el?.popup      ?? null;
export const filesystem     = el?.filesystem ?? null;
export const sdkIpc         = el?.sdkIpc     ?? null;
