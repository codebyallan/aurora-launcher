<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  itemKey?: string | number
  isRunning?: boolean
  controllerMenuOpen?: boolean
  controllerMenuFocusIndex?: number
}>()
defineEmits<{
  'play': []
  'stop': []
  'edit': []
  'delete': []
  'controller-menu-open': []
  'controller-menu-close': []
}>()
</script>

<template>
  <div class="mt-auto mb-20 max-w-2xl px-8 md:px-16 xl:px-24">
    <Transition
      enter-active-class="transition duration-700 ease-out delay-150"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
      mode="out-in"
    >
      <div
        :key="`details-${itemKey}`"
        class="flex flex-col items-start gap-3"
      >
        <h1 class="text-white text-5xl font-bold tracking-tight drop-shadow-lg">
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="text-gray-300 text-lg drop-shadow-md mb-2"
        >
          {{ description }}
        </p>
        <div class="flex gap-3 items-center">
          <Transition
            mode="out-in"
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <button
              v-if="!isRunning"
              key="play"
              class="px-10 py-3 mt-2 rounded-full font-bold text-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 shadow-lg backdrop-blur-sm hover:scale-105 transition-all duration-200"
              @click="$emit('play')"
            >
              Play
            </button>
            <button
              v-else
              key="stop"
              class="px-8 py-3 mt-2 rounded-full font-bold text-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 hover:border-red-500 shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-3"
              @click="$emit('stop')"
            >
              <span class="w-3 h-3 rounded-sm bg-current" />
              Stop
            </button>
          </Transition>
          <GameContextMenu
            :open="controllerMenuOpen"
            :controller-focus-index="controllerMenuFocusIndex"
            @edit="$emit('edit')"
            @delete="$emit('delete')"
            @open="$emit('controller-menu-open')"
            @close="$emit('controller-menu-close')"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
