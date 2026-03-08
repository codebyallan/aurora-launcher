<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNow, useDateFormat } from '@vueuse/core'
import type { CarouselItem, UMUConfig } from '../types'

const now = useNow()
const formattedTime = useDateFormat(now, 'HH:mm:ss')

const items = ref<CarouselItem[]>([])
const activeIndex = ref(0)
const activeItem = computed(() => items.value[activeIndex.value])

const isPlaying = ref(false)
const isModalOpen = ref(false)
const isConfirmDeleteOpen = ref(false)
const gameToEdit = ref<UMUConfig | undefined>(undefined)

onMounted(async () => {
  const saved = await window.electronAPI.library.load() as CarouselItem[]
  items.value = saved
  window.addEventListener('keydown', handleKeydown)
})

const isItemVisible = (index: number) => {
  const start = Math.max(0, activeIndex.value - 1)
  return index >= start && index <= start + 5
}

const handlePlay = () => {
  if (!activeItem.value || isPlaying.value) return
  isPlaying.value = true
  setTimeout(() => { isPlaying.value = false }, 4000)
}

const openAddModal = () => {
  gameToEdit.value = undefined
  isModalOpen.value = true
}

const openEditModal = () => {
  if (!activeItem.value) return
  gameToEdit.value = activeItem.value.rawData ?? {
    name: activeItem.value.title,
    description: activeItem.value.description ?? '',
    iconPath: activeItem.value.image,
    winePath: '',
    executable: '',
    gameId: '',
    store: '',
    protonPath: '',
    arguments: ''
  }
  isModalOpen.value = true
}

const handleSaveGame = async (gameData: UMUConfig) => {
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
    }
  } else {
    const newItem: CarouselItem = {
      id: Date.now(),
      title: gameData.name,
      description: gameData.description,
      image: gameData.iconPath,
      rawData: gameData
    }
    await window.electronAPI.library.append(newItem)
    items.value.push(newItem)
    activeIndex.value = items.value.length - 1
  }
  isModalOpen.value = false
}

const handleDeleteRequest = () => {
  isConfirmDeleteOpen.value = true
}

const handleDeleteConfirm = async () => {
  if (!activeItem.value) return
  await window.electronAPI.library.remove(activeItem.value.id)
  items.value.splice(activeIndex.value, 1)
  if (activeIndex.value >= items.value.length) {
    activeIndex.value = Math.max(0, items.value.length - 1)
  }
  isConfirmDeleteOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (isPlaying.value || isModalOpen.value || isConfirmDeleteOpen.value) return
  if (e.key === 'ArrowRight' && activeIndex.value < items.value.length - 1) activeIndex.value++
  else if (e.key === 'ArrowLeft' && activeIndex.value > 0) activeIndex.value--
}

onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="relative min-h-screen w-full bg-[#0f0f0f] font-sans overflow-hidden flex flex-col">
    <Teleport to="body">
      <AddGameModal :is-open="isModalOpen" :initial-data="gameToEdit" @close="isModalOpen = false"
        @save="handleSaveGame" />
      <ConfirmModal :is-open="isConfirmDeleteOpen" title="Delete game"
        :message="`Are you sure you want to remove &quot;${activeItem?.title}&quot; from your library? This action cannot be undone.`"
        confirm-label="Delete" @confirm="handleDeleteConfirm" @cancel="isConfirmDeleteOpen = false" />
      <GameLoadingOverlay :is-visible="isPlaying" :game-image="activeItem?.image" :game-title="activeItem?.title" />
    </Teleport>

    <AppBackground :image-url="activeItem?.image" :item-key="activeItem?.id" />

    <div class="relative z-10 w-full h-full min-h-screen flex flex-col pt-8">
      <AppHeader title="Games" :time="formattedTime" @add-game="openAddModal" />

      <div v-if="items.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-4 text-white/30 select-none">
        <span class="text-6xl">🎮</span>
        <p class="text-xl font-medium">No games yet</p>
        <p class="text-sm">Click the + button to add your first game</p>
      </div>

      <template v-else>
        <div class="w-full relative px-8 md:px-16 xl:px-24 py-6">
          <div class="flex items-end w-full">
            <GameCarouselItem v-for="(item, index) in items" :key="item.id" :item="item"
              :is-active="activeIndex === index" :is-visible="isItemVisible(index)" @select="activeIndex = index" />
          </div>
        </div>

        <HeroDetails :title="activeItem?.title" :description="activeItem?.description" :item-key="activeItem?.id"
          @play="handlePlay" @edit="openEditModal" @delete="handleDeleteRequest" />
      </template>
    </div>
  </div>
</template>
