<script setup lang="ts">
import { reactive, ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { z } from 'zod'
import type { UMUConfig } from '../types'
import { parseArgs, serializeArgs } from '../utils/args'
import { useGamepad, BTN } from '../composables/useGamepad'
import type { ControllerType } from '../composables/useGamepad'

// ── Props & emits ─────────────────────────────────────────────────────────────

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

// ── Form type ─────────────────────────────────────────────────────────────────
// arguments is a plain string in the UI; parsed on save into string[] + extraEnv

type GameForm = Omit<UMUConfig, 'arguments' | 'extraEnv'> & { arguments: string }

const FORM_DEFAULTS: GameForm = {
  name: '',
  description: '',
  heroPath: '',
  iconPath: '',
  winePath: '',
  executable: '',
  gameId: 'umu-default',
  store: 'none',
  protonPath: 'GE-Proton',
  arguments: ''
}

const form = reactive<GameForm>({ ...FORM_DEFAULTS })

// ── Validation ────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Game name is required'),
  executable: z.string()
    .min(1, 'Executable is required')
    .refine(v => /\.(exe|bat|sh)$/i.test(v), 'Must be a .exe, .bat or .sh file'),
  winePath: z.string()
    .min(1, 'Wine prefix path is required')
    .refine(v => v.startsWith('/'), 'Must be an absolute Linux path (starts with /)'),
  gameId: z.string()
    .refine(v => !/\s/.test(v), 'Game ID must not contain spaces')
    .optional()
    .or(z.literal('')),
  store: z.string().optional()
})

type FormErrors = Partial<Record<keyof GameForm, string>>
const errors = ref<FormErrors>({})

// ── Controller focus map ──────────────────────────────────────────────────────

type FieldKind = 'text' | 'textarea' | 'browse-file' | 'browse-image' | 'browse-folder' | 'action'

interface FieldDef {
  id: string
  kind: FieldKind
  label: string
  /** Which form key this field edits (undefined for action buttons). */
  formKey?: keyof GameForm
  browseType?: 'file' | 'folder' | 'image'
}

const FIELDS: FieldDef[] = [
  { id: 'name', kind: 'text', label: 'Game Name', formKey: 'name' },
  { id: 'lookup', kind: 'action', label: 'Lookup UMU' },
  { id: 'desc', kind: 'textarea', label: 'Description', formKey: 'description' },
  { id: 'exe', kind: 'browse-file', label: 'Executable', formKey: 'executable', browseType: 'file' },
  { id: 'hero', kind: 'browse-image', label: 'Hero Image', formKey: 'heroPath', browseType: 'image' },
  { id: 'icon', kind: 'browse-image', label: 'Icon', formKey: 'iconPath', browseType: 'image' },
  { id: 'wine', kind: 'browse-folder', label: 'Wine Prefix Path', formKey: 'winePath', browseType: 'folder' },
  { id: 'proton', kind: 'browse-folder', label: 'Proton Path', formKey: 'protonPath', browseType: 'folder' },
  { id: 'gameId', kind: 'text', label: 'Game ID', formKey: 'gameId' },
  { id: 'store', kind: 'text', label: 'Store', formKey: 'store' },
  { id: 'args', kind: 'text', label: 'Arguments', formKey: 'arguments' },
  { id: 'cancel', kind: 'action', label: 'Cancel' },
  { id: 'save', kind: 'action', label: 'Save' }
]

const focusIdx = ref(0)
const inputRefs = ref<Record<string, HTMLElement | null>>({})

const isFocused = (id: string) =>
  props.controllerConnected && FIELDS[focusIdx.value]?.id === id

function setRef(id: string, el: unknown) {
  const node = (el as { el?: HTMLElement } | null)?.el ?? (el as HTMLElement | null)
  inputRefs.value[id] = node
}

function moveFocus(dir: 1 | -1) {
  focusIdx.value = Math.max(0, Math.min(FIELDS.length - 1, focusIdx.value + dir))
  scrollToFocused()
}

