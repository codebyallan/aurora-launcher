<script setup lang="ts">
defineProps<{
  title: string
  time: string
}>()
defineEmits<{ 'add-game': [] }>()
</script>

<template>
  <div class="w-full flex justify-between items-center px-8 md:px-16 xl:px-24 mb-6">
    <h1 class="text-xl font-medium tracking-wide text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
      {{ title }}
    </h1>
    <div class="flex items-center gap-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
      <UButton icon="i-lucide-plus" square size="sm" variant="ghost" color="neutral"
        class="rounded-full size-7 text-white/50 hover:text-white hover:bg-white/15 active:scale-90"
        @click="$emit('add-game')" />
      <div class="flex items-baseline gap-1 select-none">
        <span class="text-white font-semibold tabular-nums tracking-wide text-base">{{ time.slice(0, 5) }}</span>
        <span class="text-white/50 font-normal tabular-nums text-[0.72rem]">{{ time.slice(6) }}</span>
      </div>
      <AppWindowControls />
    </div>
  </div>
</template>
