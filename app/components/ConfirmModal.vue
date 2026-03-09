<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
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
  confirm: []
  cancel: []
}>()
const { onPress } = useGamepad()
let removeListener: (() => void) | null = null
const type = computed(() => props.controllerType ?? 'xbox')
const confirmKey = computed(() => type.value === 'ps' ? '✕' : 'A')
const cancelKey = computed(() => type.value === 'ps' ? '○' : 'B')
const confirmColor = computed(() => type.value === 'ps' ? '#5ba4fb' : '#62c462')
const cancelColor = computed(() => type.value === 'ps' ? '#f55' : '#e85d5d')
const controllerHints = computed(() => [
  { key: confirmKey.value, label: props.confirmLabel ?? 'Delete', color: confirmColor.value + 'dd' },
  { key: cancelKey.value, label: 'Cancel', color: cancelColor.value + 'dd' }
])
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
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
    >
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
      >
        <div
          v-if="isOpen"
          class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
        >
          <div class="flex flex-col gap-2 p-6">
            <h2 class="text-white text-xl font-bold">
              {{ title }}
            </h2>
            <p class="text-gray-400 text-sm leading-relaxed">
              {{ message }}
            </p>
          </div>
          <div class="flex justify-end gap-3 px-6 pb-6">
            <UButton
              variant="ghost"
              color="neutral"
              class="text-white"
              @click="$emit('cancel')"
            >
              Cancel
            </UButton>
            <UButton
              variant="solid"
              color="error"
              @click="$emit('confirm')"
            >
              {{ confirmLabel ?? 'Delete' }}
            </UButton>
          </div>
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <ModalControllerBar
              v-if="controllerConnected"
              :hints="controllerHints"
            />
          </Transition>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
