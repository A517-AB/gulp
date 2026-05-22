import { ipcRenderer } from 'electron';
import type { ElectronAPI } from './types.js';
import { sdk } from '../electron/jules/sdk.js';

export const bridge: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  minimize: () => { ipcRenderer.send('window-minimize'); },
  maximize: () => { ipcRenderer.send('window-maximize'); },
  close: () => { ipcRenderer.send('window-close'); },
  sdk,
};
