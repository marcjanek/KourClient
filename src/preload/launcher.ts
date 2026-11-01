import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kour', {
    info: () => ipcRenderer.invoke('app:info'),
    channels: () => ipcRenderer.invoke('app:channels'),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    setSettings: (patch: unknown) => ipcRenderer.invoke('settings:set', patch),
    launch: (channel: string) => ipcRenderer.invoke('game:launch', channel),
    updateStatus: () => ipcRenderer.invoke('update:status'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    onUpdateStatus: (fn: (s: unknown) => void) => {
        ipcRenderer.on('update:status', (_e, s) => fn(s));
    },
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    relaunch: () => ipcRenderer.send('app:relaunch'),
});
