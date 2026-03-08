import { onMounted, onUnmounted } from 'vue'

const HIDE_DELAY_MS = 3000   // hide cursor 3s after last mouse move
const CONTROLLER_HIDE_MS = 800  // hide quickly when gamepad button pressed

export function useHideCursorOnController() {
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let isHidden = false

  function showCursor() {
    if (isHidden) {
      document.documentElement.style.cursor = ''
      document.body.style.cursor = ''
      isHidden = false
    }
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(hideCursor, HIDE_DELAY_MS)
  }

  function hideCursor() {
    document.documentElement.style.cursor = 'none'
    document.body.style.cursor = 'none'
    isHidden = true
  }

  function onMouseMove() {
    showCursor()
  }

  // When any gamepad button is pressed, hide cursor fast
  function pollGamepad() {
    const gamepads = navigator.getGamepads()
    for (const gp of gamepads) {
      if (!gp) continue
      for (const btn of gp.buttons) {
        if (btn.pressed) {
          if (!isHidden) {
            if (hideTimer) clearTimeout(hideTimer)
            hideTimer = setTimeout(hideCursor, CONTROLLER_HIDE_MS)
          }
          return
        }
      }
    }
  }

  let rafId: number
  function loop() {
    pollGamepad()
    rafId = requestAnimationFrame(loop)
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    rafId = requestAnimationFrame(loop)
    // Start hidden if no mouse detected yet
    hideTimer = setTimeout(hideCursor, HIDE_DELAY_MS)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    cancelAnimationFrame(rafId)
    if (hideTimer) clearTimeout(hideTimer)
    // Restore cursor on unmount
    document.documentElement.style.cursor = ''
    document.body.style.cursor = ''
  })
}
