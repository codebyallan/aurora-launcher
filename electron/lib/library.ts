import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs'
import type { CarouselItem } from '../../app/types/index'
import { getLibraryPath } from './paths'

type RawRecord = Record<string, unknown>

// ─── Private helpers ──────────────────────────────────────────────────────────

function readRaw(): RawRecord[] {
  const file = getLibraryPath()
  if (!existsSync(file)) return []
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as RawRecord[]
  } catch {
    return []
  }
}

/**
 * Atomic write via tmp → rename to avoid corrupt JSON if the process is
 * killed mid-write.
 */
function writeRaw(data: RawRecord[]): void {
  const target = getLibraryPath()
  const tmp = `${target}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tmp, target)
}

/**
 * Coerces an arbitrary JSON object from the library file into a safe
 * CarouselItem shape, filling in defaults for any missing/malformed fields.
 */
export function sanitizeGame(g: RawRecord): CarouselItem {
  const image = typeof g['image'] === 'string' ? g['image'] : ''
  const icon = typeof g['icon'] === 'string' ? g['icon'] : image
  return {
    id: typeof g['id'] === 'number' ? g['id'] : Date.now(),
    title: typeof g['title'] === 'string' && g['title'] ? g['title'] : 'Unknown Game',
    description: typeof g['description'] === 'string' ? g['description'] : '',
    image,
    icon: icon || image,
    rawData: (g['rawData'] as CarouselItem['rawData']) ?? undefined
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function libraryLoad(): CarouselItem[] {
  return readRaw()
    .filter(g => g !== null && typeof g === 'object')
    .map(sanitizeGame)
}

export function libraryAppend(game: RawRecord): RawRecord {
  const games = readRaw()
  games.push(game)
  writeRaw(games)
  return game
}

export function libraryUpdate(id: number, updated: RawRecord): RawRecord | null {
  const games = readRaw() as Array<RawRecord & { id: number }>
  const idx = games.findIndex(g => g.id === id)
  if (idx === -1) return null
  games[idx] = { ...games[idx], ...updated }
  writeRaw(games)
  return games[idx]!
}

export function libraryRemove(id: number): boolean {
  const games = (readRaw() as Array<RawRecord & { id: number }>)
    .filter(g => g.id !== id)
  writeRaw(games)
  return true
}
