<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useGamepad, BTN } from '../composables/useGamepad'
import type { ControllerType } from '../composables/useGamepad'

const props = defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  controllerType?: ControllerType
  controllerConnected?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { onPress } = useGamepad()

let removeListener: (() => void) | null = null

watch(() => props.isOpen, (open) => {
  if (open) {
    removeListener = onPress((btn) => {
      if (!props.isOpen) return
      if (btn === BTN.A) emit('confirm')
      else if (btn === BTN.B) emit('cancel')
    })
  } else {
    removeListener?.()
    removeListener = null
  }
})

onUnmounted(() => removeListener?.())

const type = () => props.controllerType ?? 'xbox'

function confirmKey() {
  return type() === 'ps' ? '✕' : 'A'
}
function cancelKey() {
  return type() === 'ps' ? '○' : 'B'
}
function confirmColor() {
  return type() === 'ps' ? '#5ba4fb' : '#62c462'
}
function cancelColor() {
  return type() === 'ps' ? '#f55' : '#e85d5d'
}
</script>

<template>
  <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="isOpen" class="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100">
        <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <h2 class="text-white text-xl font-bold">{{ title }}</h2>
            <p class="text-gray-400 text-sm leading-relaxed">{{ message }}</p>
          </div>

          <div class="flex justify-end gap-3">
            <button class="px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
              @click="$emit('cancel')">
              Cancel
            </button>
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-md"
              @click="$emit('confirm')">
              {{ confirmLabel ?? 'Delete' }}
            </button>
          </div>

          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
            enter-to-class="opacity-100">
            <div v-if="controllerConnected"
              class="flex items-center justify-center gap-4 pt-2 border-t border-white/10">
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-black leading-none" :style="{ color: confirmColor() + 'dd' }">{{
                  confirmKey() }}</span>
                <span style="color:rgba(255,255,255,0.6); font-size:10px;">{{ confirmLabel ?? 'Delete' }}</span>
              </div>
              <span style="color:rgba(255,255,255,0.2); font-size:8px;">·</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-black leading-none" :style="{ color: cancelColor() + 'dd' }">{{
                  cancelKey() }}</span>
                <span style="color:rgba(255,255,255,0.6); font-size:10px;">Cancel</span>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </div>
  </Transition>
</template>