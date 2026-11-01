import { app } from 'electron';
import { RPC_CLIENT_ID } from './constants';

type Activity = { state: string; channel: string | null };

/** Discord Rich Presence. Fully optional: any failure just disables it. */
export class DiscordRpc {
    private client: any = null;
    private ready = false;
    private retry: NodeJS.Timeout | null = null;
    private stopped = true;
    private startTime = Date.now();
    private last: Activity = { state: 'In launcher', channel: null };

    constructor(private onJoin: (secret: string) => void) {}

    start() {
        if (!this.stopped) return;
        this.stopped = false;
        this.connect();
    }

    private connect() {
        if (this.stopped) return;
        let RPC: any;
        try {
            RPC = require('discord-rpc-revamp');
        } catch {
            return;
        }
        this.client = new RPC.Client();
        this.client.on('ready', () => {
            this.ready = true;
            this.client.subscribe('ACTIVITY_JOIN').catch(() => {});
            this.push();
        });
        this.client.on('ACTIVITY_JOIN', ({ secret }: { secret: string }) => secret && this.onJoin(secret));
        this.client.on?.('close', () => this.scheduleReconnect());
        this.client.connect({ clientId: RPC_CLIENT_ID }).catch(() => this.scheduleReconnect());
    }

    private scheduleReconnect() {
        this.ready = false;
        if (this.stopped || this.retry) return;
        this.retry = setTimeout(() => {
            this.retry = null;
            try {
                this.client?.destroy?.();
            } catch {}
            this.connect();
        }, 15_000);
    }

    /** Only sends when something actually changes (no 5s polling). */
    set(activity: Activity) {
        if (activity.state === this.last.state && activity.channel === this.last.channel) return;
        this.last = activity;
        this.push();
    }

    private push() {
        if (!this.ready) return;
        this.client
            .setActivity({
                details: app.getName(),
                state: this.last.state,
                largeImageKey: 'okc_logo',
                largeImageText: this.last.channel ?? 'Kour.io',
                startTimestamp: this.startTime,
            })
            .catch(() => {});
    }

    stop() {
        this.stopped = true;
        this.ready = false;
        if (this.retry) clearTimeout(this.retry);
        this.retry = null;
        try {
            this.client?.clearActivity?.().catch?.(() => {});
            this.client?.destroy?.();
        } catch {}
        this.client = null;
    }
}
