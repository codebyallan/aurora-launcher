<script setup lang="ts">
defineProps<{
  glyph: string
  label: string
  color: string
  kind: 'dpad' | 'face' | 'shoulder' | 'system'
}>()
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span
      v-if="kind === 'dpad'"
      class="text-[11px] font-semibold leading-none tracking-[-1px] text-white/72"
    >←→</span>
    <span
      v-else-if="kind === 'face'"
      class="text-[11px] font-black leading-none"
      :style="{ color }"
    >{{ glyph }}</span>
    <span
      v-else
      class="text-[9px] font-bold leading-none text-white/70"
    >{{ glyph }}</span>
    <span class="text-[10px] text-white/60">{{ label }}</span>
  </div>
</template>
