<script setup lang="ts">
import { computed } from 'vue'
import { toImageUrl } from '../composables/useImageUrl'
import type { CarouselItem } from '../types'

const props = defineProps<{
  item: CarouselItem
  isActive: boolean
  isVisible: boolean
  isRunning?: boolean
}>()
defineEmits<{ select: [] }>()
const displayImage = computed(() => toImageUrl(props.item.icon || props.item.image))
</script>

<template>
  <div
    :class="[
      'flex flex-col justify-end items-start transition-all duration-300 ease-out shrink-0',
      isActive ? 'w-24 z-10 mr-4' : isVisible ? 'w-16 mr-3' : 'w-0 mr-0 opacity-0 pointer-events-none overflow-hidden'
    ]"
  >
    <button
      :class="[
        'relative w-full overflow-hidden rounded-[1.25rem] transition-all duration-300 ease-out cursor-pointer focus:outline-none origin-bottom',
        isActive
          ? 'h-24 ring-[3px] ring-white shadow-xl opacity-100 scale-100'
          : 'h-16 opacity-80 hover:opacity-100 brightness-75 hover:brightness-100 scale-95'
      ]"
      @click="$emit('select')"
    >
      <img
        :src="displayImage ?? ''"
        :alt="item.title"
        class="w-full h-full object-cover pointer-events-none"
      >
      <!-- Running badge -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-50"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-50"
      >
        <div
          v-if="isRunning"
          class="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
        </div>
      </Transition>
    </button>
    <div class="h-6 mt-2 overflow-visible w-full flex justify-start">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <h2
          v-if="isActive"
          class="text-white text-sm tracking-wide font-medium drop-shadow-md whitespace-nowrap pointer-events-none"
        >
          {{ item.title }}
        </h2>
      </Transition>
    </div>
  </div>
</template>
