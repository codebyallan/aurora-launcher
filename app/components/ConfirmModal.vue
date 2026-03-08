<script setup lang="ts">
defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
}>()

defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="isOpen" class="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100">
        <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <h2 class="text-white text-xl font-bold">{{ title }}</h2>
            <p class="text-gray-400 text-sm leading-relaxed">{{ message }}</p>
          </div>
          <div class="flex justify-end gap-3">
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
              @click="$emit('cancel')">
              Cancel
            </button>
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-md"
              @click="$emit('confirm')">
              {{ confirmLabel ?? 'Delete' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
