import { net } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BETAS_URL, ROOT } from './constants';

function baked(): string[] {
    try {
        const v: unknown = JSON.parse(readFileSync(join(ROOT, 'betas.json'), 'utf8'));
        return valid(v) ? v : [];
    } catch {
        return [];
    }
}

let cache: string[] | null = null;

function valid(v: unknown): v is string[] {
    return Array.isArray(v) && v.every((x) => typeof x === 'string' && /^[\w-]+$/.test(x));
}

/** Returns available channels, "Stable" first. Never throws. */
export async function getChannels(): Promise<string[]> {
    if (!cache) {
        try {
            const res = await net.fetch(BETAS_URL, { signal: AbortSignal.timeout(3000) });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json: unknown = await res.json();
            if (!valid(json)) throw new Error('invalid betas.json');
            cache = json;
        } catch (e) {
            console.warn('[betas] using baked list:', (e as Error).message);
            cache = baked();
        }
    }
    return ['Stable', ...cache.filter((b) => b !== 'Stable')];
}
