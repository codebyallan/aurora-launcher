<script setup lang="ts">
defineProps<{
  title?: string
  itemKey?: string | number
}>()

defineEmits<{
  (e: 'play'): void
  (e: 'edit'): void
}>()
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
        <p class="text-gray-300 text-lg drop-shadow-md mb-2">
          Be Greater. Be Yourself.
        </p>
        <div class="flex gap-4">
          <button
            class="px-16 py-3 mt-2 rounded-full font-bold text-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 shadow-lg backdrop-blur-sm hover:scale-105 transition-all duration-200"
            @click="$emit('play')">
            Play
          </button>
          <button
            class="px-8 py-3 mt-2 rounded-full font-medium text-lg bg-transparent text-white border border-white/30 hover:bg-white/10 hover:border-white transition-all duration-200"
            @click="$emit('edit')">
            Edit
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>