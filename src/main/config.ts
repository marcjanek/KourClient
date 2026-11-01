import { app } from 'electron';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface Hotkeys {
    fullscreen: string;
    reload: string;
    loadClipboardGame: string;
    devtools: string;
}

export interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maximized: boolean;
    fullscreen: boolean;
}

export interface Settings {
    /** Removes the FPS cap (disables vsync + frame rate limit). Requires restart. */
    uncapFps: boolean;
    /** Show Kour.io activity in Discord. */
    discordRpc: boolean;
    /** Return to the launcher when the game window is closed. */
    backToLauncher: boolean;
    /** Skip the launcher and go straight into the game. */
    skipLauncher: boolean;
    /** Last selected channel ("Stable" or a beta path). */
    channel: string;
    hotkeys: Hotkeys;
    /** Extra Chromium switches, "name" or "name=value" -> enabled. Requires restart. */
    flags: Record<string, boolean>;
    window: WindowState | null;
}

export const defaults: Settings = {
    uncapFps: true,
    discordRpc: true,
    backToLauncher: true,
    skipLauncher: false,
    channel: 'Stable',
    hotkeys: {
        fullscreen: 'F11',
        reload: 'F5',
        loadClipboardGame: 'F6',
        devtools: 'F12',
    },
    flags: {
        'ignore-gpu-blocklist': true,
        'enable-gpu-rasterization': true,
        'enable-zero-copy': true,
        'disable-background-timer-throttling': true,
        'disable-renderer-backgrounding': true,
        'enable-highres-timer': true,
    },
    window: null,
};

const file = () => join(app.getPath('userData'), 'settings.json');

let current: Settings | null = null;

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merges saved values over defaults so new default keys reach existing users. */
function merge<T>(base: T, over: unknown): T {
    if (!isObject(base) || !isObject(over)) return (over ?? base) as T;
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(over)) {
        const b = (base as Record<string, unknown>)[k];
        if (v === undefined) continue;
        if (b !== undefined && b !== null && typeof b !== typeof v) continue; // ignore type-mismatched garbage
        out[k] = isObject(b) && isObject(v) ? merge(b, v) : v;
    }
    return out as T;
}

export function getSettings(): Settings {
    if (current) return current;
    let saved: unknown = {};
    try {
        if (existsSync(file())) saved = JSON.parse(readFileSync(file(), 'utf8'));
    } catch (e) {
        console.warn('[config] settings.json unreadable, using defaults', e);
    }
    current = merge(structuredClone(defaults), saved);
    return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
    current = merge(getSettings(), patch);
    const tmp = file() + '.tmp';
    try {
        writeFileSync(tmp, JSON.stringify(current, null, 4));
        renameSync(tmp, file());
    } catch (e) {
        console.error('[config] failed to save settings', e);
    }
    return current;
}
