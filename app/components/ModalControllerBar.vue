<script setup lang="ts">
defineProps<{
  hints: { key: string, label: string, color?: string }[]
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-4 px-6 py-3 border-t border-white/10 bg-black/20 rounded-b-2xl">
    <template
      v-for="(hint, i) in hints"
      :key="hint.key + hint.label"
    >
      <div class="flex items-center gap-1.5">
        <span
          class="text-[11px] font-black leading-none"
          :style="{ color: hint.color ?? 'rgba(255,255,255,0.72)' }"
        >{{
          hint.key }}</span>
        <span class="text-[10px] text-white/60">{{ hint.label }}</span>
      </div>
      <span
        v-if="i < hints.length - 1"
        class="text-[8px] text-white/20 leading-none"
      >·</span>
    </template>
  </div>
</template>
