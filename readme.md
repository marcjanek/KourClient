# Kour.io Client

Improved desktop client for [Kour.io](https://kour.io), forked from the official
[Kour-io/KourClient](https://github.com/Kour-io/KourClient). It plays on the official servers;
it just wraps the game in a faster, safer and more configurable window.

## Run from source

```sh
npm install
npm start
```

## Hotkeys

| Key | Action |
| --- | --- |
| `F11` | Toggle fullscreen |
| `F5` | Back to the home screen of the current channel |
| `F6` | Join the kour.io lobby link from your clipboard |
| `F12` / `Ctrl+Shift+I` | DevTools |

## What changed vs. upstream

- Electron 10 → 45 (current Chromium, WebGL fixes, security patches)
- Sandboxed game window with `contextIsolation`; the remote page gets no Node/IPC access
- Launcher no longer hangs (async IPC, `https` betas fetch with timeout and fallback)
- Updater never blocks playing; shows real status, plus a "Restart & update" button
- Settings panel: uncapped FPS, Discord RPC, back-to-launcher, skip launcher
- New default flags reach existing users (settings are deep-merged with defaults)
- Saves window size, maximized and fullscreen state; ignores off-screen positions
- Single-instance lock; `kour.io` links passed on the command line open in the running client
- Channel switching no longer sticks to a beta; Discord RPC shows the correct channel name
- Login popups (Google/Discord/…) open in-app; other links open in the system browser
