/// <reference path="../types/electron.d.ts" />

const el = typeof window !== "undefined" ? window.electron : undefined;

export const isElectron = !!el?.window;
export const isWeb = !isElectron;

console.log(`[bridge] mode: ${isElectron ? "electron" : "browser"}`);

export const terminal       = el?.terminal   ?? null;
export const queues         = el?.queues     ?? null;
export const windowControls = el?.window     ?? null;
export const power          = el?.power      ?? null;
export const popup          = el?.popup      ?? null;
export const filesystem     = el?.filesystem ?? null;
export const snippets       = el?.snippets   ?? null;
