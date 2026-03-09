<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BTN, getButtonColor, type BtnIndex, type ControllerType } from '../composables/useGamepad'

interface HintDef {
  btn: BtnIndex
  label: string
}
const props = defineProps<{
  hints: HintDef[]
  controllerType: ControllerType
  visible: boolean
}>()
const justConnected = ref(false)
let flashTimeout: ReturnType<typeof setTimeout> | null = null
watch(() => props.visible, (v, prev) => {
  if (v && !prev) {
    justConnected.value = true
    if (flashTimeout) clearTimeout(flashTimeout)
    flashTimeout = setTimeout(() => { justConnected.value = false }, 2000)
  }
})
const GLYPHS: Record<ControllerType, Partial<Record<BtnIndex, string>>> = {
  xbox: {
    [BTN.A]: 'A', [BTN.B]: 'B', [BTN.X]: 'X', [BTN.Y]: 'Y',
    [BTN.LB]: 'LB', [BTN.RB]: 'RB',
    [BTN.START]: '☰', [BTN.SELECT]: '⧠', [BTN.HOME]: '⊛'
  },
  ps: {
    [BTN.A]: '✕', [BTN.B]: '○', [BTN.X]: '□', [BTN.Y]: '△',
    [BTN.LB]: 'L1', [BTN.RB]: 'R1',
    [BTN.START]: '≡', [BTN.SELECT]: '⊟', [BTN.HOME]: 'PS'
  },
  generic: {
    [BTN.A]: 'A', [BTN.B]: 'B', [BTN.X]: 'X', [BTN.Y]: 'Y',
    [BTN.LB]: 'LB', [BTN.RB]: 'RB',
    [BTN.START]: 'St', [BTN.SELECT]: 'Se', [BTN.HOME]: '⌂'
  }
}
type HintKind = 'dpad' | 'face' | 'shoulder' | 'system'
function kind(btn: BtnIndex): HintKind {
  if ([BTN.DPAD_LEFT, BTN.DPAD_RIGHT, BTN.DPAD_UP, BTN.DPAD_DOWN].includes(btn as number)) return 'dpad'
  if ([BTN.A, BTN.B, BTN.X, BTN.Y].includes(btn as number)) return 'face'
  if ([BTN.LB, BTN.RB].includes(btn as number)) return 'shoulder'
  return 'system'
}
function glyph(btn: BtnIndex) { return GLYPHS[props.controllerType][btn] ?? '·' }
function color(btn: BtnIndex) { return getButtonColor(btn, props.controllerType) }
const processed = computed(() =>
  props.hints.map(h => ({ ...h, kind: kind(h.btn), glyph: glyph(h.btn), color: color(h.btn) }))
)
</script>

<template>
  <Transition
    enter-active-class="transition duration-700 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-500 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="visible && hints.length"
      class="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pointer-events-none select-none"
    >
      <Transition
        enter-active-class="transition duration-500 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-500 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="justConnected"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 w-72 h-6 pointer-events-none"
          style="background: radial-gradient(ellipse at center, rgba(255,255,255,0.09) 0%, transparent 70%); filter: blur(6px);"
        />
      </Transition>
      <div
        :class="['flex items-center gap-4 transition-all duration-1000', justConnected ? 'opacity-100' : 'opacity-75']"
      >
        <template
          v-for="(h, i) in processed"
          :key="h.btn"
        >
          <ControllerHintItem
            :glyph="h.glyph"
            :label="h.label"
            :color="h.color"
            :kind="h.kind"
          />
          <span
            v-if="i < processed.length - 1"
            class="text-[8px] text-white/20 leading-none"
          >·</span>
        </template>
      </div>
    </div>
  </Transition>
</template>
