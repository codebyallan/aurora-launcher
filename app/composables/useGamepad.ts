import { ref, readonly } from 'vue'

export const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
  HOME: 16,
  LSTICK_UP: 100, LSTICK_DOWN: 101, LSTICK_LEFT: 102, LSTICK_RIGHT: 103
} as const
export type BtnIndex = typeof BTN[keyof typeof BTN]
export type ControllerType = 'xbox' | 'ps' | 'generic'
const AXIS_DEADZONE = 0.35
const REPEAT_INITIAL_MS = 380
const REPEAT_INTERVAL_MS = 120
const NAV_BUTTONS = new Set([
  BTN.DPAD_LEFT, BTN.DPAD_RIGHT, BTN.DPAD_UP, BTN.DPAD_DOWN,
  BTN.LSTICK_LEFT, BTN.LSTICK_RIGHT, BTN.LSTICK_UP, BTN.LSTICK_DOWN
])
export function detectControllerType(id: string): ControllerType {
  const s = id.toLowerCase()
  if (s.includes('xbox') || s.includes('045e') || s.includes('xinput')) return 'xbox'
  if (
    s.includes('dualsense') || s.includes('dualshock') || s.includes('054c')
    || s.includes('wireless controller') || s.includes('ps3') || s.includes('ps4') || s.includes('ps5')
  ) return 'ps'
  return 'generic'
}

export function getButtonColor(btn: BtnIndex, type: ControllerType): string {
  if (type === 'ps') {
    const colors: Partial<Record<BtnIndex, string>> = {
      [BTN.A]: '#5ba4fb', [BTN.B]: '#f55', [BTN.X]: '#e86bca', [BTN.Y]: '#6de26d'
    }
    return colors[btn] ?? '#fff'
  }
  const colors: Partial<Record<BtnIndex, string>> = {
    [BTN.A]: '#62c462', [BTN.B]: '#e85d5d', [BTN.X]: '#5ba4fb', [BTN.Y]: '#f0c040'
  }
  return colors[btn] ?? '#fff'
}
interface ButtonState {
  pressed: boolean
  heldSince: number | null
  lastRepeat: number
}
type PressHandler = (btn: BtnIndex) => void

const isConnected = ref(false)
const controllerType = ref<ControllerType>('xbox')
const controllerName = ref('')
const handlers = new Set<PressHandler>()
const btnState = new Map<number, ButtonState>()
let rafId: number | null = null
let initialized = false

function getState(idx: number): ButtonState {
  if (!btnState.has(idx)) btnState.set(idx, { pressed: false, heldSince: null, lastRepeat: 0 })
  return btnState.get(idx)!
}
function firePress(btn: BtnIndex) {
  handlers.forEach(h => h(btn))
}
function handlePhysical(index: number, isPressed: boolean, now: number) {
  const state = getState(index)
  const btn = index as BtnIndex
  if (isPressed && !state.pressed) {
    state.pressed = true
    state.heldSince = now
    state.lastRepeat = now
    firePress(btn)
  } else if (isPressed && state.pressed && state.heldSince !== null) {
    if (NAV_BUTTONS.has(btn)) {
      const held = now - state.heldSince
      if (held > REPEAT_INITIAL_MS && now - state.lastRepeat > REPEAT_INTERVAL_MS) {
        state.lastRepeat = now
        firePress(btn)
      }
    }
  } else if (!isPressed && state.pressed) {
    state.pressed = false
    state.heldSince = null
  }
}
function handleAxis(virtualBtn: BtnIndex, isActive: boolean, now: number) {
  const state = getState(virtualBtn)
  if (isActive && !state.pressed) {
    state.pressed = true
    state.heldSince = now
    state.lastRepeat = now
    firePress(virtualBtn)
  } else if (isActive && state.pressed && state.heldSince !== null) {
    const held = now - state.heldSince
    if (held > REPEAT_INITIAL_MS && now - state.lastRepeat > REPEAT_INTERVAL_MS) {
      state.lastRepeat = now
      firePress(virtualBtn)
    }
  } else if (!isActive && state.pressed) {
    state.pressed = false
    state.heldSince = null
  }
}
function poll() {
  rafId = requestAnimationFrame(poll)
  if (!document.hasFocus()) return
  const gamepads = navigator.getGamepads()
  let gp: Gamepad | null = null
  for (const g of gamepads) {
    if (g && g.connected) { gp = g; break }
  }
  if (!gp) {
    if (isConnected.value) { isConnected.value = false; btnState.clear() }
    return
  }
  if (!isConnected.value) {
    isConnected.value = true
    controllerType.value = detectControllerType(gp.id)
    controllerName.value = gp.id
  }
  const now = performance.now()
  gp.buttons.forEach((btn, index) => handlePhysical(index, btn.pressed || btn.value > 0.5, now))
  const lx = gp.axes[0] ?? 0
  const ly = gp.axes[1] ?? 0
  handleAxis(BTN.LSTICK_LEFT, lx < -AXIS_DEADZONE, now)
  handleAxis(BTN.LSTICK_RIGHT, lx > AXIS_DEADZONE, now)
  handleAxis(BTN.LSTICK_UP, ly < -AXIS_DEADZONE, now)
  handleAxis(BTN.LSTICK_DOWN, ly > AXIS_DEADZONE, now)
}
function onConnect(e: GamepadEvent) {
  isConnected.value = true
  controllerType.value = detectControllerType(e.gamepad.id)
  controllerName.value = e.gamepad.id
}
function onDisconnect() { isConnected.value = false; btnState.clear() }
function initSingleton() {
  if (initialized) return
  initialized = true
  window.addEventListener('gamepadconnected', onConnect)
  window.addEventListener('gamepaddisconnected', onDisconnect)
  rafId = requestAnimationFrame(poll)
}

export function useGamepad() {
  initSingleton()
  function onPress(handler: PressHandler) {
    handlers.add(handler)
    return () => handlers.delete(handler)
  }
  return {
    isConnected: readonly(isConnected),
    controllerType: readonly(controllerType),
    controllerName: readonly(controllerName),
    onPress
  }
}
