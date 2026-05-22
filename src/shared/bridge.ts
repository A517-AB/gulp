import { ipcRenderer } from 'electron';
import type { ElectronAPI } from './types.js';

export const bridge: ElectronAPI = {
  ping: (): Promise<unknown> => ipcRenderer.invoke('ping'),
  minimize: (): void => { ipcRenderer.send('window-minimize'); },
  maximize: (): void => { ipcRenderer.send('window-maximize'); },
  close: (): void => { ipcRenderer.send('window-close'); },
};
