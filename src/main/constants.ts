import { join } from 'path';

export const GAME_ORIGIN = 'https://kour.io';
export const GAME_HOST = 'kour.io';
export const RPC_CLIENT_ID = '1091132902370197614';
export const BETAS_URL = 'https://raw.githubusercontent.com/Kour-io/KourClient/main/betas.json';

export const ROOT = join(__dirname, '..', '..');
export const APP_ICON = join(ROOT, 'assets', 'icon.png');
export const STATIC = join(ROOT, 'static');
export const PRELOAD = join(__dirname, '..', 'preload');

/** Hosts allowed to open as in-app popups (login / OAuth flows). Everything else goes to the system browser. */
export const AUTH_POPUP_HOSTS = [
    'accounts.google.com',
    'discord.com',
    'appleid.apple.com',
    'www.facebook.com',
    'crazygames.com',
];

export function isHostOrSubdomain(host: string, base: string) {
    return host === base || host.endsWith('.' + base);
}

export function isGameUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.protocol === 'https:' && isHostOrSubdomain(u.hostname, GAME_HOST);
    } catch {
        return false;
    }
}

export function isAuthUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return (
            u.protocol === 'https:' &&
            (AUTH_POPUP_HOSTS.some((h) => isHostOrSubdomain(u.hostname, h)) ||
                u.hostname.endsWith('.firebaseapp.com'))
        );
    } catch {
        return false;
    }
}

/** Builds the game URL for a channel ("Stable" or a beta like "op4"). Never mutates shared state. */
export function channelUrl(channel: string, hash = ''): string {
    const u = new URL(GAME_ORIGIN);
    if (channel && channel !== 'Stable') u.pathname = '/' + encodeURIComponent(channel) + '/';
    if (hash) u.hash = hash.startsWith('#') ? hash : '#' + hash;
    return u.href;
}

/** Inverse of channelUrl: "/op4/" -> "op4", "/" -> "Stable". */
export function channelFromUrl(raw: string | undefined): string | null {
    if (!raw) return null;
    try {
        const u = new URL(raw);
        if (!isHostOrSubdomain(u.hostname, GAME_HOST)) return null;
        const seg = u.pathname.split('/').filter(Boolean)[0];
        return seg ? decodeURIComponent(seg) : 'Stable';
    } catch {
        return null;
    }
}
