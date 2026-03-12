<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

// ── Launch Options ────────────────────────────────────────────────────────────
// Only the options that are commonly toggled and can't be expressed as simple
// KEY=VALUE tokens — everything else belongs in the Arguments field.

type SyncMode = 'none' | 'esync' | 'fsync'

interface LaunchOptions {
  /** Mutually exclusive: esync (WINEESYNC=1) | fsync (WINEFSYNC=1) | none */
  sync: SyncMode
  /** MANGOHUD=1 */
  mangoHud: boolean
  /** GAMEMODE=1 */
  gameMode: boolean
  /** DXVK_ASYNC=1 */
  dxvkAsync: boolean
  /** WINE_FULLSCREEN_FSR=1 */
  fsr: boolean
  /** WINE_FULLSCREEN_FSR_STRENGTH 0–4 */
  fsrStrength: number
}

const LAUNCH_OPTION_DEFAULTS: LaunchOptions = {
  sync: 'none',
  mangoHud: false,
  gameMode: false,
  dxvkAsync: false,
  fsr: false,
  fsrStrength: 2
}

const launchOpts = reactive<LaunchOptions>({ ...LAUNCH_OPTION_DEFAULTS })

const FSR_LEVELS = [
  { value: 0, label: 'Ultra Quality' },
  { value: 1, label: 'Quality' },
  { value: 2, label: 'Balanced' },
  { value: 3, label: 'Performance' },
  { value: 4, label: 'Ultra Performance' }
] as const

/** Env var keys owned by the checkboxes — stripped from the manual args to avoid duplication. */
const MANAGED_KEYS = ['WINEESYNC', 'WINEFSYNC', 'MANGOHUD', 'GAMEMODE', 'DXVK_ASYNC', 'WINE_FULLSCREEN_FSR', 'WINE_FULLSCREEN_FSR_STRENGTH']

function launchOptsToEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  if (launchOpts.sync === 'esync') env['WINEESYNC'] = '1'
  if (launchOpts.sync === 'fsync') env['WINEFSYNC'] = '1'
  if (launchOpts.mangoHud) env['MANGOHUD'] = '1'
  if (launchOpts.gameMode) env['GAMEMODE'] = '1'
  if (launchOpts.dxvkAsync) env['DXVK_ASYNC'] = '1'
  if (launchOpts.fsr) {
    env['WINE_FULLSCREEN_FSR'] = '1'
    env['WINE_FULLSCREEN_FSR_STRENGTH'] = String(launchOpts.fsrStrength)
  }
  return env
}

function envToLaunchOpts(env: Record<string, string>): Record<string, string> {
  const leftover: Record<string, string> = {}
  Object.assign(launchOpts, { ...LAUNCH_OPTION_DEFAULTS })

  for (const [k, v] of Object.entries(env)) {
    switch (k) {
      case 'WINEESYNC': if (v === '1') launchOpts.sync = 'esync'; break
      case 'WINEFSYNC': if (v === '1') launchOpts.sync = 'fsync'; break
      case 'MANGOHUD': launchOpts.mangoHud = v === '1'; break
      case 'GAMEMODE': launchOpts.gameMode = v === '1'; break
      case 'DXVK_ASYNC': launchOpts.dxvkAsync = v === '1'; break
      case 'WINE_FULLSCREEN_FSR': launchOpts.fsr = v === '1'; break
      case 'WINE_FULLSCREEN_FSR_STRENGTH': launchOpts.fsrStrength = Math.min(4, Math.max(0, Number(v))); break
      default: leftover[k] = v
    }
  }
  return leftover
}

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

type FieldKind
  = | 'text' | 'textarea'
    | 'browse-file' | 'browse-image' | 'browse-folder'
    | 'action'
    | 'sync-btn' // one of the None/Esync/Fsync buttons
    | 'toggle' // a boolean launch-option checkbox
    | 'fsr-btn' // one of the FSR quality level buttons

interface FieldDef {
  id: string
  kind: FieldKind
  label: string
  formKey?: keyof GameForm
  browseType?: 'file' | 'folder' | 'image'
  /** For sync-btn: which SyncMode value this button sets */
  syncValue?: SyncMode
  /** For toggle: which launchOpts key to flip */
  optKey?: keyof LaunchOptions
  /** For fsr-btn: the FSR strength value */
  fsrValue?: number
}

