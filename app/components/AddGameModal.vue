<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { UMUConfig } from '../types'

const props = defineProps<{
  isOpen: boolean
  initialData?: UMUConfig
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', gameData: UMUConfig): void
}>()

const form = reactive<UMUConfig>({
  name: '',
  description: '',
  iconPath: '',
  winePath: '',
  executable: '',
  gameId: 'umu-default',
  store: 'none',
  protonPath: 'GE-Proton',
  arguments: ''
})

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      if (props.initialData) {
        Object.assign(form, props.initialData)
        if (Array.isArray(form.arguments)) {
          form.arguments = form.arguments.join(', ')
        }
      } else {
        Object.assign(form, {
          name: '',
          description: '',
          iconPath: '',
          winePath: '',
          executable: '',
          gameId: 'umu-default',
          store: 'none',
          protonPath: 'GE-Proton',
          arguments: ''
        })
      }
    }
  }
)

const browse = async (type: 'file' | 'folder' | 'image', field: keyof UMUConfig) => {
  let result: string | null = null
  if (type === 'image') result = await window.electronAPI.dialog.openImage()
  else if (type === 'folder') result = await window.electronAPI.dialog.openFolder()
  else result = await window.electronAPI.dialog.openFile()
  if (result) (form as Record<string, unknown>)[field] = result
}

const handleSave = () => {
  if (!form.name || !form.iconPath || !form.winePath || !form.executable) return
  const argsArray = typeof form.arguments === 'string' && form.arguments.trim()
    ? form.arguments.split(',').map(a => a.trim())
    : []
  emit('save', { ...form, arguments: argsArray })
}
</script>

<template>
  <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div
        class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
          <h2 class="text-2xl font-bold text-white">
            {{ initialData ? 'Edit Game' : 'Add New Game' }}
          </h2>
          <button class="text-gray-400 hover:text-white text-2xl leading-none" @click="$emit('close')">
            &times;
          </button>
        </div>
        <div class="p-6 overflow-y-auto">
          <form class="space-y-5" @submit.prevent="handleSave">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Game Name *</label>
              <input v-model="form.name" type="text"
                class="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea v-model="form.description" rows="2"
                class="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 resize-none placeholder-gray-600"
                placeholder="Optional — shown on the launcher home screen"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Executable (.exe) *</label>
              <div class="flex gap-2">
                <input v-model="form.executable" type="text"
                  class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate"
                  required readonly>
                <button type="button"
                  class="shrink-0 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  @click="browse('file', 'executable')">
                  Browse
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Icon Path *</label>
              <div class="flex gap-2">
                <input v-model="form.iconPath" type="text"
                  class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate"
                  required readonly>
                <button type="button"
                  class="shrink-0 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  @click="browse('image', 'iconPath')">
                  Browse
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Wine Prefix Path *</label>
              <div class="flex gap-2">
                <input v-model="form.winePath" type="text"
                  class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate"
                  required readonly>
                <button type="button"
                  class="shrink-0 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  @click="browse('folder', 'winePath')">
                  Browse
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-2">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Proton Path</label>
                <div class="flex gap-2">
                  <input v-model="form.protonPath" type="text"
                    class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate">
                  <button type="button" class="shrink-0 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                    @click="browse('folder', 'protonPath')">
                    📁
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Game ID</label>
                <input v-model="form.gameId" type="text"
                  class="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Store</label>
                <input v-model="form.store" type="text"
                  class="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Arguments</label>
                <input v-model="form.arguments" type="text"
                  class="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                  placeholder="-dx11, -fullscreen">
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-6 pb-2 shrink-0">
              <button type="button"
                class="px-5 py-2.5 rounded-lg font-medium text-white hover:bg-white/10 transition-colors"
                @click="$emit('close')">
                Cancel
              </button>
              <button type="submit"
                class="px-5 py-2.5 rounded-lg font-bold bg-white text-black hover:bg-gray-200 transition-colors shadow-md">
                {{ initialData ? 'Save Changes' : 'Save to Library' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Transition>
</template>