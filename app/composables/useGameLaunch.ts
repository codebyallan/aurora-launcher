import { ref, shallowRef, onUnmounted, toRaw } from 'vue'
import type { CarouselItem } from '../types'

/** Minimum time the launch overlay is shown, regardless of how fast umu-run starts. */
const OVERLAY_MIN_MS = 2500

/**
 * Tracks which games are launching or running, and provides launch/stop actions.
 * Uses shallowRef<Set> for the running set.
 */
export function useGameLaunch() {
  const launchingId = ref<number | null>(null)
  const runningIds = shallowRef(new Set<number>())
  const toast = useToast()

  // Register the exit listener immediately — not in onMounted — so events
  // are never lost if the component re-mounts after a game starts.
  const removeExitListener = window.electronAPI.game.onExit(({ gameItemId }) => {
    runningIds.value.delete(gameItemId)
    runningIds.value = new Set(runningIds.value)
    if (launchingId.value === gameItemId) launchingId.value = null
  })

  onUnmounted(() => removeExitListener())

  async function launch(item: CarouselItem): Promise<void> {
    if (!item.rawData || launchingId.value !== null) return
    launchingId.value = item.id

    toast.add({ title: `Launching ${item.title}…`, description: 'Preparing game process', color: 'info', duration: 3000 })

    try {
      // toRaw strips the Vue Proxy wrapper so structuredClone / contextBridge
      // serialisation never encounters non-cloneable Proxy traps.
      const rawData = JSON.parse(JSON.stringify(toRaw(item.rawData)))
      const payload = { ...rawData, gameItemId: item.id }

      const [result] = await Promise.all([
        window.electronAPI.game.launch(payload),
        new Promise<void>(r => setTimeout(r, OVERLAY_MIN_MS))
      ])

      if (!result.ok) {
        toast.add({ title: `Failed to launch ${item.title}`, description: 'Check the executable path and umu-run', color: 'error' })
        return
      }

      runningIds.value = new Set([...runningIds.value, item.id])
      toast.add({ title: `${item.title} is running`, description: 'Game started successfully', color: 'success' })
    } finally {
      // Always clear launching state, success or failure
      launchingId.value = null
    }
  }

  async function stop(item: CarouselItem): Promise<void> {
    await window.electronAPI.game.kill(item.id)
    runningIds.value.delete(item.id)
    runningIds.value = new Set(runningIds.value)
    toast.add({ title: `${item.title} stopped`, description: 'Game process terminated', color: 'neutral' })
  }

  const isRunning = (id: number) => runningIds.value.has(id)
  const isLaunching = (id: number) => launchingId.value === id

  return { launchingId, runningIds, launch, stop, isRunning, isLaunching }
}
