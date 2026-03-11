import { onMounted, onUnmounted } from 'vue'

const MOUSE_HIDE_DELAY_MS = 3000
const CONTROLLER_HIDE_DELAY_MS = 800

/** Hides the mouse cursor when a controller is in use; restores it on mouse move. */
export function useHideCursorOnController() {
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let rafId: number | null = null // fixed: explicitly nullable so it's never undefined
  let isHidden = false

  function hideCursor() {
    document.documentElement.style.cursor = 'none'
    document.body.style.cursor = 'none'
    isHidden = true
  }

  function showCursor() {
    if (isHidden) {
      document.documentElement.style.cursor = ''
      document.body.style.cursor = ''
      isHidden = false
    }
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(hideCursor, MOUSE_HIDE_DELAY_MS)
  }

  function pollGamepad() {
    for (const gp of navigator.getGamepads()) {
      if (!gp) continue
      for (const btn of gp.buttons) {
        if (btn.pressed) {
          if (!isHidden) {
            if (hideTimer) clearTimeout(hideTimer)
            hideTimer = setTimeout(hideCursor, CONTROLLER_HIDE_DELAY_MS)
          }
          return
        }
      }
    }
  }

  function loop() {
    pollGamepad()
    rafId = requestAnimationFrame(loop)
  }

  onMounted(() => {
    window.addEventListener('mousemove', showCursor)
    rafId = requestAnimationFrame(loop)
    hideTimer = setTimeout(hideCursor, MOUSE_HIDE_DELAY_MS)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', showCursor)
    if (rafId !== null) cancelAnimationFrame(rafId)
    if (hideTimer) clearTimeout(hideTimer)
    document.documentElement.style.cursor = ''
    document.body.style.cursor = ''
  })
}
