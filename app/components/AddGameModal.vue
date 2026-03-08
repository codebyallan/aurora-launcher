<script setup lang="ts">
import { reactive, ref, watch, computed, onUnmounted, nextTick } from 'vue'
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
  (e: 'close'): void
  (e: 'save', gameData: UMUConfig): void
}>()

const form = reactive<UMUConfig>({
  name: '', description: '', iconPath: '', winePath: '',
  executable: '', gameId: 'umu-default', store: 'none',
  protonPath: 'GE-Proton', arguments: '',
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
  { id: 'icon', type: 'browse-image', label: 'Icon Path', field: 'iconPath', browseType: 'image' },
  { id: 'wine', type: 'browse-folder', label: 'Wine Prefix Path', field: 'winePath', browseType: 'folder' },
  { id: 'proton', type: 'browse-folder', label: 'Proton Path', field: 'protonPath', browseType: 'folder' },
  { id: 'gameId', type: 'text', label: 'Game ID', field: 'gameId' },
  { id: 'store', type: 'text', label: 'Store', field: 'store' },
  { id: 'args', type: 'text', label: 'Arguments', field: 'arguments' },
  { id: 'cancel', type: 'action', label: 'Cancel' },
  { id: 'save', type: 'action', label: 'Save' },
]

const ctrlFocusIndex = ref(0)
const scrollRef = ref<HTMLElement | null>(null)
const inputRefs = ref<Record<string, HTMLElement | null>>({})

const { onPress } = useGamepad()
let removeListener: (() => void) | null = null

watch(() => props.isOpen, async (open) => {
  if (open) {
    ctrlFocusIndex.value = 0
    removeListener = onPress(handleGamepadPress)
  } else {
    removeListener?.()
    removeListener = null
  }
})

onUnmounted(() => removeListener?.())

function handleGamepadPress(btn: number) {
  if (!props.isOpen) return

  switch (btn) {
    case BTN.DPAD_UP: case BTN.LSTICK_UP:
      moveFocus(-1); break
    case BTN.DPAD_DOWN: case BTN.LSTICK_DOWN:
      moveFocus(1); break
    case BTN.A:
      activateFocused(); break
    case BTN.B:
      emit('close'); break
    case BTN.START:
      handleSave(); break
    case BTN.LB:
      ctrlFocusIndex.value = 0; scrollToFocused(); break
    case BTN.RB:
      ctrlFocusIndex.value = FIELDS.length - 1; scrollToFocused(); break
  }
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
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (props.initialData) {
      Object.assign(form, props.initialData)
      if (Array.isArray(form.arguments)) form.arguments = form.arguments.join(', ')
    } else {
      Object.assign(form, { name: '', description: '', iconPath: '', winePath: '', executable: '', gameId: 'umu-default', store: 'none', protonPath: 'GE-Proton', arguments: '' })
    }
  }
})

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

const isFocused = (fieldId: string) =>
  props.controllerConnected && FIELDS[ctrlFocusIndex.value]?.id === fieldId

const type = () => props.controllerType ?? 'xbox'
function confirmKey() { return type() === 'ps' ? '✕' : 'A' }
function cancelKey() { return type() === 'ps' ? '○' : 'B' }
function confirmColor() { return type() === 'ps' ? '#5ba4fb' : '#62c462' }
function cancelColor() { return type() === 'ps' ? '#f55' : '#e85d5d' }
function upDownKey() { return '↑↓' }

