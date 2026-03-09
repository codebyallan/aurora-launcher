<script setup lang="ts">
import { reactive, ref, computed, watch, onUnmounted, nextTick } from 'vue'
import type { UMUConfig } from '../types'
import { useGamepad, BTN } from '../composables/useGamepad'
import type { ControllerType } from '../composables/useGamepad'

const props = defineProps<{
  isOpen: boolean
  initialData?: UMUConfig
  controllerType?: ControllerType
  controllerConnected?: boolean
}>()
const emit = defineEmits<{
  close: []
  save: [gameData: UMUConfig]
}>()
const form = reactive<UMUConfig>({
  name: '', description: '', heroPath: '', iconPath: '', winePath: '',
  executable: '', gameId: 'umu-default', store: 'none',
  protonPath: 'GE-Proton', arguments: ''
})
type FieldType = 'text' | 'textarea' | 'browse-file' | 'browse-image' | 'browse-folder' | 'action'
interface FieldDef {
  id: string
  type: FieldType
  label: string
  field?: keyof UMUConfig
  browseType?: 'file' | 'folder' | 'image'
}
const FIELDS: FieldDef[] = [
  { id: 'name', type: 'text', label: 'Game Name', field: 'name' },
  { id: 'desc', type: 'textarea', label: 'Description', field: 'description' },
  { id: 'exe', type: 'browse-file', label: 'Executable', field: 'executable', browseType: 'file' },
  { id: 'hero', type: 'browse-image', label: 'Hero Image', field: 'heroPath', browseType: 'image' },
  { id: 'icon', type: 'browse-image', label: 'Icon', field: 'iconPath', browseType: 'image' },
  { id: 'wine', type: 'browse-folder', label: 'Wine Prefix Path', field: 'winePath', browseType: 'folder' },
  { id: 'proton', type: 'browse-folder', label: 'Proton Path', field: 'protonPath', browseType: 'folder' },
  { id: 'gameId', type: 'text', label: 'Game ID', field: 'gameId' },
  { id: 'store', type: 'text', label: 'Store', field: 'store' },
  { id: 'args', type: 'text', label: 'Arguments', field: 'arguments' },
  { id: 'cancel', type: 'action', label: 'Cancel' },
  { id: 'save', type: 'action', label: 'Save' }
]
const ctrlFocusIndex = ref(0)

const inputRefs = ref<Record<string, HTMLElement | null>>({})
const { onPress } = useGamepad()
let removeListener: (() => void) | null = null
const isFocused = (fieldId: string) =>
  props.controllerConnected && FIELDS[ctrlFocusIndex.value]?.id === fieldId
