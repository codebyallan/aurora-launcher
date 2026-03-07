<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNow, useDateFormat } from '@vueuse/core'
import type { CarouselItem, UMUConfig } from '../types'

const now = useNow()
const formattedTime = useDateFormat(now, 'HH:mm:ss')

const items = ref<CarouselItem[]>([
  { id: 1, title: 'Accessories', image: 'https://picsum.photos/seed/1/200/200' },
  { id: 2, title: 'Miles Morales', image: 'https://picsum.photos/seed/2/200/200' },
  { id: 3, title: 'Warzone', image: 'https://picsum.photos/seed/3/200/200' },
  { id: 4, title: 'eSports', image: 'https://picsum.photos/seed/4/200/200' },
  { id: 5, title: 'PlayStation Plus', image: 'https://picsum.photos/seed/5/200/200' },
  { id: 6, title: 'PS VR', image: 'https://picsum.photos/seed/6/200/200' }
])

const activeIndex = ref(0)
const activeItem = computed(() => items.value[activeIndex.value])

const isPlaying = ref(false)
const isModalOpen = ref(false)
const gameToEdit = ref<UMUConfig | undefined>(undefined)

const isItemVisible = (index: number) => {
  const start = activeIndex.value > 0 ? activeIndex.value - 1 : 0
  return index >= start && index <= start + 5
}

const handlePlay = () => {
  if (!activeItem.value || isPlaying.value) return
  isPlaying.value = true
  setTimeout(() => {
    isPlaying.value = false
  }, 4000)
}

const openAddModal = () => {
  gameToEdit.value = undefined
  isModalOpen.value = true
}

const openEditModal = () => {
  gameToEdit.value = activeItem.value.rawData || {
    name: activeItem.value.title,
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

const handleSaveGame = (gameData: UMUConfig) => {
  if (gameToEdit.value) {
    const idx = items.value.findIndex(i => i.id === activeItem.value.id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], title: gameData.name, image: gameData.iconPath, rawData: gameData }
    }
  } else {
    items.value.push({
      id: Date.now(),
      title: gameData.name,
      image: gameData.iconPath,
      rawData: gameData
    })
    activeIndex.value = items.value.length - 1
  }
  isModalOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (isPlaying.value || isModalOpen.value) return
  if (e.key === 'ArrowRight' && activeIndex.value < items.value.length - 1) activeIndex.value++
  else if (e.key === 'ArrowLeft' && activeIndex.value > 0) activeIndex.value--
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="relative min-h-screen w-full bg-[#0f0f0f] font-sans overflow-hidden flex flex-col">
    <Teleport to="body">
      <AddGameModal :is-open="isModalOpen" :initial-data="gameToEdit" @close="isModalOpen = false"
        @save="handleSaveGame" />
      <GameLoadingOverlay :is-visible="isPlaying" :game-image="activeItem?.image" :game-title="activeItem?.title" />
    </Teleport>

    <AppBackground :image-url="activeItem?.image" :item-key="activeItem?.id" />

    <div class="relative z-10 w-full h-full min-h-screen flex flex-col pt-8">
      <AppHeader title="Games" :time="formattedTime" @add-game="openAddModal" />

      <div class="w-full relative px-8 md:px-16 xl:px-24 py-6">
        <div class="flex items-end w-full">
          <GameCarouselItem v-for="(item, index) in items" :key="item.id" :item="item"
            :is-active="activeIndex === index" :is-visible="isItemVisible(index)" @select="activeIndex = index" />
        </div>
      </div>

      <HeroDetails :title="activeItem?.title" :item-key="activeItem?.id" @play="handlePlay" @edit="openEditModal" />
    </div>
  </div>
</template>