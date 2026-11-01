import { BrowserWindow, clipboard, screen, shell } from 'electron';
import { getSettings, updateSettings, WindowState } from './config';
import { APP_ICON, channelFromUrl, channelUrl, isAuthUrl, isGameUrl } from './constants';

let win: BrowserWindow | null = null;

export function getGameWindow() {
    return win;
}

/** Restores saved bounds only if they are still visible on some display. */
function restoreBounds(saved: WindowState | null) {
    const area = screen.getPrimaryDisplay().workArea;
    const fallback = { width: Math.round(area.width * 0.85), height: Math.round(area.height * 0.85) };
    if (!saved || saved.x === undefined || saved.y === undefined) return { ...fallback, ...(saved ? { width: saved.width, height: saved.height } : {}) };

    const visible = screen.getAllDisplays().some(({ workArea: a }) =>
        saved.x! < a.x + a.width - 50 && saved.x! + saved.width > a.x + 50 &&
        saved.y! < a.y + a.height - 50 && saved.y! + saved.height > a.y + 50
    );
    return visible ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : fallback;
}

function saveState(w: BrowserWindow) {
    const b = w.getNormalBounds();
    updateSettings({
        window: { ...b, maximized: w.isMaximized(), fullscreen: w.isFullScreen() },
    });
}

function handleHotkeys(w: BrowserWindow) {
    w.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown' || input.isAutoRepeat) return;
        const hk = getSettings().hotkeys;
        const key = input.key;

        if (key === hk.fullscreen) {
            w.setFullScreen(!w.isFullScreen());
        } else if (key === hk.reload) {
            // Back to the home screen of the current channel (drops lobby hash).
            const channel = channelFromUrl(w.webContents.getURL()) ?? getSettings().channel;
            w.loadURL(channelUrl(channel));
        } else if (key === hk.loadClipboardGame) {
            Promise.resolve(clipboard.readText()).then((raw) => {
                const text = raw.trim();
                if (isGameUrl(text) && new URL(text).hash.length > 1) w.loadURL(text);
            });
        } else if (key === hk.devtools || (input.control && input.shift && key.toUpperCase() === 'I')) {
            w.webContents.toggleDevTools();
        } else {
            return;
        }
        event.preventDefault();
    });
}

function handleNavigation(w: BrowserWindow) {
    w.webContents.setWindowOpenHandler(({ url }) => {
        if (isGameUrl(url)) {
            w.loadURL(url);
            return { action: 'deny' };
        }
        if (isAuthUrl(url)) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    parent: w,
                    width: 520,
                    height: 720,
                    autoHideMenuBar: true,
                    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
                },
            };
        }
        if (/^https?:/.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });

    w.webContents.on('will-navigate', (event, url) => {
        if (isGameUrl(url) || isAuthUrl(url)) return;
        event.preventDefault();
        if (/^https?:/.test(url)) shell.openExternal(url);
    });
}

export function openGame(url: string, onClosed: () => void, onUrlChange: (url: string) => void) {
    if (win) {
        win.loadURL(url);
        win.focus();
        return win;
    }

    const saved = getSettings().window;
    const w = new BrowserWindow({
        ...restoreBounds(saved),
        show: false,
        backgroundColor: '#000000',
        icon: APP_ICON,
        title: 'Kour.io',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            backgroundThrottling: false,
            spellcheck: false,
        },
    });
    win = w;
    w.setMenu(null);

    if (saved?.maximized) w.maximize();
    if (saved?.fullscreen) w.setFullScreen(true);

    w.once('ready-to-show', () => w.show());
    handleHotkeys(w);
    handleNavigation(w);

    const notify = () => onUrlChange(w.webContents.getURL());
    w.webContents.on('did-navigate', notify);
    w.webContents.on('did-navigate-in-page', notify);

    w.on('close', () => saveState(w));
    w.on('closed', () => {
        win = null;
        onClosed();
    });

    w.loadURL(url);
    return w;
}
