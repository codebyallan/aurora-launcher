<script setup lang="ts">
defineProps<{
  title: string
  time: string
}>()

defineEmits<{
  (e: 'add-game'): void
}>()

const win = window.electronAPI?.window

const minimize = () => win?.minimize()
const maximize = () => win?.maximize()
const close = () => win?.close()
</script>

<template>
  <div class="w-full flex justify-between items-center px-8 md:px-16 xl:px-24 mb-6">
    <div class="flex items-center gap-6">
      <h1 class="text-xl font-medium tracking-wide text-white">
        {{ title }}
      </h1>
    </div>
    <div class="flex items-center gap-6">
      <button
        class="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-black flex items-center justify-center text-white border border-white/20 transition-all shadow-lg cursor-pointer"
        @click="$emit('add-game')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <p class="text-lg font-medium text-white tracking-wide drop-shadow-md">
        {{ time }}
      </p>
      <div class="flex items-center gap-2 ml-2">
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/15 hover:bg-white/30 border border-white/20 hover:border-white/40 shadow-md transition-all duration-150 cursor-pointer"
          title="Minimizar" @click="minimize">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"
            stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/15 hover:bg-white/30 border border-white/20 hover:border-white/40 shadow-md transition-all duration-150 cursor-pointer"
          title="Tela cheia" @click="maximize">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"
            stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3.75 3.75h6m-6 0v6m0-6L9 9M20.25 3.75h-6m6 0v6m0-6L15 9M3.75 20.25h6m-6 0v-6m0 6L9 15M20.25 20.25h-6m6 0v-6m0 6L15 15" />
          </svg>
        </button>
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-white bg-red-500/60 hover:bg-red-500 border border-red-400/40 hover:border-red-400 shadow-md transition-all duration-150 cursor-pointer"
          title="Fechar" @click="close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"
            stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
