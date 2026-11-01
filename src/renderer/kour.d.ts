// Global typings for the API exposed by src/preload/launcher.ts (renderer side).

interface KourSettings {
    uncapFps: boolean;
    discordRpc: boolean;
    backToLauncher: boolean;
    skipLauncher: boolean;
    channel: string;
    hotkeys: Record<string, string>;
}

type KourUpdateStatus =
    | { state: 'disabled' }
    | { state: 'checking' }
    | { state: 'none' }
    | { state: 'downloading'; version: string; percent: number; transferred: number; total: number }
    | { state: 'ready'; version: string }
    | { state: 'error'; message: string };

interface KourApi {
    info(): Promise<{ name: string; version: string; electron: string; chrome: string }>;
    channels(): Promise<string[]>;
    getSettings(): Promise<KourSettings>;
    setSettings(patch: Partial<KourSettings>): Promise<KourSettings>;
    launch(channel: string): Promise<void>;
    updateStatus(): Promise<KourUpdateStatus>;
    installUpdate(): Promise<void>;
    onUpdateStatus(fn: (s: KourUpdateStatus) => void): void;
    minimize(): void;
    close(): void;
    relaunch(): void;
}

declare const kour: KourApi;
