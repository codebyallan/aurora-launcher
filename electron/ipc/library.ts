import { ipcMain } from 'electron'
import { libraryLoad, libraryAppend, libraryUpdate, libraryRemove } from '../lib/library'
import type { CarouselItem } from '../../app/types/index'

/** Guarantees a plain JSON-safe object — the contextBridge already deserialises
 *  the Proxy, but an extra round-trip is cheap and prevents any edge-case corruption. */
function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export function registerLibraryHandlers(): void {
  ipcMain.handle('library:load', (): CarouselItem[] => {
    try { return libraryLoad() } catch { return [] }
  })

  ipcMain.handle('library:append', (_e, game: unknown) =>
    libraryAppend(toPlain(game) as Record<string, unknown>))

  ipcMain.handle('library:update', (_e, id: number, updated: unknown) =>
    libraryUpdate(id, toPlain(updated) as Record<string, unknown>))

  ipcMain.handle('library:remove', (_e, id: number) =>
    libraryRemove(id))
}
