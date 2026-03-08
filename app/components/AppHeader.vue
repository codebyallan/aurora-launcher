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
      <h1 class="text-xl font-medium tracking-wide text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
        {{ title }}
      </h1>
    </div>
    <div class="flex items-center gap-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
      <button
        class="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 active:scale-90 transition-all duration-150 cursor-pointer"
        @click="$emit('add-game')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <div class="flex items-baseline gap-1 select-none">
        <span class="text-white font-semibold tabular-nums tracking-wide" style="font-size:1rem;">{{ time.slice(0, 5) }}</span>
        <span class="text-white/50 font-normal tabular-nums" style="font-size:0.72rem;">{{ time.slice(6) }}</span>
      </div>
      <div class="flex items-center gap-1.5 ml-1">
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 active:scale-90 transition-all duration-150 cursor-pointer"
          title="Minimizar" @click="minimize">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 active:scale-90 transition-all duration-150 cursor-pointer"
          title="Tela cheia" @click="maximize">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75h6m-6 0v6m0-6L9 9M20.25 3.75h-6m6 0v6m0-6L15 9M3.75 20.25h6m-6 0v-6m0 6L9 15M20.25 20.25h-6m6 0v-6m0 6L15 15" />
          </svg>
        </button>
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500 active:scale-90 transition-all duration-150 cursor-pointer"
          title="Fechar" @click="close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
