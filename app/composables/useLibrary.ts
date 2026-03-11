import { ref, toRaw } from 'vue'
import type { CarouselItem, UMUConfig } from '../types'

/** Strips Vue Proxy wrappers so the contextBridge structured-clone serialiser never chokes. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value)))
}

/**
 * Manages the in-memory game list and keeps it in sync with the persisted
 * library.json via IPC calls to the main process.
 */
export function useLibrary() {
  const items = ref<CarouselItem[]>([])
  const toast = useToast()

  async function load(): Promise<void> {
    items.value = await window.electronAPI.library.load()
  }

  async function addGame(data: UMUConfig): Promise<CarouselItem> {
    const item: CarouselItem = {
      id: Date.now(),
      title: data.name,
      description: data.description,
      image: data.heroPath || data.iconPath,
      icon: data.iconPath || data.heroPath,
      rawData: data
    }
    // Persist first — only update the UI if the IPC call succeeds.
    // This prevents UI and disk from diverging if the write fails.
    await window.electronAPI.library.append(toPlain(item))
    items.value.push(item)
    toast.add({ title: `${data.name} added`, description: 'Game saved to your library', color: 'success' })
    return item
  }

  async function updateGame(id: number, data: UMUConfig): Promise<void> {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const patched: CarouselItem = {
      ...items.value[idx]!,
      title: data.name,
      description: data.description,
      image: data.heroPath || data.iconPath,
      icon: data.iconPath || data.heroPath,
      rawData: data
    }
    // Persist first — the in-memory update only happens if IPC succeeds.
    await window.electronAPI.library.update(id, toPlain(patched))
    items.value[idx] = patched
    toast.add({ title: `${data.name} updated`, description: 'Changes saved to library', color: 'success' })
  }

  /**
   * Removes a game and returns the new safe active index for the caller to apply.
   * The composable does NOT mutate external state directly.
   */
  async function removeGame(id: number, currentIndex: number): Promise<number> {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return currentIndex
    const title = items.value[idx]!.title
    await window.electronAPI.library.remove(id)
    items.value.splice(idx, 1)
    toast.add({ title: `${title} removed`, description: 'Game deleted from your library', color: 'warning' })
    return Math.min(currentIndex, Math.max(0, items.value.length - 1))
  }

  return { items, load, addGame, updateGame, removeGame }
}
