<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNow, useDateFormat } from '@vueuse/core'
import type { CarouselItem, UMUConfig } from '../types'
import { useGamepad, BTN } from '../composables/useGamepad'
import { SFX } from '../composables/useAudio'

const now = useNow()
const formattedTime = useDateFormat(now, 'HH:mm:ss')
const items = ref<CarouselItem[]>([])
const activeIndex = ref(0)
const activeItem = computed(() => items.value[activeIndex.value])
const launchingGameId = ref<number | null>(null)
const runningGameIds = ref<Set<number>>(new Set())
const isModalOpen = ref(false)
const isConfirmDeleteOpen = ref(false)
const gameToEdit = ref<UMUConfig | undefined>(undefined)
const menuOpen = ref(false)
const menuFocusIndex = ref(0)
const isActiveRunning = computed(() =>
  activeItem.value !== undefined && runningGameIds.value.has(activeItem.value.id)
)
const isActiveLaunching = computed(() => activeItem.value?.id === launchingGameId.value)
const { isConnected, controllerType, onPress } = useGamepad()
const menuItems = ['edit', 'delete'] as const
type MenuItem = typeof menuItems[number]
const controllerHints = computed<{ btn: number, label: string }[]>(() => {
  if (isConfirmDeleteOpen.value || isModalOpen.value || isActiveLaunching.value) return []
  if (menuOpen.value) {
    return [
      { btn: BTN.DPAD_UP, label: 'Navigate' },
      { btn: BTN.A, label: 'Select' },
      { btn: BTN.B, label: 'Close' }
    ]
  }
  if (isActiveRunning.value) {
    return [
      { btn: BTN.DPAD_LEFT, label: 'Navigate' },
      { btn: BTN.A, label: 'Stop Game' },
      { btn: BTN.B, label: 'Close Game' },
      { btn: BTN.SELECT, label: 'Fullscreen' },
      { btn: BTN.HOME, label: 'Minimize' }
    ]
  }
  return [
    { btn: BTN.DPAD_LEFT, label: 'Navigate' },
    { btn: BTN.A, label: 'Play' },
    { btn: BTN.X, label: 'Edit' },
    { btn: BTN.Y, label: 'Options' },
    { btn: BTN.LB, label: 'First' },
    { btn: BTN.RB, label: 'Last' },
    { btn: BTN.START, label: 'Add Game' },
    { btn: BTN.SELECT, label: 'Fullscreen' },
    { btn: BTN.HOME, label: 'Minimize' }
  ]
})
const LAUNCH_OVERLAY_MIN_MS = 2500
let removeExit: (() => void) | null = null
let removeGamepadListener: (() => void) | null = null
onMounted(async () => {
  const saved = await window.electronAPI.library.load() as CarouselItem[]
  items.value = saved
  removeExit = window.electronAPI.game.onExit(({ gameItemId }) => {
    runningGameIds.value.delete(gameItemId)
    runningGameIds.value = new Set(runningGameIds.value)
    if (launchingGameId.value === gameItemId) launchingGameId.value = null
  })
  window.addEventListener('keydown', handleKeydown)
  removeGamepadListener = onPress(handleGamepadPress)
})
onUnmounted(() => {
  removeExit?.()
  removeGamepadListener?.()
  window.removeEventListener('keydown', handleKeydown)
})
function handleGamepadPress(btn: number) {
  if (isActiveLaunching.value) return
  if (isConfirmDeleteOpen.value || isModalOpen.value) return
  if (menuOpen.value) {
    switch (btn) {
      case BTN.DPAD_UP: case BTN.LSTICK_UP:
        menuFocusIndex.value = Math.max(0, menuFocusIndex.value - 1); break
      case BTN.DPAD_DOWN: case BTN.LSTICK_DOWN:
        menuFocusIndex.value = Math.min(menuItems.length - 1, menuFocusIndex.value + 1); break
      case BTN.A: executeMenuItem(menuItems[menuFocusIndex.value]!); break
      case BTN.B: case BTN.Y: menuOpen.value = false; break
    }
    return
  }
  switch (btn) {
    case BTN.DPAD_LEFT: case BTN.LSTICK_LEFT:
      if (activeIndex.value > 0) { activeIndex.value--; SFX.navigate() } break
    case BTN.DPAD_RIGHT: case BTN.LSTICK_RIGHT:
      if (activeIndex.value < items.value.length - 1) { activeIndex.value++; SFX.navigate() } break
    case BTN.LB: activeIndex.value = 0; SFX.navigate(); break
    case BTN.RB: activeIndex.value = Math.max(0, items.value.length - 1); SFX.navigate(); break
    case BTN.A: if (isActiveRunning.value) handleStop(); else handlePlay(); break
    case BTN.B: if (isActiveRunning.value) handleStop(); break
    case BTN.X: if (activeItem.value) openEditModal(); break
    case BTN.Y: if (activeItem.value) { menuFocusIndex.value = 0; menuOpen.value = true } break
    case BTN.START: openAddModal(); break
    case BTN.SELECT: window.electronAPI?.window?.maximize(); break
    case BTN.HOME: window.electronAPI?.window?.minimize(); break
  }
}
function executeMenuItem(item: MenuItem) {
  menuOpen.value = false
  if (item === 'edit') openEditModal()
  else if (item === 'delete') handleDeleteRequest()
}
const isItemVisible = (index: number) => {
  const start = Math.max(0, activeIndex.value - 1)
  return index >= start && index <= start + 5
}
async function handlePlay() {
  if (!activeItem.value?.rawData || isActiveLaunching.value) return
  SFX.play()
  const gameId = activeItem.value.id
  launchingGameId.value = gameId
  const payload = { ...JSON.parse(JSON.stringify(activeItem.value.rawData)), gameItemId: gameId }
  const [result] = await Promise.all([
    window.electronAPI.game.launch(payload),
    new Promise(r => setTimeout(r, LAUNCH_OVERLAY_MIN_MS))
  ])
  if (result.error) { launchingGameId.value = null; return }
  runningGameIds.value = new Set([...runningGameIds.value, gameId])
  launchingGameId.value = null
}
async function handleStop() {
  if (!activeItem.value) return
  SFX.stop()
  await window.electronAPI.game.kill(activeItem.value.id)
  runningGameIds.value.delete(activeItem.value.id)
  runningGameIds.value = new Set(runningGameIds.value)
}
function openAddModal() { gameToEdit.value = undefined; isModalOpen.value = true }
function openEditModal() {
  if (!activeItem.value) return
  gameToEdit.value = activeItem.value.rawData ?? {
    name: activeItem.value.title, description: activeItem.value.description ?? '',
    iconPath: activeItem.value.image, winePath: '', executable: '',
    gameId: '', store: '', protonPath: '', arguments: ''
  }
  isModalOpen.value = true
}
async function handleSaveGame(gameData: UMUConfig) {
  if (gameToEdit.value) {
    const idx = items.value.findIndex(i => i.id === activeItem.value?.id)
    if (idx !== -1) {
      const patched: CarouselItem = {
        ...items.value[idx],
        title: gameData.name,
        description: gameData.description,
        image: gameData.iconPath,
        rawData: gameData
      }
      items.value[idx] = patched
      await window.electronAPI.library.update(patched.id, patched)
      SFX.save()
    }
  } else {
    const newItem: CarouselItem = {
      id: Date.now(), title: gameData.name,
      description: gameData.description, image: gameData.iconPath, rawData: gameData
    }
    await window.electronAPI.library.append(newItem)
    items.value.push(newItem)
    activeIndex.value = items.value.length - 1
    SFX.add()
  }
  isModalOpen.value = false
}
function handleDeleteRequest() { isConfirmDeleteOpen.value = true }
async function handleDeleteConfirm() {
  if (!activeItem.value) return
  await window.electronAPI.library.remove(activeItem.value.id)
  items.value.splice(activeIndex.value, 1)
  if (activeIndex.value >= items.value.length) activeIndex.value = Math.max(0, items.value.length - 1)
  isConfirmDeleteOpen.value = false
  SFX.delete()
}
function handleKeydown(e: KeyboardEvent) {
  if (isActiveLaunching.value || isModalOpen.value || isConfirmDeleteOpen.value) return
  if (e.key === 'ArrowRight' && activeIndex.value < items.value.length - 1) { activeIndex.value++; SFX.navigate() } else if (e.key === 'ArrowLeft' && activeIndex.value > 0) { activeIndex.value--; SFX.navigate() }
}
</script>

