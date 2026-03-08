<script setup lang="ts">
defineProps<{
  isVisible: boolean
  gameImage?: string
  gameTitle?: string
}>()
</script>

<template>
  <Transition enter-active-class="transition-opacity duration-500 ease-out" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-700 ease-in"
    leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="isVisible" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <img v-if="gameImage" :src="gameImage"
        class="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 animate-pulse" alt="">
      <div class="relative z-10 flex flex-col items-center gap-6">
        <div class="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <div class="flex flex-col items-center gap-2">
          <h2 class="text-white text-3xl font-light tracking-wider drop-shadow-lg">
            {{ gameTitle }}
          </h2>
          <p class="text-gray-400 text-lg uppercase tracking-[0.2em]">
            Starting...
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
