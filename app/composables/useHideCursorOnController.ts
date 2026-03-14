import { onMounted, onUnmounted } from 'vue'

const MOUSE_HIDE_DELAY_MS = 3000
const CONTROLLER_HIDE_DELAY_MS = 800

// A single CSS class injected once into the document head.
// Using a class + !important is the only reliable way to hide the cursor across
// all elements without clobbering their own cursor styles — inline styles on
// documentElement/body can override descendant 'cursor: pointer' declarations,
// which in Electron's sandboxed renderer causes click events to stop firing.
const STYLE_ID = 'aurora-hide-cursor'

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = '.aurora-cursor-hidden, .aurora-cursor-hidden * { cursor: none !important; }'
  document.head.appendChild(style)
}

/** Hides the mouse cursor when a controller is in use; restores it on mouse move. */
export function useHideCursorOnController() {
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let rafId: number | null = null
  let isHidden = false

  function hideCursor() {
    document.documentElement.classList.add('aurora-cursor-hidden')
    isHidden = true
  }

  function showCursor() {
    if (isHidden) {
      document.documentElement.classList.remove('aurora-cursor-hidden')
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
    injectStyle()
    window.addEventListener('mousemove', showCursor)
    rafId = requestAnimationFrame(loop)
    hideTimer = setTimeout(hideCursor, MOUSE_HIDE_DELAY_MS)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', showCursor)
    if (rafId !== null) cancelAnimationFrame(rafId)
    if (hideTimer) clearTimeout(hideTimer)
    document.documentElement.classList.remove('aurora-cursor-hidden')
  })
}
