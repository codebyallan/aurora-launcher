import { onMounted, onUnmounted } from 'vue'

const HIDE_DELAY_MS = 3000
const CONTROLLER_HIDE_MS = 800
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
    window.addEventListener('mousemove', showCursor)
    rafId = requestAnimationFrame(loop)
    hideTimer = setTimeout(hideCursor, HIDE_DELAY_MS)
  })
  onUnmounted(() => {
    window.removeEventListener('mousemove', showCursor)
    cancelAnimationFrame(rafId)
    if (hideTimer) clearTimeout(hideTimer)
    document.documentElement.style.cursor = ''
    document.body.style.cursor = ''
  })
}
