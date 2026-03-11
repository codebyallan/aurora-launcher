import type { ChildProcess } from 'child_process'
import { spawn, execSync } from 'child_process'
import type { BrowserWindow } from 'electron'
import type { LaunchPayload } from '../../app/types/index'

interface GameProcess {
  proc: ChildProcess
  pid: number
}

// Keyed by CarouselItem.id (gameItemId)
const running = new Map<number, GameProcess>()

// ─── Process tree kill ────────────────────────────────────────────────────────

function killTree(pid: number): void {
  try {
    // Recursively kill child PIDs first
    const children = execSync(`pgrep -P ${pid}`)
      .toString().trim().split('\n').filter(Boolean)
    for (const child of children) {
      killTree(Number.parseInt(child, 10))
    }
  } catch { /* no children or process already gone */ }

  try { process.kill(pid, 'SIGKILL') } catch { /* already dead */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function hasRunning(): boolean {
  return running.size > 0
}

export function killGame(gameItemId: number): boolean {
  const entry = running.get(gameItemId)
  if (!entry) return false
  killTree(entry.pid)
  try { entry.proc.kill('SIGKILL') } catch { /* already dead */ }
  running.delete(gameItemId)
  return true
}

export function killAll(): void {
  for (const [id] of running) killGame(id)
}

export function launchGame(payload: LaunchPayload, win: BrowserWindow): { ok: boolean, error?: string } {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // User env vars first (MANGOHUD, DXVK_HUD, PROTON_LOG, etc.)
    ...(payload.extraEnv ?? {}),
    // Required umu-run vars — placed after extraEnv so they cannot be accidentally overridden
    WINEPREFIX: payload.winePath,
    GAMEID: payload.gameId || 'umu-default',
    PROTONPATH: payload.protonPath || 'GE-Proton',
    STORE: payload.store || 'none'
  }

  const proc = spawn('umu-run', [payload.executable, ...payload.arguments], {
    env,
    detached: true
  })
  // unref so Node doesn't keep the event loop alive if the main window closes
  // while the game is still running (killAll handles the actual teardown)
  proc.unref()

  const send = (channel: string, data: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(channel, data)
  }

  // Register error listener BEFORE the pid guard so the EventEmitter never
  // has an unhandled 'error' event — which Node would throw as uncaughtException.
  proc.on('error', (err: Error) => {
    // Guard against double-fire with 'close': only send game:exit once.
    if (running.delete(payload.gameItemId)) {
      send('game:exit', { code: -1, gameItemId: payload.gameItemId })
    }
    send('game:log', { gameItemId: payload.gameItemId, msg: `Error: ${err.message}` })
  })

  // If spawn failed synchronously, proc.pid is undefined.
  // The 'error' event listener above will handle cleanup asynchronously.
  if (!proc.pid) {
    return { ok: false, error: 'Failed to start umu-run (process did not start)' }
  }

  const pid = proc.pid
  running.set(payload.gameItemId, { proc, pid })

  proc.stdout?.on('data', (d: Buffer) =>
    send('game:log', { gameItemId: payload.gameItemId, msg: d.toString() }))

  proc.stderr?.on('data', (d: Buffer) =>
    send('game:log', { gameItemId: payload.gameItemId, msg: d.toString() }))

  proc.on('close', (code: number | null) => {
    // Guard against double-fire: 'error' may have already deleted this entry
    // and sent game:exit. Only send if the process was still tracked.
    if (running.delete(payload.gameItemId)) {
      send('game:exit', { code, gameItemId: payload.gameItemId })
    }
  })

  return { ok: true }
}
