import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/useReducedMotion'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** How far (0..1) the button follows the pointer. */
  strength?: number
  /** Pull radius in px around the button's centre. */
  radius?: number
}

/**
 * A button that leans toward the pointer when it gets close. Transform only; the label moves a little
 * more than the shell for depth. Does nothing on touch screens or with reduced motion.
 */
export function MagneticButton({ children, strength = 0.28, radius = 120, className = '', ...rest }: Props) {
  const el = useRef<HTMLButtonElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const b = el.current
    const l = label.current
    if (!b || !l || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return
    const bx = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3.out' })
    const by = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3.out' })
    const lx = gsap.quickTo(l, 'x', { duration: 0.6, ease: 'power3.out' })
    const ly = gsap.quickTo(l, 'y', { duration: 0.6, ease: 'power3.out' })
    const onMove = (e: PointerEvent) => {
      const r = b.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const reach = radius + Math.max(r.width, r.height) / 2
      const d = Math.hypot(dx, dy)
      if (d < reach) {
        const k = strength * (1 - d / reach) * 2
        bx(dx * k)
        by(dy * k)
        lx(dx * k * 0.5)
        ly(dy * k * 0.5)
      } else {
        bx(0)
        by(0)
        lx(0)
        ly(0)
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [strength, radius])

  return (
    <button ref={el} className={className} {...rest}>
      <span ref={label} className="inline-flex items-center gap-4">
        {children}
      </span>
    </button>
  )
}