const type = computed(() => props.controllerType ?? 'xbox')
const confirmKey = computed(() => type.value === 'ps' ? '✕' : 'A')
const cancelKey = computed(() => type.value === 'ps' ? '○' : 'B')
const saveKey = computed(() => type.value === 'ps' ? '≡' : '☰')
const confirmColor = computed(() => type.value === 'ps' ? '#5ba4fb' : '#62c462')
const cancelColor = computed(() => type.value === 'ps' ? '#f55' : '#e85d5d')
const controllerHints = computed(() => [
  { key: '↑↓', label: 'Navigate' },
  { key: confirmKey.value, label: 'Select', color: confirmColor.value + 'dd' },
  { key: cancelKey.value, label: 'Close', color: cancelColor.value + 'dd' },
  { key: saveKey.value, label: 'Save' }
])
const inputClass = (id: string) => [
  'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors',
  isFocused(id) ? 'border-white/60 ring-2 ring-white/20' : 'border-white/10 focus:border-white/30'
]
function setRef(id: string, el: unknown) {
  const node = (el as { el?: HTMLElement } | null)?.el ?? (el as HTMLElement | null)
  inputRefs.value[id] = node
}
function moveFocus(dir: 1 | -1) {
  ctrlFocusIndex.value = Math.max(0, Math.min(FIELDS.length - 1, ctrlFocusIndex.value + dir))
  scrollToFocused()
}
async function scrollToFocused() {
  await nextTick()
  const el = inputRefs.value[FIELDS[ctrlFocusIndex.value]!.id]
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
async function activateFocused() {
  const field = FIELDS[ctrlFocusIndex.value]
  if (!field) return
  if (field.type === 'action') {
    if (field.id === 'save') handleSave()
    else if (field.id === 'cancel') emit('close')
    return
  }
  if (field.browseType && field.field) {
    await browse(field.browseType, field.field)
    return
  }
  await nextTick()
  const el = inputRefs.value[field.id]
  if (el) (el as HTMLInputElement | HTMLTextAreaElement).focus()
}
function handleGamepadPress(btn: number) {
  if (!props.isOpen) return
  switch (btn) {
    case BTN.DPAD_UP: case BTN.LSTICK_UP: moveFocus(-1); break
    case BTN.DPAD_DOWN: case BTN.LSTICK_DOWN: moveFocus(1); break
    case BTN.A: activateFocused(); break
    case BTN.B: emit('close'); break
    case BTN.START: handleSave(); break
    case BTN.LB: ctrlFocusIndex.value = 0; scrollToFocused(); break
    case BTN.RB: ctrlFocusIndex.value = FIELDS.length - 1; scrollToFocused(); break
  }
}
async function browse(type: 'file' | 'folder' | 'image', field: keyof UMUConfig) {
  let result: string | null = null
  if (type === 'image') result = await window.electronAPI.dialog.openImage()
  else if (type === 'folder') result = await window.electronAPI.dialog.openFolder()
  else result = await window.electronAPI.dialog.openFile()
  if (result) (form as Record<string, unknown>)[field] = result
}
function handleSave() {
  if (!form.name || !form.winePath || !form.executable) return
  const argsArray = typeof form.arguments === 'string' && form.arguments.trim()
    ? form.arguments.split(',').map(a => a.trim())
    : []
  emit('save', { ...form, arguments: argsArray })
}
watch(() => props.isOpen, (open) => {
  if (open) {
    ctrlFocusIndex.value = 0
    removeListener = onPress(handleGamepadPress)
    if (props.initialData) {
      Object.assign(form, props.initialData)
      if (Array.isArray(form.arguments)) form.arguments = form.arguments.join(', ')
    } else {
      Object.assign(form, {
        name: '', description: '', heroPath: '', iconPath: '', winePath: '',
        executable: '', gameId: 'umu-default', store: 'none',
        protonPath: 'GE-Proton', arguments: ''
      })
    }
  } else {
    removeListener?.()
    removeListener = null
  }
})
onUnmounted(() => removeListener?.())
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
    >
      <div
        class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div class="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
          <h2 class="text-2xl font-bold text-white">
            {{ initialData ? 'Edit Game' : 'Add New Game' }}
          </h2>
          <UButton
            icon="i-lucide-x"
            square
            size="sm"
            variant="ghost"
            color="neutral"
            class="text-white/50 hover:text-white"
            @click="$emit('close')"
          />
        </div>
        <div class="px-6 pt-6 pb-8 overflow-y-auto scroll-pt-6">
          <form
            class="space-y-5 pt-1"
            @submit.prevent="handleSave"
          >
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Game Name *</label>
              <input
                :ref="el => setRef('name', el)"
                v-model="form.name"
                type="text"
                :class="inputClass('name')"
                required
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                :ref="el => setRef('desc', el)"
                v-model="form.description"
                rows="2"
                :class="[...inputClass('desc'), 'resize-none placeholder-gray-600']"
                placeholder="Optional — shown on the launcher home screen"
              />
            </div>
            <AddGameBrowseField
              :ref="el => setRef('exe', el)"
              label="Executable (.exe)"
              :model-value="form.executable"
              :focused="isFocused('exe')"
              required
              @browse="browse('file', 'executable')"
            />
            <AddGameBrowseField
              :ref="el => setRef('hero', el)"
              label="Hero Image"
              :model-value="form.heroPath"
              :focused="isFocused('hero')"
              @browse="browse('image', 'heroPath')"
            />
            <AddGameBrowseField
              :ref="el => setRef('icon', el)"
              label="Icon"
              :model-value="form.iconPath"
              :focused="isFocused('icon')"
              @browse="browse('image', 'iconPath')"
            />
            <AddGameBrowseField
              :ref="el => setRef('wine', el)"
              label="Wine Prefix Path"
              :model-value="form.winePath"
              :focused="isFocused('wine')"
              required
              @browse="browse('folder', 'winePath')"
            />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-2">
              <AddGameBrowseField
                :ref="el => setRef('proton', el)"
                label="Proton Path"
                :model-value="form.protonPath"
                :focused="isFocused('proton')"
                @browse="browse('folder', 'protonPath')"
              />
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Game ID</label>
                <input
                  :ref="el => setRef('gameId', el)"
                  v-model="form.gameId"
                  type="text"
                  :class="inputClass('gameId')"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Store</label>
                <input
                  :ref="el => setRef('store', el)"
                  v-model="form.store"
                  type="text"
                  :class="inputClass('store')"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Arguments</label>
                <input
                  :ref="el => setRef('args', el)"
                  v-model="form.arguments"
                  type="text"
                  :class="inputClass('args')"
                  placeholder="-dx11, -fullscreen"
                >
              </div>
            </div>
          </form>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
          <UButton
            :ref="el => setRef('cancel', el)"
            type="button"
            variant="ghost"
            color="neutral"
            :class="['text-white', isFocused('cancel') ? 'ring-2 ring-white/30 scale-105' : '']"
            @click="$emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            :ref="el => setRef('save', el)"
            variant="solid"
            color="primary"
            :class="[isFocused('save') ? 'scale-105 ring-2 ring-primary-400/50' : '']"
            @click="handleSave"
          >
            {{ initialData ? 'Save Changes' : 'Save to Library' }}
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
    </div>
  </Transition>
</template>
