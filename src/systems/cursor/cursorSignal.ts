import { damp } from '../../lib/math'

/**
 * The pointer as a *sound source*. Raw client px; the notes engine converts to world space.
 * Read it (don't subscribe) from the shared ticker.
 */
export const cursorSignal = {
  x: -9999,
  y: -9999,
  /** Smoothed speed, px/s. */
  speed: 0,
  /** True once a mouse/pen has moved over the page and until it leaves. */
  active: false,
  pointerType: 'mouse' as string,
}

let lastX = 0
let lastY = 0
let lastT = 0

function onMove(e: PointerEvent) {
  const now = performance.now()
  const dt = Math.max((now - lastT) / 1000, 1 / 240)
  if (lastT !== 0 && cursorSignal.active) {
    const inst = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt
    cursorSignal.speed += (inst - cursorSignal.speed) * damp(18, dt)
  }
  lastX = e.clientX
  lastY = e.clientY
  lastT = now
  cursorSignal.x = e.clientX
  cursorSignal.y = e.clientY
  cursorSignal.active = true
  cursorSignal.pointerType = e.pointerType
}

const onLeave = () => {
  cursorSignal.active = false
}

/** Decay the speed when the pointer is still. Call once per frame. */
export function tickCursor(dt: number) {
  cursorSignal.speed *= Math.exp(-5 * dt)
  if (cursorSignal.speed < 1) cursorSignal.speed = 0
}

export function startCursorTracking(): () => void {
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  window.addEventListener('blur', onLeave)
  return () => {
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('blur', onLeave)
  }
}
