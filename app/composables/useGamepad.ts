import { ref, readonly, onUnmounted } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// Standard Gamepad API button indices (W3C standard mapping)
// ─────────────────────────────────────────────────────────────────────────────
export const BTN = {
  A: 0,         // Xbox: A   |  PS: Cross     (✕)
  B: 1,         // Xbox: B   |  PS: Circle    (○)
  X: 2,         // Xbox: X   |  PS: Square    (□)
  Y: 3,         // Xbox: Y   |  PS: Triangle  (△)
  LB: 4,        // Xbox: LB  |  PS: L1
  RB: 5,        // Xbox: RB  |  PS: R1
  LT: 6,        // Xbox: LT  |  PS: L2
  RT: 7,        // Xbox: RT  |  PS: R2
  SELECT: 8,    // Xbox: View / Back  |  PS: Create
  START: 9,     // Xbox: Menu / Start |  PS: Options (☰)
  L3: 10,       // Left stick click
  R3: 11,       // Right stick click
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  HOME: 16,     // Xbox: Guide  |  PS: PS button

  // Virtual indices for analog stick directions
  LSTICK_UP: 100,
  LSTICK_DOWN: 101,
  LSTICK_LEFT: 102,
  LSTICK_RIGHT: 103,
} as const

export type BtnIndex = typeof BTN[keyof typeof BTN]
export type ControllerType = 'xbox' | 'ps' | 'generic'

// ─────────────────────────────────────────────────────────────────────────────
// Timing constants (matches real console feel)
// ─────────────────────────────────────────────────────────────────────────────
const AXIS_DEADZONE = 0.35
const REPEAT_INITIAL_MS = 380   // hold-before-repeat (like Xbox)
const REPEAT_INTERVAL_MS = 120  // inter-repeat speed

const NAV_BUTTONS = new Set([
  BTN.DPAD_LEFT, BTN.DPAD_RIGHT, BTN.DPAD_UP, BTN.DPAD_DOWN,
  BTN.LSTICK_LEFT, BTN.LSTICK_RIGHT, BTN.LSTICK_UP, BTN.LSTICK_DOWN,
])

// ─────────────────────────────────────────────────────────────────────────────
// Controller type detection from gamepad.id string
// ─────────────────────────────────────────────────────────────────────────────
export function detectControllerType(id: string): ControllerType {
  const s = id.toLowerCase()
  if (
    s.includes('xbox') ||
    s.includes('045e') ||   // Microsoft vendor ID
    s.includes('xinput')
  ) return 'xbox'
  if (
    s.includes('dualsense') ||
    s.includes('dualshock') ||
    s.includes('054c') ||   // Sony vendor ID
    s.includes('wireless controller') ||
    s.includes('ps3') ||
    s.includes('ps4') ||
    s.includes('ps5')
  ) return 'ps'
  return 'generic'
}

// ─────────────────────────────────────────────────────────────────────────────
// Button label helpers
// ─────────────────────────────────────────────────────────────────────────────
export function getButtonLabel(btn: BtnIndex, type: ControllerType): string {
  const labels: Record<ControllerType, Partial<Record<BtnIndex, string>>> = {
    xbox: {
      [BTN.A]: 'A',
      [BTN.B]: 'B',
      [BTN.X]: 'X',
      [BTN.Y]: 'Y',
      [BTN.LB]: 'LB',
      [BTN.RB]: 'RB',
      [BTN.LT]: 'LT',
      [BTN.RT]: 'RT',
      [BTN.SELECT]: 'View',
      [BTN.START]: 'Menu',
    },
    ps: {
      [BTN.A]: '✕',
      [BTN.B]: '○',
      [BTN.X]: '□',
      [BTN.Y]: '△',
      [BTN.LB]: 'L1',
      [BTN.RB]: 'R1',
      [BTN.LT]: 'L2',
      [BTN.RT]: 'R2',
      [BTN.SELECT]: 'Create',
      [BTN.START]: 'Options',
    },
    generic: {
      [BTN.A]: 'A',
      [BTN.B]: 'B',
      [BTN.X]: 'X',
      [BTN.Y]: 'Y',
      [BTN.LB]: 'LB',
      [BTN.RB]: 'RB',
      [BTN.LT]: 'LT',
      [BTN.RT]: 'RT',
      [BTN.SELECT]: 'Select',
      [BTN.START]: 'Start',
    },
  }
  return labels[type][btn] ?? String(btn)
}

