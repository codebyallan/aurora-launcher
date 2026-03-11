import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { LaunchPayload } from '../../app/types/index'
import { launchGame, killGame } from '../lib/game'

export function registerGameHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('game:launch', (_e, payload: LaunchPayload): { ok: boolean, error?: string } => {
    const win = getWin()
    if (!win) return { ok: false, error: 'Window not available' }
    return launchGame(payload, win)
  })

  ipcMain.handle('game:kill', (_e, gameItemId: number): boolean =>
    killGame(gameItemId))
}
