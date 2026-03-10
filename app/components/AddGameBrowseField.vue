<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  label: string
  modelValue: string
  required?: boolean
  focused?: boolean
  error?: string
}>()
defineEmits<{ browse: [] }>()
const rootEl = ref<HTMLElement | null>(null)
defineExpose({ el: rootEl })
</script>

<template>
  <div ref="rootEl">
    <label class="block text-sm font-medium text-gray-300 mb-1">
      {{ label }}<span
        v-if="required"
        class="text-white/50"
      > *</span>
    </label>
    <div class="flex gap-2">
      <input
        :value="modelValue"
        type="text"
        :class="['flex-1 w-0 bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none truncate', error ? 'border-red-500/70' : 'border-white/10']"
        readonly
      >
      <UButton
        type="button"
        icon="i-lucide-folder-open"
        variant="ghost"
        color="neutral"
        size="sm"
        :class="[
          'shrink-0 transition-all',
          focused ? 'ring-1 ring-white/40 scale-105 bg-white/20' : ''
        ]"
        @click="$emit('browse')"
      >
        Browse
      </UButton>
    </div>
    <p
      v-if="error"
      class="mt-1 text-xs text-red-400"
    >
      {{ error }}
    </p>
  </div>
</template>
