import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from '../../lib/gsap'
import { useReducedMotion } from '../../lib/useReducedMotion'

const DRIFT = 26 // px/s while idle

/**
 * A draggable, endlessly drifting rail. The track moves with `translate3d` only; the set of cards is
 * rendered twice for a seamless loop (the copy is aria-hidden and inert). Drag with a mouse or finger,
 * or use the arrow keys. It pauses on hover/focus, and with reduced motion it is a plain scroll strip.
 */
export function Rail({ label, render }: { label: string; render: (duplicate: boolean) => ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const wrapEl = wrap.current
    const trackEl = track.current
    if (!wrapEl || !trackEl || reduced) return

    let x = 0
    let v = 0
    let W = 1
    let dragging = false
    let hover = false
    let focused = false
    let visible = false
    let lastX = 0
    let lastT = 0

    const measure = () => {
      W = Math.max(1, trackEl.scrollWidth / 2)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(trackEl)
    measure()
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' })
    io.observe(wrapEl)

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragging = true
      v = 0
      lastX = e.clientX
      lastT = performance.now()
      wrapEl.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const dx = e.clientX - lastX
      x += dx
      const dt = Math.max((now - lastT) / 1000, 1 / 240)
      v += (dx / dt - v) * 0.4
      lastX = e.clientX
      lastT = now
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      if (wrapEl.hasPointerCapture(e.pointerId)) wrapEl.releasePointerCapture(e.pointerId)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') v += 900
      else if (e.key === 'ArrowRight') v -= 900
      else return
      e.preventDefault()
    }
    const enter = () => (hover = true)
    const leave = () => (hover = false)
    const focusIn = () => (focused = true)
    const focusOut = () => (focused = false)

    wrapEl.addEventListener('pointerdown', onDown)
    wrapEl.addEventListener('pointermove', onMove)
    wrapEl.addEventListener('pointerup', onUp)
    wrapEl.addEventListener('pointercancel', onUp)
    wrapEl.addEventListener('keydown', onKey)
    wrapEl.addEventListener('pointerenter', enter)
    wrapEl.addEventListener('pointerleave', leave)
    wrapEl.addEventListener('focusin', focusIn)
    wrapEl.addEventListener('focusout', focusOut)

    const tick = (_t: number, dtMs: number) => {
      if (!visible) return
      const dt = Math.min(dtMs / 1000, 0.05)
      if (!dragging) {
        if (Math.abs(v) > 4) {
          x += v * dt
          v *= Math.exp(-3.2 * dt)
        } else {
          v = 0
          if (!hover && !focused) x -= DRIFT * dt
        }
      }
      // Wrap into (−W, 0] so the second copy always fills the gap.
      x = ((x % W) - W) % W
      trackEl.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      ro.disconnect()
      io.disconnect()
      wrapEl.removeEventListener('pointerdown', onDown)
      wrapEl.removeEventListener('pointermove', onMove)
      wrapEl.removeEventListener('pointerup', onUp)
      wrapEl.removeEventListener('pointercancel', onUp)
      wrapEl.removeEventListener('keydown', onKey)
      wrapEl.removeEventListener('pointerenter', enter)
      wrapEl.removeEventListener('pointerleave', leave)
      wrapEl.removeEventListener('focusin', focusIn)
      wrapEl.removeEventListener('focusout', focusOut)
      trackEl.style.transform = ''
    }
  }, [reduced])

  return (
    <div
      ref={wrap}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="-mx-[var(--gutter)] cursor-grab select-none overflow-hidden px-[var(--gutter)] active:cursor-grabbing motion-reduce:cursor-auto motion-reduce:overflow-x-auto motion-reduce:snap-x"
      style={{ touchAction: 'pan-y' }}
    >
      <div ref={track} className="flex w-max will-change-transform">
        {render(false)}
        {!reduced && (
          <div aria-hidden inert className="flex">
            {render(true)}
          </div>
        )}
      </div>
    </div>
  )
}
