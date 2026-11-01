import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { APP_ICON, PRELOAD, STATIC } from './constants';

let win: BrowserWindow | null = null;

export function getLauncherWindow() {
    return win;
}

export function openLauncher() {
    if (win) {
        win.focus();
        return win;
    }

    const w = new BrowserWindow({
        width: 820,
        height: 620,
        show: false,
        frame: false,
        resizable: false,
        backgroundColor: '#111111',
        icon: APP_ICON,
        webPreferences: {
            preload: join(PRELOAD, 'launcher.js'),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        },
    });
    win = w;

    w.setMenu(null);
    w.loadFile(join(STATIC, 'launcher.html'));
    w.once('ready-to-show', () => w.show());

    // Launcher is a local page: every link leaves to the system browser.
    w.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    w.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
        if (/^https?:/.test(url)) shell.openExternal(url);
    });

    w.on('closed', () => (win = null));
    return w;
}
