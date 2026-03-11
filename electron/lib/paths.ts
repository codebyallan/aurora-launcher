import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

/** ~/.config/aurora-launcher  (created on first access) */
export function getConfigDir(): string {
  const dir = path.join(app.getPath('home'), '.config', 'aurora-launcher')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** ~/.config/aurora-launcher/covers  (created on first access) */
export function getCoversDir(): string {
  const dir = path.join(getConfigDir(), 'covers')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** ~/.config/aurora-launcher/library.json */
export function getLibraryPath(): string {
  return path.join(getConfigDir(), 'library.json')
}
