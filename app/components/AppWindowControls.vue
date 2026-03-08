<script setup lang="ts">
const win = window.electronAPI?.window
</script>

<template>
  <div class="flex items-center gap-1.5">
    <UButton icon="i-lucide-minus" square size="sm" variant="ghost" color="neutral"
      class="rounded-full size-7 text-white/50 hover:text-white hover:bg-white/15 active:scale-90"
      @click="win?.minimize()" />
    <UButton icon="i-lucide-maximize-2" square size="sm" variant="ghost" color="neutral"
      class="rounded-full size-7 text-white/50 hover:text-white hover:bg-white/15 active:scale-90"
      @click="win?.maximize()" />
    <UButton icon="i-lucide-x" square size="sm" variant="ghost" color="neutral"
      class="rounded-full size-7 text-white/50 hover:text-white hover:bg-red-500 active:scale-90"
      @click="win?.close()" />
  </div>
</template>
