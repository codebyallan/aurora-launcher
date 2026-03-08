import { app, BrowserWindow, protocol, net, ipcMain, dialog } from 'electron'
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs'
import { pathToFileURL } from 'url'
import path from 'path'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  },
  {
    scheme: 'cover',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }
])

let mainWindow: BrowserWindow | null = null

function getConfigDir(): string {
  const dir = path.join(app.getPath('home'), '.config', 'aurora-launcher')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getCoversDir(): string {
  const dir = path.join(getConfigDir(), 'covers')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getLibraryPath(): string {
  return path.join(getConfigDir(), 'library.json')
}

function readLibrary(): object[] {
  const file = getLibraryPath()
  if (!existsSync(file)) return []
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

function writeLibrary(games: object[]): void {
  writeFileSync(getLibraryPath(), JSON.stringify(games, null, 2), 'utf-8')
}

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return
  mainWindow.setKiosk(!mainWindow.isKiosk())
})
ipcMain.on('window:close', () => mainWindow?.close())

ipcMain.handle('library:load', () => readLibrary())

ipcMain.handle('library:append', (_e, game: object) => {
  const games = readLibrary()
  games.push(game)
  writeLibrary(games)
  return game
})

ipcMain.handle('library:update', (_e, id: number, updated: object) => {
  const games = readLibrary() as Array<{ id: number }>
  const idx = games.findIndex(g => g.id === id)
  if (idx !== -1) {
    games[idx] = { ...games[idx], ...updated }
    writeLibrary(games)
    return games[idx]
  }
  return null
})

ipcMain.handle('library:remove', (_e, id: number) => {
  const games = (readLibrary() as Array<{ id: number }>).filter(g => g.id !== id)
  writeLibrary(games)
  return true
})

ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'bat', 'sh'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openFolder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openImage', async () => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'ico'] }]
  })

  if (result.canceled || !result.filePaths[0]) return null

  const src = result.filePaths[0]
  const ext = path.extname(src) || '.jpg'
  const filename = `${Date.now()}${ext}`
  const dest = path.join(getCoversDir(), filename)
  copyFileSync(src, dest)
  return filename
})

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

  protocol.handle('cover', (req) => {
    const { pathname } = new URL(req.url)
    const filename = decodeURIComponent(pathname.replace(/^\//, ''))
    const filePath = path.join(getCoversDir(), filename)
    if (!existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
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
