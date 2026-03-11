import { ipcMain, dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import { copyLocalImage } from '../lib/covers'

export function registerDialogHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('dialog:openFile', async (): Promise<string | null> => {
    const win = getWin()
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['exe', 'bat', 'sh'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return canceled ? null : (filePaths[0] ?? null)
  })

  ipcMain.handle('dialog:openFolder', async (): Promise<string | null> => {
    const win = getWin()
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    return canceled ? null : (filePaths[0] ?? null)
  })

  ipcMain.handle('dialog:openImage', async (): Promise<string | null> => {
    const win = getWin()
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'ico'] }]
    })
    if (canceled || !filePaths[0]) return null
    // Copy into covers dir; renderer receives a filename served via cover://
    return copyLocalImage(filePaths[0])
  })
}
