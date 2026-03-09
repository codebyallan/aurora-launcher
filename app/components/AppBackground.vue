<script setup lang="ts">
import { computed } from 'vue'
import { toImageUrl } from '../composables/useImageUrl'

const props = defineProps<{
  imageUrl?: string
  iconUrl?: string
  itemKey?: string | number
}>()
const displayUrl = computed(() => toImageUrl(props.imageUrl))
const displayIcon = computed(() => toImageUrl(props.iconUrl))
</script>

<template>
  <div class="absolute inset-0 z-0">
    <Transition
      enter-active-class="transition-opacity duration-700 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-700 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <!-- hero image — proper wide art -->
      <img
        v-if="displayUrl"
        :key="itemKey"
        :src="displayUrl"
        class="absolute inset-0 w-full h-full object-cover"
        alt=""
      >
      <!-- fallback: icon blurred and scaled to fill, when no hero available -->
      <div
        v-else-if="displayIcon"
        :key="`icon-${itemKey}`"
        class="absolute inset-0 overflow-hidden"
      >
        <img
          :src="displayIcon"
          class="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl opacity-60"
          alt=""
        >
      </div>
    </Transition>
    <div class="absolute inset-0 bg-linear-to-r from-black/70 via-black/10 to-transparent" />
    <div class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
  </div>
</template>
