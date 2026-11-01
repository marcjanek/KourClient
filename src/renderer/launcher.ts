// Launcher UI. Plain script (no imports) – talks to the main process only via `kour` (preload).

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function formatBytes(n: number) {
    if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    if (n > 1024) return (n / 1024).toFixed(1) + ' KB';
    return n + ' B';
}

function renderUpdate(s: KourUpdateStatus) {
    const text = $('updateText');
    const bar = $('updateProg');
    const btn = $<HTMLButtonElement>('updateInstall');
    bar.classList.remove('inProg', 'error');
    btn.hidden = true;

    switch (s.state) {
        case 'disabled':
            text.textContent = 'Development build – auto-update disabled';
            bar.style.width = '100%';
            break;
        case 'checking':
            text.textContent = 'Checking for updates…';
            bar.style.width = '100%';
            bar.classList.add('inProg');
            break;
        case 'none':
            text.textContent = 'Client is up to date!';
            bar.style.width = '100%';
            break;
        case 'downloading':
            text.textContent = `Downloading update ${s.version}… ${formatBytes(s.transferred)} / ${formatBytes(s.total)} (${Math.floor(s.percent)}%)`;
            bar.style.width = Math.floor(s.percent) + '%';
            bar.classList.add('inProg');
            break;
        case 'ready':
            text.textContent = `Update ${s.version} ready – it will install when you quit.`;
            bar.style.width = '100%';
            btn.hidden = false;
            break;
        case 'error':
            text.textContent = 'Update check failed – you can still play.';
            text.title = s.message;
            bar.style.width = '100%';
            bar.classList.add('error');
            break;
    }
}

async function init() {
    $('minimize').addEventListener('click', () => kour.minimize());
    $('close').addEventListener('click', () => kour.close());
    $('updateInstall').addEventListener('click', () => kour.installUpdate());
    $('restart').addEventListener('click', () => kour.relaunch());

    const [info, settings, status] = await Promise.all([kour.info(), kour.getSettings(), kour.updateStatus()]);
    $('title').textContent = info.name;
    $('version').textContent = `v${info.version} · Electron ${info.electron} · Chromium ${info.chrome}`;
    renderUpdate(status);
    kour.onUpdateStatus(renderUpdate);

    // Settings toggles
    const restartNeeded = new Set(['uncapFps']);
    const initial = { ...settings };
    document.querySelectorAll<HTMLInputElement>('input[data-setting]').forEach((input) => {
        const key = input.dataset.setting as keyof KourSettings;
        input.checked = Boolean(settings[key]);
        input.addEventListener('change', async () => {
            await kour.setSettings({ [key]: input.checked });
            const dirty = [...restartNeeded].some(
                (k) => (document.querySelector(`input[data-setting="${k}"]`) as HTMLInputElement).checked !== initial[k as keyof KourSettings]
            );
            $('restartNote').hidden = !dirty;
        });
    });

    const hk = settings.hotkeys;
    $('hotkeys').innerHTML = '';
    for (const [label, key] of [
        ['Fullscreen', hk.fullscreen],
        ['Back to menu', hk.reload],
        ['Join lobby from clipboard', hk.loadClipboardGame],
        ['DevTools', hk.devtools],
    ]) {
        const li = document.createElement('li');
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        li.append(kbd, ' ' + label);
        $('hotkeys').appendChild(li);
    }

    // Channels
    const select = $<HTMLSelectElement>('betaSelect');
    const launch = $<HTMLButtonElement>('launch');
    const channels = await kour.channels();
    select.innerHTML = '';
    for (const c of channels) {
        const o = document.createElement('option');
        o.value = o.textContent = c;
        select.appendChild(o);
    }
    select.value = channels.includes(settings.channel) ? settings.channel : 'Stable';

    launch.disabled = false;
    launch.addEventListener('click', () => {
        launch.disabled = true;
        kour.launch(select.value);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !launch.disabled) launch.click();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    init().catch((e) => {
        console.error(e);
        $('updateText').textContent = 'Launcher error: ' + (e?.message ?? e);
    });
});
