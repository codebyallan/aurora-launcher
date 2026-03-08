<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  open: boolean
  controllerFocusIndex?: number
}>()
const emit = defineEmits<{
  edit: []
  delete: []
  open: []
  close: []
}>()
const menuRef = ref<HTMLElement | null>(null)
function isFocused(index: number) {
  return props.open && props.controllerFocusIndex === index
}
function onEdit() {
  emit('close')
  emit('edit')
}
function onDelete() {
  emit('close')
  emit('delete')
}
function onClickOutside(e: MouseEvent) {
  if (props.open && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="menuRef" class="relative mt-2">
    <button :class="[
      'w-11 h-11 flex items-center justify-center rounded-full text-white border transition-all duration-200 text-xl font-bold tracking-widest',
      open ? 'bg-white/20 border-white' : 'border-white/30 hover:bg-white/10 hover:border-white'
    ]" @click="open ? emit('close') : emit('open')">
      ···
    </button>
    <Transition enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-1">
      <div v-if="open"
        class="absolute bottom-14 left-0 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-40 z-50">
        <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" :class="[
          'w-full justify-start px-4 py-3 text-sm font-medium rounded-none',
          isFocused(0) ? 'bg-white/20 text-white' : 'text-white'
        ]" @click="onEdit">
          Edit
          <template v-if="isFocused(0)">
            <span class="ml-auto text-white/50 text-xs">●</span>
          </template>
        </UButton>
        <div class="h-px bg-white/10" />
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" :class="[
          'w-full justify-start px-4 py-3 text-sm font-medium rounded-none',
          isFocused(1) ? 'bg-red-500/30 text-red-300' : 'text-red-400'
        ]" @click="onDelete">
          Delete
          <template v-if="isFocused(1)">
            <span class="ml-auto text-red-400/60 text-xs">●</span>
          </template>
        </UButton>
      </div>
    </Transition>
  </div>
</template>
