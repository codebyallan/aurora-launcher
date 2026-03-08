<div align="center">

# 🌌 Aurora Launcher

A console-grade game launcher for Linux.  
Launch Windows games via Proton with full gamepad support and a UI that actually feels good.

[![License: MIT](https://img.shields.io/badge/license-MIT-white?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/linux-only-orange?style=flat-square&logo=linux&logoColor=white)](#)
[![Electron](https://img.shields.io/badge/electron-35-47848F?style=flat-square&logo=electron&logoColor=white)](#)
[![Nuxt](https://img.shields.io/badge/nuxt-4-00DC82?style=flat-square&logo=nuxt.js&logoColor=white)](#)

<br/>

![](/.github/assets/hero.png)

</div>

<br/>

---

## 🛠 Stack

`Nuxt 4` · `Nuxt UI` · `Tailwind CSS v4` · `TypeScript` · `Electron 35`

---

## 📋 Prerequisites

- Node.js ≥ 20 · pnpm ≥ 9
- [`umu-launcher`](https://github.com/Open-Wine-Components/umu-launcher) available as `umu-run` in your PATH

```bash
# Arch
yay -S umu-launcher

# Fedora
sudo dnf copr enable boreeas/umu-launcher && sudo dnf install umu-launcher

# pip
pip install umu-launcher
```

---

## 🚀 Dev

```bash
pnpm install
pnpm electron:dev
```

Runs `nuxt generate` → compiles Electron → opens the window. DevTools on by default.

---

## 📦 Build

```bash
pnpm electron:build
```

Outputs a `.AppImage` inside `release/`.

---

## 🎮 Managing Games

**Add** — click `+ Add Game` in the header or press `Start` on your controller.

| Field | |
|---|---|
| Game Name | Display name in the launcher |
| Executable | Full path to the `.exe` or `.sh` |
| Cover | Copied to `~/.config/aurora-launcher/covers/` automatically |
| Wine Prefix | Your `WINEPREFIX` — one per game is recommended |
| Proton Path | Path to a Proton build, or leave as `GE-Proton` |
| Game ID | `umu-default` or a SteamDB AppID for better compatibility |
| Store | `none` · `steam` · `gog` · `egs` |
| Arguments | Extra CLI flags, comma-separated |

**Edit** — navigate to the game → `···` → Edit, or press `X` on your controller.

**Delete** — `···` → Delete, then confirm. Your files on disk are never touched.

**Stop** — press Stop while a game is running, or hit `A` / `B` on your controller. Aurora kills the process tree entirely — no orphaned Wine instances.

---

## 🕹 Controller

Auto-detects Xbox, PlayStation and generic controllers.

| Input | Action |
|---|---|
| `←` `→` D-Pad or Left Stick | Navigate |
| `A` | Play · Stop |
| `X` | Edit |
| `Y` | Options |
| `LB` `RB` | First · Last |
| `Start` | Add game |
| `Select` | Toggle fullscreen |
| `Home` | Minimize |

---

## ⚙️ How it works

Aurora is a frameless Electron window serving a statically-generated Nuxt SPA via a custom `app://` protocol. Cover art is served through a separate `cover://` protocol pointing to `~/.config/aurora-launcher/covers/`.

The library is a plain JSON file at `~/.config/aurora-launcher/library.json`. The renderer has zero Node.js access — everything goes through a typed `contextBridge` IPC bridge.

When you hit Play, Electron spawns `umu-run` with `WINEPREFIX`, `GAMEID`, `PROTONPATH` and `STORE` mapped from your config. Logs stream to the UI in real time. On kill, Aurora walks the full process tree with `SIGKILL` before cleanup.

Gamepad polling runs at 60 fps via `requestAnimationFrame` with a `0.35` deadzone and auto-repeat on navigation inputs.

---

## 📄 License

[MIT](LICENSE) — do whatever you want with it.
