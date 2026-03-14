import { app, BrowserWindow, protocol, net, session } from 'electron'
import { existsSync, statSync } from 'fs'
import { pathToFileURL } from 'url'
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

import { getCoversDir } from './lib/paths'
import { hasRunning, killAll } from './lib/game'
import { isSgdbConfigured } from './lib/sgdb'
import { registerWindowHandlers } from './ipc/window'
import { registerLibraryHandlers } from './ipc/library'
import { registerDialogHandlers } from './ipc/dialog'
import { registerGameHandlers } from './ipc/game'
import { registerSgdbHandlers } from './ipc/sgdb'
import { registerUmuHandlers } from './ipc/umu'

dotenvConfig()

if (!isSgdbConfigured()) {
  console.warn(
    '[aurora] AURORA_SGDB_PROXY is not set — cover art fetching is disabled.\n'
    + '         For local dev, add AURORA_SGDB_PROXY=http://localhost:3000/api/sgdb to .env'
  )
}

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } },
  { scheme: 'cover', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
])

let mainWindow: BrowserWindow | null = null
const getWin = () => mainWindow

// Register all IPC handlers before the window is created
registerWindowHandlers(getWin)
registerLibraryHandlers()
registerDialogHandlers(getWin)
registerGameHandlers(getWin)
registerSgdbHandlers()
registerUmuHandlers()

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
      sandbox: true
    },
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#0f0f0f'
  })

  mainWindow.loadURL('app://localhost/')

  if (!app.isPackaged) mainWindow.webContents.openDevTools()

  mainWindow.on('close', (e) => {
    if (hasRunning()) {
      e.preventDefault()
      killAll()
      setTimeout(() => mainWindow?.destroy(), 300)
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  const publicDir = path.join(__dirname, '../.output/public')

  // Register CSP on the default session — done once here, outside createWindow(),
  // so it is not duplicated if createWindow is called again on macOS re-activate.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          'default-src \'self\' app: cover:; '
          // Nuxt prerenders the SPA and injects inline <script> tags for the
          // payload / chunk manifest. 'unsafe-inline' is required here.
          // This is acceptable in an Electron context because all content is
          // served locally from the filesystem — there is no untrusted origin
          // that could inject scripts via XSS.
          + 'script-src \'self\' \'unsafe-inline\'; '
          + 'style-src \'self\' \'unsafe-inline\'; '
          + 'img-src \'self\' app: cover: data: blob: https:; '
          + 'connect-src \'self\' https:; '
          + 'font-src \'self\' data:'
        ]
      }
    })
  })

  // Serve the Nuxt SPA from the local filesystem via a custom app:// scheme
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url)
    let filePath = path.join(publicDir, decodeURIComponent(pathname))
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(publicDir, 'index.html')
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })

  // Serve cover images from ~/.config/aurora-launcher/covers via cover://
  protocol.handle('cover', (req) => {
    const { pathname } = new URL(req.url)
    const filename = decodeURIComponent(pathname.replace(/^\//, ''))
    const filePath = path.join(getCoversDir(), filename)
    if (!existsSync(filePath)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(filePath).toString())
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else if (mainWindow?.isMinimized()) mainWindow.restore()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
