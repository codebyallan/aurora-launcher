import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'

// Persists kiosk state across minimize/restore cycles
let wasKiosk = false

export function registerWindowHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.on('window:minimize', () => {
    const win = getWin()
    if (!win) return

    if (win.isMinimized()) {
      win.restore()
      // Restore fullscreen mode if it was active before minimizing
      if (wasKiosk) {
        win.setKiosk(true)
        wasKiosk = false
      }
    } else {
      wasKiosk = win.isKiosk()
      if (wasKiosk) win.setKiosk(false)
      win.minimize()
    }
  })

  ipcMain.on('window:maximize', () => {
    const win = getWin()
    if (!win) return
    win.setKiosk(!win.isKiosk())
  })

  ipcMain.on('window:close', () => getWin()?.close())
}
