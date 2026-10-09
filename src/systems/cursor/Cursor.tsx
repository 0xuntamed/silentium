import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { cursorSignal } from './cursorSignal'

/**
 * A breathing ring that trails the pointer — the visible "sound source". Transform/opacity only.
 * The outer element is moved by JS; the inner ring breathes on the 1 Hz heartbeat via CSS.
 */
export function Cursor() {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const el = outer.current!
    const ring = inner.current!
    let x = -100
    let y = -100
    let scale = 1
    let alpha = 0

    const tick = (_t: number, dtMs: number) => {
      const k = 1 - Math.exp(-14 * (dtMs / 1000))
      x += (cursorSignal.x - x) * k
      y += (cursorSignal.y - y) * k
      const want = 1 + Math.min(cursorSignal.speed / 1400, 0.9)
      scale += (want - scale) * k
      alpha += ((cursorSignal.active ? 1 : 0) - alpha) * k
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      ring.style.transform = `scale(${scale})`
      el.style.opacity = String(alpha)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div
      ref={outer}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden [@media(pointer:fine)]:block"
      style={{ opacity: 0, willChange: 'transform' }}
    >
      <div ref={inner} className="-ml-[22px] -mt-[22px] h-11 w-11">
        <div className="breathe h-full w-full rounded-full border border-brass/60" />
      </div>
    </div>
  )
}