function setRef(id: string, el: Element | null) {
  inputRefs.value[id] = el as HTMLElement | null
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
          <button class="text-gray-400 hover:text-white text-2xl leading-none" @click="$emit('close')">&times;</button>
        </div>
        <div ref="scrollRef" class="p-6 overflow-y-auto">
          <form class="space-y-5" @submit.prevent="handleSave">
            <div :ref="el => setRef('name', el as Element)">
              <label class="block text-sm font-medium text-gray-300 mb-1">Game Name *</label>
              <input v-model="form.name" type="text" :class="[
                'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors',
                isFocused('name')
                  ? 'border-white/60 ring-2 ring-white/20'
                  : 'border-white/10 focus:border-white/30',
              ]" required>
            </div>
            <div :ref="el => setRef('desc', el as Element)">
              <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea v-model="form.description" rows="2" :class="[
                'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none resize-none placeholder-gray-600 transition-colors',
                isFocused('desc')
                  ? 'border-white/60 ring-2 ring-white/20'
                  : 'border-white/10 focus:border-white/30',
              ]" placeholder="Optional — shown on the launcher home screen" />
            </div>
            <div :ref="el => setRef('exe', el as Element)">
              <label class="block text-sm font-medium text-gray-300 mb-1">Executable (.exe) *</label>
              <div class="flex gap-2">
                <input v-model="form.executable" type="text"
                  class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate"
                  required readonly>
                <button type="button" :class="[
                  'shrink-0 px-4 py-2.5 text-white rounded-lg transition-all',
                  isFocused('exe')
                    ? 'bg-white/20 ring-1 ring-white/40 scale-105'
                    : 'bg-white/10 hover:bg-white/20',
                ]" @click="browse('file', 'executable')">
                  Browse
                </button>
              </div>
            </div>
            <div :ref="el => setRef('icon', el as Element)">
              <label class="block text-sm font-medium text-gray-300 mb-1">Icon Path *</label>
              <div class="flex gap-2">
                <input v-model="form.iconPath" type="text"
                  class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate"
                  required readonly>
                <button type="button" :class="[
                  'shrink-0 px-4 py-2.5 text-white rounded-lg transition-all',
                  isFocused('icon')
                    ? 'bg-white/20 ring-1 ring-white/40 scale-105'
                    : 'bg-white/10 hover:bg-white/20',
                ]" @click="browse('image', 'iconPath')">
                  Browse
                </button>
              </div>
            </div>
            <div :ref="el => setRef('wine', el as Element)">
              <label class="block text-sm font-medium text-gray-300 mb-1">Wine Prefix Path *</label>
              <div class="flex gap-2">
                <input v-model="form.winePath" type="text"
                  class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate"
                  required readonly>
                <button type="button" :class="[
                  'shrink-0 px-4 py-2.5 text-white rounded-lg transition-all',
                  isFocused('wine')
                    ? 'bg-white/20 ring-1 ring-white/40 scale-105'
                    : 'bg-white/10 hover:bg-white/20',
                ]" @click="browse('folder', 'winePath')">
                  Browse
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-2">
              <div :ref="el => setRef('proton', el as Element)">
                <label class="block text-sm font-medium text-gray-300 mb-1">Proton Path</label>
                <div class="flex gap-2">
                  <input v-model="form.protonPath" type="text"
                    class="flex-1 w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 truncate">
                  <button type="button" :class="[
                    'shrink-0 px-3 py-2.5 text-white rounded-lg transition-all',
                    isFocused('proton')
                      ? 'bg-white/20 ring-1 ring-white/40 scale-105'
                      : 'bg-white/10 hover:bg-white/20',
                  ]" @click="browse('folder', 'protonPath')">
                    📁
                  </button>
                </div>
              </div>
              <div :ref="el => setRef('gameId', el as Element)">
                <label class="block text-sm font-medium text-gray-300 mb-1">Game ID</label>
                <input v-model="form.gameId" type="text" :class="[
                  'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors',
                  isFocused('gameId')
                    ? 'border-white/60 ring-2 ring-white/20'
                    : 'border-white/10 focus:border-white/30',
                ]">
              </div>
              <div :ref="el => setRef('store', el as Element)">
                <label class="block text-sm font-medium text-gray-300 mb-1">Store</label>
                <input v-model="form.store" type="text" :class="[
                  'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors',
                  isFocused('store')
                    ? 'border-white/60 ring-2 ring-white/20'
                    : 'border-white/10 focus:border-white/30',
                ]">
              </div>
              <div :ref="el => setRef('args', el as Element)">
                <label class="block text-sm font-medium text-gray-300 mb-1">Arguments</label>
                <input v-model="form.arguments" type="text" :class="[
                  'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors',
                  isFocused('args')
                    ? 'border-white/60 ring-2 ring-white/20'
                    : 'border-white/10 focus:border-white/30',
                ]" placeholder="-dx11, -fullscreen">
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-6 pb-2 shrink-0">
              <button :ref="el => setRef('cancel', el as Element)" type="button" :class="[
                'px-5 py-2.5 rounded-lg font-medium text-white transition-all',
                isFocused('cancel')
                  ? 'bg-white/20 ring-2 ring-white/30 scale-105'
                  : 'hover:bg-white/10',
              ]" @click="$emit('close')">
                Cancel
              </button>
              <button :ref="el => setRef('save', el as Element)" type="submit" :class="[
                'px-5 py-2.5 rounded-lg font-bold transition-all shadow-md',
                isFocused('save')
                  ? 'bg-white text-black scale-105 ring-2 ring-white/50 shadow-white/20'
                  : 'bg-white text-black hover:bg-gray-200',
              ]">
                {{ initialData ? 'Save Changes' : 'Save to Library' }}
              </button>
            </div>
          </form>
        </div>
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
          enter-to-class="opacity-100">
          <div v-if="controllerConnected"
            class="flex items-center justify-center gap-4 px-6 py-3 border-t border-white/10 bg-black/20 rounded-b-2xl">
            <div class="flex items-center gap-1.5">
              <span
                style="color:rgba(255,255,255,0.72); font-size:11px; font-weight:600; letter-spacing:-1px;">↑↓</span>
              <span style="color:rgba(255,255,255,0.6); font-size:10px;">Navigate</span>
            </div>
            <span style="color:rgba(255,255,255,0.2); font-size:8px;">·</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-black leading-none" :style="{ color: confirmColor() + 'dd' }">{{
                confirmKey() }}</span>
              <span style="color:rgba(255,255,255,0.6); font-size:10px;">Select</span>
            </div>
            <span style="color:rgba(255,255,255,0.2); font-size:8px;">·</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-black leading-none" :style="{ color: cancelColor() + 'dd' }">{{ cancelKey()
              }}</span>
              <span style="color:rgba(255,255,255,0.6); font-size:10px;">Close</span>
            </div>
            <span style="color:rgba(255,255,255,0.2); font-size:8px;">·</span>
            <div class="flex items-center gap-1.5">
              <span style="color:rgba(255,255,255,0.7); font-size:9px; font-weight:700;">{{ controllerType === 'ps' ?
                '≡' : '☰' }}</span>
              <span style="color:rgba(255,255,255,0.6); font-size:10px;">Save</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>