// Static fields — Launch Options entries are computed (FSR sub-buttons appear
// only when fsr is enabled) so we use a computed list instead of a plain array.
const BASE_FIELDS: FieldDef[] = [
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
  // ── Launch Options ──────────────────────────────────────────────────────────
  { id: 'sync-none', kind: 'sync-btn', label: 'Sync: None', syncValue: 'none' },
  { id: 'sync-esync', kind: 'sync-btn', label: 'Sync: Esync', syncValue: 'esync' },
  { id: 'sync-fsync', kind: 'sync-btn', label: 'Sync: Fsync', syncValue: 'fsync' },
  { id: 'opt-mangoHud', kind: 'toggle', label: 'MangoHud', optKey: 'mangoHud' },
  { id: 'opt-gameMode', kind: 'toggle', label: 'GameMode', optKey: 'gameMode' },
  { id: 'opt-dxvkAsync', kind: 'toggle', label: 'DXVK Async', optKey: 'dxvkAsync' },
  { id: 'opt-fsr', kind: 'toggle', label: 'AMD FSR', optKey: 'fsr' },
  // FSR quality buttons — only injected when fsr is on (see FIELDS computed)
  { id: 'fsr-0', kind: 'fsr-btn', label: 'FSR Ultra Quality', fsrValue: 0 },
  { id: 'fsr-1', kind: 'fsr-btn', label: 'FSR Quality', fsrValue: 1 },
  { id: 'fsr-2', kind: 'fsr-btn', label: 'FSR Balanced', fsrValue: 2 },
  { id: 'fsr-3', kind: 'fsr-btn', label: 'FSR Performance', fsrValue: 3 },
  { id: 'fsr-4', kind: 'fsr-btn', label: 'FSR Ultra Performance', fsrValue: 4 },
  // ── Footer ──────────────────────────────────────────────────────────────────
  { id: 'cancel', kind: 'action', label: 'Cancel' },
  { id: 'save', kind: 'action', label: 'Save' }
]

const FSR_FIELD_IDS = new Set(['fsr-0', 'fsr-1', 'fsr-2', 'fsr-3', 'fsr-4'])

// FIELDS is dynamic: FSR quality buttons are only focusable when FSR is enabled
const FIELDS = computed<FieldDef[]>(() =>
  BASE_FIELDS.filter(f => !FSR_FIELD_IDS.has(f.id) || launchOpts.fsr)
)

const focusIdx = ref(0)
const inputRefs = ref<Record<string, HTMLElement | null>>({})

const isFocused = (id: string) =>
  props.controllerConnected && FIELDS.value[focusIdx.value]?.id === id

function setRef(id: string, el: unknown) {
  // Try to extract the real DOM node: components expose { el } via defineExpose,
  // native elements are already HTMLElement. Only store actual DOM Nodes —
  // if the result is a Vue component proxy (no .el, not a Node), store null
  // to avoid calling non-existent methods like .contains() on the proxy.
  const candidate = (el as { el?: HTMLElement } | null)?.el ?? (el as HTMLElement | null)
  inputRefs.value[id] = (candidate instanceof Node ? candidate : null) as HTMLElement | null
}

function moveFocus(dir: 1 | -1) {
  focusIdx.value = Math.max(0, Math.min(FIELDS.value.length - 1, focusIdx.value + dir))
  scrollToFocused()
}

const scrollBody = ref<HTMLElement | null>(null)

const FOOTER_IDS = new Set(['cancel', 'save'])

