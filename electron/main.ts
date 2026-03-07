import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import { existsSync, statSync } from 'fs'
import { pathToFileURL } from 'url'
import path from 'path'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#0f0f0f'
  })

  mainWindow.loadURL('app://localhost/')

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
ipcMain.on('window:minimize', () => mainWindow?.minimize())

ipcMain.on('window:maximize', () => {
  if (!mainWindow) return
  mainWindow.setKiosk(!mainWindow.isKiosk())
})

ipcMain.on('window:close', () => mainWindow?.close())

app.whenReady().then(() => {
  const publicDir = path.join(__dirname, '../.output/public')

  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url)
    let filePath = path.join(publicDir, decodeURIComponent(pathname))

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(publicDir, 'index.html')
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
