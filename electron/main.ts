import { app, BrowserWindow, protocol, net, ipcMain, dialog } from 'electron'
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs'
import type { ChildProcess } from 'child_process'
import { spawn, execSync } from 'child_process'
import { pathToFileURL } from 'url'
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

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

interface GameProcess {
  process: ChildProcess
  pid: number
}

const runningGames = new Map<number, GameProcess>()

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
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return [] }
}

function writeLibrary(games: object[]): void {
  writeFileSync(getLibraryPath(), JSON.stringify(games, null, 2), 'utf-8')
}

function killProcessTree(pid: number): void {
  try {
    const children = execSync(`pgrep -P ${pid}`).toString().trim().split('\n').filter(Boolean)
    for (const child of children) killProcessTree(parseInt(child))
  } catch { }
  try { process.kill(pid, 'SIGKILL') } catch { }
}

function killGame(gameItemId: number): boolean {
  const entry = runningGames.get(gameItemId)
  if (!entry) return false
  killProcessTree(entry.pid)
  try { entry.process.kill('SIGKILL') } catch { }
  runningGames.delete(gameItemId)
  return true
}

function killAllGames(): void {
  for (const [id] of runningGames) killGame(id)
}

// Track kiosk state so we can restore it after un-minimizing
let wasKioskBeforeMinimize = false

ipcMain.on('window:minimize', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
    // Restore fullscreen if it was active before
    if (wasKioskBeforeMinimize) {
      mainWindow.setKiosk(true)
      wasKioskBeforeMinimize = false
    }
  } else {
    wasKioskBeforeMinimize = mainWindow.isKiosk()
    if (wasKioskBeforeMinimize) mainWindow.setKiosk(false)
    mainWindow.minimize()
  }
})
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return
  mainWindow.setKiosk(!mainWindow.isKiosk())
})
ipcMain.on('window:close', () => mainWindow?.close())

ipcMain.handle('library:load', () => {
  const games = readLibrary() as Array<Record<string, unknown>>
  return games.map(g => ({ icon: g['image'] ?? '', ...g }))
})

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
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
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
  copyFileSync(src, path.join(getCoversDir(), filename))
  return filename
})

ipcMain.handle('game:launch', (_e, config: {
  executable: string
  winePath: string
  gameId: string
  store: string
  protonPath: string
  arguments: string[] | string
  gameItemId: number
}) => {
  const env = {
    ...process.env,
    WINEPREFIX: config.winePath,
    GAMEID: config.gameId || 'umu-default',
    PROTONPATH: config.protonPath || 'GE-Proton',
    STORE: config.store || 'none'
  }

  const extraArgs = Array.isArray(config.arguments)
    ? config.arguments
    : config.arguments
      ? config.arguments.split(',').map((a: string) => a.trim()).filter(Boolean)
      : []

  const proc = spawn('umu-run', [config.executable, ...extraArgs], { env, detached: true })
  const pid = proc.pid ?? 0

  runningGames.set(config.gameItemId, { process: proc, pid })

  proc.stdout?.on('data', (d: Buffer) => {
    mainWindow?.webContents.send('game:log', { gameItemId: config.gameItemId, msg: d.toString() })
  })

  proc.stderr?.on('data', (d: Buffer) => {
    mainWindow?.webContents.send('game:log', { gameItemId: config.gameItemId, msg: d.toString() })
  })

  proc.on('close', (code: number | null) => {
    runningGames.delete(config.gameItemId)
    mainWindow?.webContents.send('game:exit', { code, gameItemId: config.gameItemId })
  })

  proc.on('error', (err: Error) => {
    runningGames.delete(config.gameItemId)
    mainWindow?.webContents.send('game:exit', { code: -1, gameItemId: config.gameItemId })
    mainWindow?.webContents.send('game:log', { gameItemId: config.gameItemId, msg: `Error: ${err.message}` })
  })

  return { ok: true }
})

ipcMain.handle('game:kill', (_e, gameItemId: number) => killGame(gameItemId))

const SGDB_BASE = 'https://www.steamgriddb.com/api/v2'

async function sgdbGet<T>(endpoint: string): Promise<T | null> {
  const key = process.env.STEAMGRIDDB_API_KEY ?? ''
  if (!key) return null
  try {
    const res = await fetch(`${SGDB_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    if (!res.ok) return null
    const json = await res.json() as { success: boolean, data: T }
    return json.success ? json.data : null
  } catch {
    return null
  }
}

async function sgdbFindId(name: string, gameId: string, store: string): Promise<number | null> {
  if (gameId !== 'umu-default' && /^\d+$/.test(gameId)) {
    const game = await sgdbGet<{ id: number }>(`/games/steam/${gameId}`)
    if (game?.id) return game.id
  }
  const storeLC = store?.toLowerCase() ?? ''
  if ((storeLC === 'egs' || storeLC === 'epic') && gameId !== 'umu-default') {
    const game = await sgdbGet<{ id: number }>(`/games/egs/${gameId}`)
    if (game?.id) return game.id
  }
  const results = await sgdbGet<Array<{ id: number }>>(`/search/autocomplete/${encodeURIComponent(name)}`)
  return results?.[0]?.id ?? null
}

async function sgdbBestImage(endpoint: string): Promise<string | null> {
  type SgdbImage = { url: string, upvotes: number, downvotes: number }
  const items = await sgdbGet<SgdbImage[]>(endpoint)
  if (!items || items.length === 0) return null
  return items.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))[0]!.url
}

async function downloadToCovers(url: string, prefix: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const ext = url.split('?')[0]!.match(/\.(png|jpg|jpeg|webp)$/i)?.[0] ?? '.jpg'
    const filename = `${prefix}_${Date.now()}${ext}`
    writeFileSync(path.join(getCoversDir(), filename), buf)
    return filename
  } catch {
    return null
  }
}

ipcMain.handle('sgdb:fetchCovers', async (
  _e,
  { name, gameId, store }: { name: string, gameId: string, store: string }
) => {
  const sgdbId = await sgdbFindId(name, gameId, store)
  if (!sgdbId) return { hero: null, icon: null }

  const [heroUrl, iconUrl] = await Promise.all([
    sgdbBestImage(`/heroes/game/${sgdbId}?nsfw=false&humor=false`),
    sgdbBestImage(`/icons/game/${sgdbId}?nsfw=false&humor=false`)
  ])

  const [hero, icon] = await Promise.all([
    heroUrl ? downloadToCovers(heroUrl, 'hero') : Promise.resolve(null),
    iconUrl ? downloadToCovers(iconUrl, 'icon') : Promise.resolve(null)
  ])

  return { hero, icon }
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

  if (!app.isPackaged) mainWindow.webContents.openDevTools()

  mainWindow.on('close', (e) => {
    if (runningGames.size > 0) {
      e.preventDefault()
      killAllGames()
      setTimeout(() => mainWindow?.destroy(), 300)
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
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
