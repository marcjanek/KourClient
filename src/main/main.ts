import { app, BrowserWindow, ipcMain } from 'electron';
import { getChannels } from './betas';
import { getSettings, Settings, updateSettings } from './config';
import { channelFromUrl, channelUrl, isGameUrl } from './constants';
import { getGameWindow, openGame } from './game';
import { getLauncherWindow, openLauncher } from './launcher';
import { DiscordRpc } from './rpc';
import { getUpdateStatus, installUpdate, onUpdateStatus, startUpdater } from './updater';

app.setName('Kour.io Client');

// Only one client at a time; a second launch focuses the existing window
// (and joins the lobby if a kour.io link was passed on the command line).
if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

// --- Chromium switches (must be applied before "ready") ---
const settings = getSettings();
if (settings.uncapFps) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
}
for (const [flag, enabled] of Object.entries(settings.flags)) {
    if (!enabled) continue;
    const [key, ...rest] = flag.split('=');
    app.commandLine.appendSwitch(key, rest.join('='));
}

// --- Discord RPC ---
const rpc = new DiscordRpc((secret) => launch(getSettings().channel, secret));
if (settings.discordRpc) rpc.start();

function launch(channel: string, hash = '', directUrl?: string) {
    updateSettings({ channel });
    const url = directUrl ?? channelUrl(channel, hash);
    openGame(
        url,
        () => {
            rpc.set({ state: 'In launcher', channel: null });
            if (getSettings().backToLauncher) openLauncher();
        },
        (current) => {
            const ch = channelFromUrl(current);
            rpc.set({ state: new URL(current).hash.length > 1 ? 'In a lobby' : 'In menu', channel: ch });
        }
    );
    getLauncherWindow()?.close();
}

function gameUrlFromArgv(argv: string[]) {
    return argv.find((a) => isGameUrl(a));
}

app.on('second-instance', (_e, argv) => {
    const url = gameUrlFromArgv(argv);
    if (url) return launch(channelFromUrl(url) ?? 'Stable', '', url);
    const w = getGameWindow() ?? getLauncherWindow();
    if (w) {
        if (w.isMinimized()) w.restore();
        w.focus();
    }
});

// --- IPC for the launcher (all async, nothing can hang the renderer) ---
ipcMain.handle('app:info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
}));
ipcMain.handle('app:channels', () => getChannels());
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const before = getSettings().discordRpc;
    const next = updateSettings(sanitize(patch));
    if (before !== next.discordRpc) next.discordRpc ? rpc.start() : rpc.stop();
    return next;
});
ipcMain.handle('game:launch', (_e, channel: unknown) => {
    if (typeof channel !== 'string' || !/^[\w-]+$/.test(channel)) channel = 'Stable';
    launch(channel as string);
});
ipcMain.handle('update:status', () => getUpdateStatus());
ipcMain.handle('update:install', () => installUpdate());
ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.on('app:relaunch', () => {
    app.relaunch();
    app.quit();
});

onUpdateStatus((s) => getLauncherWindow()?.webContents.send('update:status', s));

/** Only lets the launcher change known, user-facing settings. */
function sanitize(patch: Partial<Settings>): Partial<Settings> {
    const out: Partial<Settings> = {};
    for (const k of ['uncapFps', 'discordRpc', 'backToLauncher', 'skipLauncher'] as const) {
        if (typeof patch?.[k] === 'boolean') out[k] = patch[k];
    }
    return out;
}

app.on('window-all-closed', () => {
    rpc.stop();
    app.quit();
});

app.whenReady().then(() => {
    startUpdater();
    const url = gameUrlFromArgv(process.argv);
    if (url) launch(channelFromUrl(url) ?? 'Stable', '', url);
    else if (getSettings().skipLauncher) launch(getSettings().channel);
    else openLauncher();
});
