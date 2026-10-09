import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { prefersReducedMotion } from './useReducedMotion'
import { updateScrollSignal } from './scroll'

let lenis: Lenis | null = null

export const getLenis = () => lenis

/**
 * Lenis ↔ ScrollTrigger ↔ gsap.ticker: one clock drives everything.
 * With reduced motion we keep native scrolling (no smoothing) but still publish scroll signals.
 */
export function startSmoothScroll(): () => void {
  const smooth = !prefersReducedMotion()
  let last = performance.now()

  if (smooth) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, syncTouch: false, autoRaf: false })
    lenis.on('scroll', ScrollTrigger.update)
  }

  const tick = (time: number) => {
    lenis?.raf(time * 1000)
    const now = performance.now()
    updateScrollSignal(lenis ? lenis.scroll : window.scrollY, (now - last) / 1000)
    last = now
  }
  gsap.ticker.add(tick)

  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

export function lockScroll() {
  lenis?.stop()
  document.documentElement.classList.add('is-locked')
}

export function unlockScroll() {
  document.documentElement.classList.remove('is-locked')
  lenis?.start()
  ScrollTrigger.refresh()
}

export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, { immediate, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
  else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
}

/** Scroll to the start of a registered scene (pinned scenes live inside pin-spacers, so ask the trigger). */
export function scrollToScene(id: string) {
  const st = ScrollTrigger.getById(`scene-${id}`)
  if (st) scrollToY(st.start)
}