async function scrollToFocused() {
  await nextTick()
  const field = FIELDS.value[focusIdx.value]
  if (!field) return

  // Footer buttons live outside the scroll container — scroll body to bottom
  if (FOOTER_IDS.has(field.id)) {
    scrollBody.value?.scrollTo({ top: scrollBody.value.scrollHeight, behavior: 'smooth' })
    return
  }

  inputRefs.value[field.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

async function activateFocused() {
  const field = FIELDS.value[focusIdx.value]
  if (!field) return

  if (field.kind === 'action') {
    if (field.id === 'save') handleSave()
    else if (field.id === 'cancel') emit('close')
    else if (field.id === 'lookup') lookupUmu()
    return
  }

  if (field.kind === 'sync-btn' && field.syncValue !== undefined) {
    launchOpts.sync = field.syncValue
    return
  }

  if (field.kind === 'toggle' && field.optKey) {
    ;(launchOpts as Record<string, unknown>)[field.optKey]
      = !(launchOpts as Record<string, unknown>)[field.optKey]
    // When FSR is toggled off, clamp focusIdx so we don't land on a hidden FSR button
    await nextTick()
    focusIdx.value = Math.min(focusIdx.value, FIELDS.value.length - 1)
    return
  }

  if (field.kind === 'fsr-btn' && field.fsrValue !== undefined) {
    launchOpts.fsrStrength = field.fsrValue
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
    case BTN.RB: focusIdx.value = FIELDS.value.length - 1; scrollToFocused(); break
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
  if (result !== null) (form as Record<keyof GameForm, string>)[key] = result
}

const isLookingUp = ref(false)

async function lookupUmu() {
  if (!form.name || isLookingUp.value) return
  isLookingUp.value = true
  try {
    const result = await window.electronAPI.umu.search(form.name)
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

  // Parse manual args — remove keys managed by checkboxes to avoid duplication
  const { env: manualEnv, args } = parseArgs(form.arguments)
  for (const k of MANAGED_KEYS) delete manualEnv[k]

  // Checkbox env vars take precedence over anything typed manually
  const extraEnv = { ...manualEnv, ...launchOptsToEnv() }

  emit('save', { ...form, arguments: args, extraEnv: Object.keys(extraEnv).length ? extraEnv : undefined })
  setTimeout(() => {
    if (isSaving.value) { isSaving.value = false; saveStatus.value = 'idle' }
  }, 10_000)
}

// ── Keyboard & mouse-focus sync ──────────────────────────────────────────────

/** Called when a native focus/click lands on a field element so focusIdx stays
 *  in sync with mouse/keyboard navigation — prevents the controller virtual
 *  cursor from getting out of step when the user switches input methods.  */
function syncFocusFromElement(el: EventTarget | null) {
  if (!el) return
  for (const [id, ref] of Object.entries(inputRefs.value)) {
    if (!ref) continue
    // ref.contains() only exists on real DOM Nodes.
    // Some entries (UButton) may resolve to a Vue component proxy that does
    // not have .contains — guard with instanceof Node before calling it.
    const isNode = ref instanceof Node
    if (ref === el || (isNode && ref.contains(el as Node))) {
      const idx = FIELDS.value.findIndex(f => f.id === id)
      if (idx !== -1) focusIdx.value = idx
      return
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.isOpen) return
  if (e.key === 'Escape') { e.preventDefault(); emit('close'); return }
  // Enter only triggers save when focus is NOT inside a text input/textarea/button
  // so the user can still type normally in all fields.
  if (e.key === 'Enter' && e.target instanceof Element) {
    const tag = e.target.tagName.toLowerCase()
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'button') {
      e.preventDefault()
      handleSave()
    }
  }
}

// ── Sync form ↔ initialData when modal opens/closes ───────────────────────────

watch(() => props.isOpen, (open) => {
  if (open) {
    focusIdx.value = 0
    removeListener = onPress(handleGamepadPress)
    window.addEventListener('keydown', handleKeydown)

    if (props.initialData) {
      Object.assign(form, FORM_DEFAULTS)
      const { extraEnv, arguments: savedArgs, ...rest } = props.initialData
      Object.assign(form, rest)
      const leftoverEnv = extraEnv ? envToLaunchOpts(extraEnv) : {}
      form.arguments = serializeArgs(leftoverEnv, savedArgs)
    } else {
      Object.assign(form, FORM_DEFAULTS)
      Object.assign(launchOpts, LAUNCH_OPTION_DEFAULTS)
    }
  } else {
    removeListener?.()
    removeListener = null
    isSaving.value = false
    saveStatus.value = 'idle'
    errors.value = {}
    window.removeEventListener('keydown', handleKeydown)
  }
})

onMounted(() => { if (props.isOpen) window.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { removeListener?.(); window.removeEventListener('keydown', handleKeydown) })
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
        @focusin="syncFocusFromElement($event.target)"
      >
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
        <div
          ref="scrollBody"
          class="px-6 pt-6 pb-6 overflow-y-auto scroll-pt-6"
        >
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

            <!-- Advanced grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
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
                  <span class="text-white/30 font-normal text-xs ml-1">KEY=VALUE env · tokens → args</span>
                </label>
                <input
                  :ref="el => setRef('args', el)"
                  v-model="form.arguments"
                  type="text"
                  :class="inputClass('args')"
                  placeholder="DXVK_HUD=fps -dx11"
                >
              </div>
            </div>

            <!-- ── Launch Options ──────────────────────────────────────────── -->
            <div class="pt-4 border-t border-white/10 space-y-5">
              <h3 class="text-xs font-semibold text-white/50 uppercase tracking-widest">
                Launch Options
              </h3>

              <!-- Sync (mutually exclusive) -->
              <div>
                <p class="text-xs text-white/35 uppercase tracking-wider mb-2.5">
                  Sync Method
                </p>
                <div class="flex gap-2">
                  <!-- None -->
                  <button
                    :ref="el => setRef('sync-none', el)"
                    type="button"
                    :class="[
                      'flex-1 py-2 text-sm rounded-xl border transition-all',
                      launchOpts.sync === 'none'
                        ? 'bg-white/10 border-white/30 text-white font-medium'
                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/60',
                      isFocused('sync-none') ? 'ring-2 ring-white/40' : ''
                    ]"
                    @click="launchOpts.sync = 'none'"
                  >
                    None
                  </button>
                  <!-- Esync -->
                  <button
                    :ref="el => setRef('sync-esync', el)"
                    type="button"
                    :class="[
                      'flex-1 py-2 text-sm rounded-xl border transition-all',
                      launchOpts.sync === 'esync'
                        ? 'bg-primary-500/20 border-primary-500/60 text-primary-300 font-medium'
                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/60',
                      isFocused('sync-esync') ? 'ring-2 ring-primary-400/60' : ''
                    ]"
                    @click="launchOpts.sync = 'esync'"
                  >
                    Esync
                    <span class="block text-[10px] opacity-60 font-normal">WINEESYNC=1</span>
                  </button>
                  <!-- Fsync -->
                  <button
                    :ref="el => setRef('sync-fsync', el)"
                    type="button"
                    :class="[
                      'flex-1 py-2 text-sm rounded-xl border transition-all',
                      launchOpts.sync === 'fsync'
                        ? 'bg-primary-500/20 border-primary-500/60 text-primary-300 font-medium'
                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/60',
                      isFocused('sync-fsync') ? 'ring-2 ring-primary-400/60' : ''
                    ]"
                    @click="launchOpts.sync = 'fsync'"
                  >
                    Fsync
                    <span class="block text-[10px] opacity-60 font-normal">WINEFSYNC=1</span>
                  </button>
                </div>
              </div>

              <!-- Toggles -->
              <div>
                <p class="text-xs text-white/35 uppercase tracking-wider mb-2.5">
                  Options
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <label
                    v-for="opt in [
                      { key: 'mangoHud', label: 'MangoHud', hint: 'MANGOHUD=1' },
                      { key: 'gameMode', label: 'GameMode', hint: 'GAMEMODE=1' },
                      { key: 'dxvkAsync', label: 'DXVK Async', hint: 'DXVK_ASYNC=1' },
                      { key: 'fsr', label: 'AMD FSR', hint: 'WINE_FULLSCREEN_FSR=1' }
                    ]"
                    :key="opt.key"
                    :ref="el => setRef(`opt-${opt.key}`, el)"
                    :title="opt.hint"
                    :class="[
                      'flex items-center gap-2.5 cursor-pointer group select-none rounded-lg px-2 py-1 transition-all',
                      isFocused(`opt-${opt.key}`) ? 'ring-2 ring-white/30 bg-white/5' : ''
                    ]"
                  >
                    <UCheckbox
                      :model-value="(launchOpts as any)[opt.key]"
                      color="primary"
                      @update:model-value="(v) => (launchOpts as any)[opt.key] = v === true"
                    />
                    <span class="text-sm text-white/70 group-hover:text-white transition-colors leading-tight">
                      {{ opt.label }}
                      <span class="block text-[10px] text-white/30 font-mono">{{ opt.hint }}</span>
                    </span>
                  </label>
                </div>
              </div>

              <!-- FSR quality level — only visible when FSR is on -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div
                  v-if="launchOpts.fsr"
                  class="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-white/50">FSR Quality Level</span>
                    <span class="text-[10px] font-mono text-white/30">
                      WINE_FULLSCREEN_FSR_STRENGTH={{ launchOpts.fsrStrength }}
                    </span>
                  </div>
                  <div class="flex gap-1.5">
                    <button
                      v-for="level in FSR_LEVELS"
                      :key="level.value"
                      :ref="el => setRef(`fsr-${level.value}`, el)"
                      type="button"
                      :class="[
                        'flex-1 py-1.5 text-xs rounded-lg border transition-all',
                        launchOpts.fsrStrength === level.value
                          ? 'bg-primary-500/20 border-primary-500/60 text-primary-300 font-medium'
                          : 'bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/60',
                        isFocused(`fsr-${level.value}`) ? 'ring-2 ring-primary-400/60' : ''
                      ]"
                      @click="launchOpts.fsrStrength = level.value"
                    >
                      {{ level.label }}
                    </button>
                  </div>
                </div>
              </Transition>
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
