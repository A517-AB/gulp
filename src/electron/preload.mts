import { contextBridge } from 'electron';
import { bridge } from '../shared/bridge.js';

console.log('[Electron Preload] Injecting Electron API bridge into window.electronAPI');
contextBridge.exposeInMainWorld('electronAPI', bridge);