async function scrollToFocused() {
  await nextTick()
  inputRefs.value[FIELDS[focusIdx.value]!.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

async function activateFocused() {
  const field = FIELDS[focusIdx.value]
  if (!field) return

  if (field.kind === 'action') {
    if (field.id === 'save') handleSave()
    else if (field.id === 'cancel') emit('close')
    else if (field.id === 'lookup') lookupUmu()
    return
  }

  if (field.browseType && field.formKey) {
    await doBrowse(field.browseType, field.formKey)
    return
  }

  await nextTick()
  const el = inputRefs.value[field.id]
  if (el) (el as HTMLInputElement | HTMLTextAreaElement).focus()
}

// ── Controller hints ──────────────────────────────────────────────────────────

const ctrlType = computed(() => props.controllerType ?? 'xbox')
const isPs = computed(() => ctrlType.value === 'ps')
const confirmKey = computed(() => isPs.value ? '✕' : 'A')
const cancelKey = computed(() => isPs.value ? '○' : 'B')
const saveKey = computed(() => isPs.value ? '≡' : '☰')
const confirmColor = computed(() => isPs.value ? '#5ba4fb' : '#62c462')
const cancelColor = computed(() => isPs.value ? '#f55' : '#e85d5d')

const controllerHints = computed(() => [
  { key: '↑↓', label: 'Navigate' },
  { key: confirmKey.value, label: 'Select', color: `${confirmColor.value}dd` },
  { key: cancelKey.value, label: 'Close', color: `${cancelColor.value}dd` },
  { key: saveKey.value, label: 'Save' }
])

const inputClass = (id: string) => [
  'w-full bg-[#0f0f0f] border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors',
  isFocused(id)
    ? 'border-white/60 ring-2 ring-white/20'
    : 'border-white/10 focus:border-white/30'
]

// ── Gamepad handler ───────────────────────────────────────────────────────────

function handleGamepadPress(btn: number) {
  if (!props.isOpen) return
  switch (btn) {
    case BTN.DPAD_UP: case BTN.LSTICK_UP: moveFocus(-1); break
    case BTN.DPAD_DOWN: case BTN.LSTICK_DOWN: moveFocus(1); break
    case BTN.A: activateFocused(); break
    case BTN.B: emit('close'); break
    case BTN.START: handleSave(); break
    case BTN.LB: focusIdx.value = 0; scrollToFocused(); break
    case BTN.RB: focusIdx.value = FIELDS.length - 1; scrollToFocused(); break
  }
}

const { onPress } = useGamepad()
let removeListener: (() => void) | null = null

// ── Actions ───────────────────────────────────────────────────────────────────

async function doBrowse(type: 'file' | 'folder' | 'image', key: keyof GameForm) {
  let result: string | null = null
  if (type === 'image') result = await window.electronAPI.dialog.openImage()
  else if (type === 'folder') result = await window.electronAPI.dialog.openFolder()
  else result = await window.electronAPI.dialog.openFile()
  // Only string fields are valid browse targets — safe because FIELDS enforces this
  if (result !== null) (form as Record<keyof GameForm, string>)[key] = result
}

const isLookingUp = ref(false)

async function lookupUmu() {
  if (!form.name || isLookingUp.value) return
  isLookingUp.value = true
  try {
    const result = await window.electronAPI.umu.search(form.name)
    // result is typed as non-null (always returns a fallback), but guard
    // defensively so future API changes don't silently write undefined to form.
    if (result) {
      form.gameId = result.gameId
      form.store = result.store
    }
  } finally {
    isLookingUp.value = false
  }
}

const isSaving = ref(false)
const saveStatus = ref<'idle' | 'saving'>('idle')

function handleSave() {
  if (isSaving.value) return
  errors.value = {}

  const validation = schema.safeParse(form)
  if (!validation.success) {
    errors.value = Object.fromEntries(
      Object.entries(validation.error.flatten().fieldErrors)
        .map(([k, v]) => [k, v?.[0]])
    ) as FormErrors
    return
  }

  isSaving.value = true
  saveStatus.value = 'saving'
  const { env: extraEnv, args } = parseArgs(form.arguments)
  // Emit save — the parent closes the modal on completion, which triggers the
  // watcher below to reset isSaving. As a safety net, also reset here after a
  // generous timeout so the button never stays permanently locked if the parent
  // fails to close the modal (e.g. future error-recovery flows).
  emit('save', { ...form, arguments: args, extraEnv })
  setTimeout(() => {
    if (isSaving.value) {
      isSaving.value = false
      saveStatus.value = 'idle'
    }
  }, 10_000)
}

// ── Sync form ↔ initialData when modal opens/closes ───────────────────────────

watch(() => props.isOpen, (open) => {
  if (open) {
    focusIdx.value = 0
    removeListener = onPress(handleGamepadPress)

    if (props.initialData) {
      // Reset to defaults first so no stale field from a previous edit leaks in
      Object.assign(form, FORM_DEFAULTS)
      // extraEnv must never land on the reactive form object
      const { extraEnv, arguments: savedArgs, ...rest } = props.initialData
      Object.assign(form, rest)
      // Rebuild the display string: env vars first, then positional args
      form.arguments = serializeArgs(extraEnv ?? {}, savedArgs)
    } else {
      Object.assign(form, FORM_DEFAULTS)
    }
  } else {
    removeListener?.()
    removeListener = null
    isSaving.value = false
    saveStatus.value = 'idle'
    errors.value = {}
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
      <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <!-- Header -->
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

        <!-- Scrollable body -->
        <div class="px-6 pt-6 pb-8 overflow-y-auto scroll-pt-6">
          <form
            class="space-y-5 pt-1"
            @submit.prevent="handleSave"
          >
            <!-- Game Name + UMU lookup -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Game Name *</label>
              <div class="flex gap-2">
                <input
                  :ref="el => setRef('name', el)"
                  v-model="form.name"
                  type="text"
                  :class="[...inputClass('name'), 'flex-1', errors.name ? 'border-red-500/70!' : '']"
                  required
                >
                <UButton
                  :ref="el => setRef('lookup', el)"
                  type="button"
                  icon="i-lucide-search"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :loading="isLookingUp"
                  :disabled="!form.name"
                  :class="['shrink-0 transition-all', isFocused('lookup') ? 'ring-1 ring-white/40 scale-105 bg-white/20' : '']"
                  @click="lookupUmu"
                >
                  Lookup
                </UButton>
              </div>
              <p
                v-if="errors.name"
                class="mt-1 text-xs text-red-400"
              >
                {{ errors.name }}
              </p>
            </div>

            <!-- Description -->
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

            <!-- File / folder fields -->
            <AddGameBrowseField
              :ref="el => setRef('exe', el)"
              label="Executable (.exe)"
              :model-value="form.executable"
              :focused="isFocused('exe')"
              :error="errors.executable"
              required
              @browse="doBrowse('file', 'executable')"
            />
            <AddGameBrowseField
              :ref="el => setRef('hero', el)"
              label="Hero Image"
              :model-value="form.heroPath"
              :focused="isFocused('hero')"
              @browse="doBrowse('image', 'heroPath')"
            />
            <AddGameBrowseField
              :ref="el => setRef('icon', el)"
              label="Icon"
              :model-value="form.iconPath"
              :focused="isFocused('icon')"
              @browse="doBrowse('image', 'iconPath')"
            />
            <AddGameBrowseField
              :ref="el => setRef('wine', el)"
              label="Wine Prefix Path"
              :model-value="form.winePath"
              :focused="isFocused('wine')"
              :error="errors.winePath"
              required
              @browse="doBrowse('folder', 'winePath')"
            />

            <!-- Advanced options grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-2">
              <AddGameBrowseField
                :ref="el => setRef('proton', el)"
                label="Proton Path"
                :model-value="form.protonPath"
                :focused="isFocused('proton')"
                @browse="doBrowse('folder', 'protonPath')"
              />
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Game ID</label>
                <input
                  :ref="el => setRef('gameId', el)"
                  v-model="form.gameId"
                  type="text"
                  :class="[...inputClass('gameId'), errors.gameId ? 'border-red-500/70!' : '']"
                >
                <p
                  v-if="errors.gameId"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ errors.gameId }}
                </p>
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
                <label class="block text-sm font-medium text-gray-300 mb-1">
                  Arguments
                  <span class="text-white/30 font-normal text-xs ml-1">KEY=VALUE → env var · other tokens → launch args</span>
                </label>
                <input
                  :ref="el => setRef('args', el)"
                  v-model="form.arguments"
                  type="text"
                  :class="inputClass('args')"
                  placeholder="MANGOHUD=1 DXVK_HUD=fps,frametimes -dx11"
                >
              </div>
            </div>
          </form>
        </div>

        <!-- Footer -->
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
            :loading="isSaving"
            :disabled="isSaving"
            :class="[isFocused('save') ? 'scale-105 ring-2 ring-primary-400/50' : '']"
            @click="handleSave"
          >
            <template v-if="saveStatus === 'saving'">
              Saving…
            </template>
            <template v-else>
              {{ initialData ? 'Save Changes' : 'Save to Library' }}
            </template>
          </UButton>
        </div>

        <!-- Controller hint bar -->
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