<template>
  <div class="relative min-h-screen w-full bg-[#0f0f0f] font-sans overflow-hidden flex flex-col">
    <Teleport to="body">
      <AddGameModal
        :is-open="isModalOpen"
        :initial-data="gameToEdit"
        :controller-type="controllerType"
        :controller-connected="isConnected"
        @close="isModalOpen = false"
        @save="handleSaveGame"
      />
      <ConfirmModal
        :is-open="isConfirmDeleteOpen"
        title="Delete game"
        :message="`Are you sure you want to remove &quot;${activeItem?.title}&quot; from your library? This action cannot be undone.`"
        confirm-label="Delete"
        :controller-type="controllerType"
        :controller-connected="isConnected"
        @confirm="handleDeleteConfirm"
        @cancel="isConfirmDeleteOpen = false"
      />
      <GameLoadingOverlay
        :is-visible="launchingGameId !== null"
        :game-image="activeItem?.image"
        :game-title="activeItem?.title"
      />
    </Teleport>
    <AppBackground
      :image-url="activeItem?.image"
      :item-key="activeItem?.id"
    />
    <div class="relative z-10 w-full h-full min-h-screen flex flex-col pt-8">
      <AppHeader
        title="Games"
        :time="formattedTime"
        @add-game="openAddModal"
      />
      <GameEmptyState v-if="items.length === 0" />
      <template v-else>
        <div class="w-full relative px-8 md:px-16 xl:px-24 py-6">
          <div class="flex items-end w-full">
            <GameCarouselItem
              v-for="(item, index) in items"
              :key="item.id"
              :item="item"
              :is-active="activeIndex === index"
              :is-visible="isItemVisible(index)"
              @select="activeIndex = index; SFX.navigate()"
            />
          </div>
        </div>
        <GameHeroSection
          :title="activeItem?.title"
          :description="activeItem?.description"
          :item-key="activeItem?.id"
          :is-running="isActiveRunning"
          :controller-menu-open="menuOpen"
          :controller-menu-focus-index="menuFocusIndex"
          @play="handlePlay"
          @stop="handleStop"
          @edit="openEditModal"
          @delete="handleDeleteRequest"
          @controller-menu-open="menuOpen = true; menuFocusIndex = 0"
          @controller-menu-close="menuOpen = false"
        />
      </template>
    </div>
    <ControllerHints
      :hints="controllerHints"
      :controller-type="controllerType"
      :visible="isConnected && !isActiveLaunching"
    />
  </div>
</template>