// Colors for button glyphs
export function getButtonColor(btn: BtnIndex, type: ControllerType): string {
  if (type === 'ps') {
    const colors: Partial<Record<BtnIndex, string>> = {
      [BTN.A]: '#5ba4fb',  // Cross - blue
      [BTN.B]: '#f55',     // Circle - red
      [BTN.X]: '#e86bca',  // Square - pink
      [BTN.Y]: '#6de26d',  // Triangle - green
    }
    return colors[btn] ?? '#fff'
  }
  // Xbox colors
  const colors: Partial<Record<BtnIndex, string>> = {
    [BTN.A]: '#62c462',   // A - green
    [BTN.B]: '#e85d5d',   // B - red
    [BTN.X]: '#5ba4fb',   // X - blue
    [BTN.Y]: '#f0c040',   // Y - yellow
  }
  return colors[btn] ?? '#fff'
}

// ─────────────────────────────────────────────────────────────────────────────
// The composable
// ─────────────────────────────────────────────────────────────────────────────
interface ButtonState {
  pressed: boolean
  heldSince: number | null
  lastRepeat: number
}

type PressHandler = (btn: BtnIndex) => void

export function useGamepad() {
  const isConnected = ref(false)
  const controllerType = ref<ControllerType>('xbox')
  const controllerName = ref('')

  const handlers = new Set<PressHandler>()
  const btnState = new Map<number, ButtonState>()
  let rafId: number | null = null

  function getState(idx: number): ButtonState {
    if (!btnState.has(idx)) {
      btnState.set(idx, { pressed: false, heldSince: null, lastRepeat: 0 })
    }
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

  function handleAxis(
    virtualBtn: BtnIndex,
    isActive: boolean,
    now: number,
  ) {
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

    // Do not fire any input when the window is not focused
    // (e.g. a game is running fullscreen in the foreground)
    if (!document.hasFocus()) return

    const gamepads = navigator.getGamepads()
    let gp: Gamepad | null = null
    for (const g of gamepads) {
      if (g && g.connected) { gp = g; break }
    }

    if (!gp) {
      if (isConnected.value) {
        isConnected.value = false
        btnState.clear()
      }
      return
    }

    if (!isConnected.value) {
      isConnected.value = true
      controllerType.value = detectControllerType(gp.id)
      controllerName.value = gp.id
    }

    const now = performance.now()

    // Physical buttons
    gp.buttons.forEach((btn, index) => {
      handlePhysical(index, btn.pressed || btn.value > 0.5, now)
    })

    // Left stick → virtual D-pad presses
    const lx = gp.axes[0] ?? 0
    const ly = gp.axes[1] ?? 0
    handleAxis(BTN.LSTICK_LEFT, lx < -AXIS_DEADZONE, now)
    handleAxis(BTN.LSTICK_RIGHT, lx > AXIS_DEADZONE, now)
    handleAxis(BTN.LSTICK_UP, ly < -AXIS_DEADZONE, now)
    handleAxis(BTN.LSTICK_DOWN, ly > AXIS_DEADZONE, now)
  }

  // Connect / disconnect events
  const onConnect = (e: GamepadEvent) => {
    isConnected.value = true
    controllerType.value = detectControllerType(e.gamepad.id)
    controllerName.value = e.gamepad.id
  }

  const onDisconnect = () => {
    isConnected.value = false
    btnState.clear()
  }

  window.addEventListener('gamepadconnected', onConnect)
  window.addEventListener('gamepaddisconnected', onDisconnect)

  // Start polling immediately
  rafId = requestAnimationFrame(poll)

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('gamepadconnected', onConnect)
    window.removeEventListener('gamepaddisconnected', onDisconnect)
  })

  function onPress(handler: PressHandler) {
    handlers.add(handler)
    return () => handlers.delete(handler)
  }

  return {
    isConnected: readonly(isConnected),
    controllerType: readonly(controllerType),
    controllerName: readonly(controllerName),
    onPress,
  }
}