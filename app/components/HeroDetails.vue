<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  title?: string
  description?: string
  itemKey?: string | number
  isRunning?: boolean
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'stop'): void
  (e: 'edit'): void
  (e: 'delete'): void
}>()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const toggleMenu = () => { menuOpen.value = !menuOpen.value }

const onEdit = () => {
  menuOpen.value = false
  emit('edit')
}

const onDelete = () => {
  menuOpen.value = false
  emit('delete')
}

const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div class="mt-auto mb-20 max-w-2xl px-8 md:px-16 xl:px-24">
    <Transition enter-active-class="transition duration-700 ease-out delay-150"
      enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4" mode="out-in">
      <div :key="`details-${itemKey}`" class="flex flex-col items-start gap-3">
        <h1 class="text-white text-5xl font-bold tracking-tight drop-shadow-lg">
          {{ title }}
        </h1>

        <p v-if="description" class="text-gray-300 text-lg drop-shadow-md mb-2">
          {{ description }}
        </p>

        <div class="flex gap-3 items-center">
          <Transition mode="out-in" enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95">
            <button v-if="!isRunning" key="play"
              class="px-16 py-3 mt-2 rounded-full font-bold text-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 shadow-lg backdrop-blur-sm hover:scale-105 transition-all duration-200"
              @click="$emit('play')">
              Play
            </button>
            <button v-else key="stop"
              class="px-12 py-3 mt-2 rounded-full font-bold text-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 hover:border-red-500 shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-3"
              @click="$emit('stop')">
              <span class="w-3 h-3 rounded-sm bg-current" />
              Stop
            </button>
          </Transition>

          <div ref="menuRef" class="relative mt-2">
            <button
              class="w-11 h-11 flex items-center justify-center rounded-full text-white border border-white/30 hover:bg-white/10 hover:border-white transition-all duration-200 text-xl font-bold tracking-widest"
              @click="toggleMenu">
              ···
            </button>

            <Transition enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 scale-95 translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 translate-y-1">
              <div v-if="menuOpen"
                class="absolute bottom-14 left-0 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-40 z-50">
                <button
                  class="w-full px-4 py-3 text-left text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-3"
                  @click="onEdit">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg> Edit
                </button>
                <div class="h-px bg-white/10" />
                <button
                  class="w-full px-4 py-3 text-left text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center gap-3"
                  @click="onDelete">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg> Delete
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
