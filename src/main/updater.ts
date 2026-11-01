import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

export type UpdateStatus =
    | { state: 'disabled' }
    | { state: 'checking' }
    | { state: 'none' }
    | { state: 'downloading'; version: string; percent: number; transferred: number; total: number }
    | { state: 'ready'; version: string }
    | { state: 'error'; message: string };

let status: UpdateStatus = { state: app.isPackaged ? 'checking' : 'disabled' };
const listeners = new Set<(s: UpdateStatus) => void>();
let started = false;
let version = '';

function set(s: UpdateStatus) {
    status = s;
    listeners.forEach((l) => l(s));
}

export function getUpdateStatus() {
    return status;
}

export function onUpdateStatus(fn: (s: UpdateStatus) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function installUpdate() {
    if (status.state === 'ready') autoUpdater.quitAndInstall();
}

/** Checks once per app run. Updates never block launching the game. */
export function startUpdater() {
    if (started || !app.isPackaged) return;
    started = true;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
    autoUpdater.on('update-not-available', () => set({ state: 'none' }));
    autoUpdater.on('update-available', (info) => {
        version = info.version;
        set({ state: 'downloading', version, percent: 0, transferred: 0, total: 0 });
    });
    autoUpdater.on('download-progress', (p) =>
        set({ state: 'downloading', version, percent: p.percent, transferred: p.transferred, total: p.total })
    );
    autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }));
    autoUpdater.on('error', (e) => set({ state: 'error', message: e?.message ?? String(e) }));

    autoUpdater.checkForUpdates().catch((e) => set({ state: 'error', message: e?.message ?? String(e) }));
}
