<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNow, useDateFormat } from '@vueuse/core'
import type { UMUConfig } from '../types'
import { useGamepad, BTN, type BtnIndex } from '../composables/useGamepad'
import { useLibrary } from '../composables/useLibrary'
import { useGameLaunch } from '../composables/useGameLaunch'
import { SFX } from '../composables/useAudio'

// ── Clock ─────────────────────────────────────────────────────────────────────
const now = useNow()
const formattedTime = useDateFormat(now, 'HH:mm:ss')

// ── Library ───────────────────────────────────────────────────────────────────
const { items, load, addGame, updateGame, removeGame } = useLibrary()
const activeIndex = ref(0)
const activeItem = computed(() => items.value[activeIndex.value])

// ── Game process state ────────────────────────────────────────────────────────
const { launchingId, launch, stop, isRunning, isLaunching } = useGameLaunch()
const isActiveRunning = computed(() =>
  activeItem.value !== undefined && isRunning(activeItem.value.id)
)
const isActiveLaunching = computed(() =>
  activeItem.value !== undefined && isLaunching(activeItem.value.id)
)

// Snapshot of the game that is currently launching — kept stable for the
// duration of the overlay so navigating the carousel doesn't swap the image/title.
const launchingGameImage = ref<string | undefined>(undefined)
const launchingGameTitle = ref<string | undefined>(undefined)

// ── Modal state ───────────────────────────────────────────────────────────────
const isModalOpen = ref(false)
const isConfirmDeleteOpen = ref(false)
const gameToEdit = ref<UMUConfig | undefined>(undefined)

// ── Context menu state ────────────────────────────────────────────────────────
const menuOpen = ref(false)
const menuFocusIndex = ref(0)
const menuItems = ['edit', 'delete'] as const
type MenuItem = typeof menuItems[number]

// ── Controller ────────────────────────────────────────────────────────────────
const { isConnected, controllerType, onPress } = useGamepad()

const controllerHints = computed<{ btn: BtnIndex, label: string }[]>(() => {
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

// ── Carousel ──────────────────────────────────────────────────────────────────
function isItemVisible(index: number): boolean {
  const start = Math.max(0, activeIndex.value - 1)
  return index >= start && index <= start + 5
}

// ── Gamepad navigation ────────────────────────────────────────────────────────
function handleGamepadPress(btn: number) {
  if (isActiveLaunching.value) return
  if (isConfirmDeleteOpen.value || isModalOpen.value) return

  if (menuOpen.value) {
    switch (btn) {
      case BTN.DPAD_UP:
      case BTN.LSTICK_UP:
        menuFocusIndex.value = Math.max(0, menuFocusIndex.value - 1); break
      case BTN.DPAD_DOWN:
      case BTN.LSTICK_DOWN:
        menuFocusIndex.value = Math.min(menuItems.length - 1, menuFocusIndex.value + 1); break
      case BTN.A: executeMenuItem(menuItems[menuFocusIndex.value]!); break
      case BTN.B:
      case BTN.Y: menuOpen.value = false; break
    }
    return
  }

  switch (btn) {
    case BTN.DPAD_LEFT:
    case BTN.LSTICK_LEFT:
      if (activeIndex.value > 0) { activeIndex.value--; SFX.navigate() } break
    case BTN.DPAD_RIGHT:
    case BTN.LSTICK_RIGHT:
      if (activeIndex.value < items.value.length - 1) { activeIndex.value++; SFX.navigate() } break
    case BTN.LB: activeIndex.value = 0; SFX.navigate(); break
    case BTN.RB: activeIndex.value = Math.max(0, items.value.length - 1); SFX.navigate(); break
    case BTN.A: isActiveRunning.value ? handleStop() : handlePlay(); break
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

// ── Keyboard navigation ───────────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (isActiveLaunching.value || isModalOpen.value || isConfirmDeleteOpen.value) return
  if (e.key === 'ArrowRight' && activeIndex.value < items.value.length - 1) {
    activeIndex.value++; SFX.navigate()
  } else if (e.key === 'ArrowLeft' && activeIndex.value > 0) {
    activeIndex.value--; SFX.navigate()
  }
}

// ── Game actions ──────────────────────────────────────────────────────────────
async function handlePlay() {
  if (!activeItem.value) return
  // Snapshot image/title synchronously before any await — the user can navigate
  // the carousel during the 2500ms overlay and activeItem would change.
  launchingGameImage.value = activeItem.value.image
  launchingGameTitle.value = activeItem.value.title
  await launch(activeItem.value)
  // Only play the SFX if the game actually started (launch sets runningIds).
  // Use optional chaining — activeItem may have changed during the 2500ms overlay.
  if (activeItem.value && isRunning(activeItem.value.id)) SFX.play()
}

async function handleStop() {
  if (!activeItem.value) return
  SFX.stop()
  await stop(activeItem.value)
}

// ── Modal actions ─────────────────────────────────────────────────────────────
function openAddModal() {
  gameToEdit.value = undefined
  isModalOpen.value = true
}

function openEditModal() {
  if (!activeItem.value) return
  // If rawData is missing (edge case), build a minimal config from display data
  gameToEdit.value = activeItem.value.rawData ?? {
    name: activeItem.value.title,
    description: activeItem.value.description ?? '',
    heroPath: activeItem.value.image,
    iconPath: activeItem.value.icon,
    winePath: '',
    executable: '',
    gameId: 'umu-default',
    store: 'none',
    protonPath: 'GE-Proton',
    arguments: []
  }
  isModalOpen.value = true
}

async function handleSaveGame(gameData: UMUConfig) {
  // Capture both mode and target ID synchronously — before any await —
  // so that user navigating the carousel mid-save doesn't corrupt the target.
  const isEditing = !!gameToEdit.value && !!activeItem.value
  const editingItemId = isEditing ? activeItem.value!.id : null
  try {
    const needsHero = !gameData.heroPath
    const needsIcon = !gameData.iconPath
    let data = gameData
    if (needsHero || needsIcon) {
      const covers = await window.electronAPI.sgdb.fetchCovers({
        name: gameData.name,
        gameId: gameData.gameId,
        store: gameData.store
      })
      data = {
        ...gameData,
        heroPath: (needsHero && covers.hero) ? covers.hero : gameData.heroPath,
        iconPath: (needsIcon && covers.icon) ? covers.icon : gameData.iconPath
      }
    }

    if (isEditing && editingItemId !== null) {
      await updateGame(editingItemId, data)
      SFX.save()
    } else {
      await addGame(data)
      activeIndex.value = items.value.length - 1
      SFX.add()
    }
    isModalOpen.value = false
  } catch (err) {
    console.error('[aurora] save failed:', err)
    isModalOpen.value = false
  }
}

function handleDeleteRequest() {
  isConfirmDeleteOpen.value = true
}

async function handleDeleteConfirm() {
  if (!activeItem.value) return
  activeIndex.value = await removeGame(activeItem.value.id, activeIndex.value)
  isConfirmDeleteOpen.value = false
  SFX.delete()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let removeGamepadListener: (() => void) | null = null

onMounted(async () => {
  await load()
  window.addEventListener('keydown', handleKeydown)
  removeGamepadListener = onPress(handleGamepadPress)
})

onUnmounted(() => {
  removeGamepadListener?.()
  window.removeEventListener('keydown', handleKeydown)
})
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
        :is-visible="launchingId !== null"
        :game-image="launchingGameImage"
        :game-title="launchingGameTitle"
      />
    </Teleport>

    <AppBackground
      :image-url="activeItem?.image"
      :icon-url="activeItem?.icon"
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
              :is-running="isRunning(item.id)"
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
