import { useEffect, useRef, useState } from 'react'
import { gsap, SplitText, useGSAP } from '../../lib/gsap'
import { lockScroll, unlockScroll } from '../../lib/lenis'
import { markEntered } from '../../lib/session'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { intro } from '../../content/copy'
import { SoundToggle } from '../../components/SoundToggle'

/**
 * The opening: total silence. One pulsing dot, one line. The first input "turns sound on" and the page blooms.
 * Phase 1 is the DOM-only gate; the WebGL note burst and cone-vibrating wordmark join in Phase 4.
 */
export function Silence({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLSpanElement>(null)
  const ring = useRef<HTMLSpanElement>(null)
  const line = useRef<HTMLParagraphElement>(null)
  const hint = useRef<HTMLButtonElement>(null)
  const started = useRef(false)
  const split = useRef<SplitText | null>(null)
  const [reduced] = useState(prefersReducedMotion)

  useEffect(() => {
    lockScroll()
    hint.current?.focus({ preventScroll: true })
  }, [])

  // Entrance: silence -> dot -> line -> hint.
  useGSAP(
    () => {
      if (reduced) {
        gsap.set([dot.current, line.current, hint.current], { opacity: 1 })
        return
      }
      split.current = new SplitText(line.current, { type: 'chars', mask: 'chars', aria: 'none' })
      const tl = gsap.timeline()
      tl.fromTo(dot.current, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'hush' }, 0.4)
        .set(line.current, { opacity: 1 }, 1.2)
        .from(split.current.chars, { yPercent: 110, duration: 1.2, ease: 'hush', stagger: 0.03 }, 1.2)
        .fromTo(hint.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'hush' }, 2.4)
      return () => split.current?.revert()
    },
    { scope: root },
  )

  const enter = () => {
    if (started.current) return
    started.current = true
    const done = () => {
      unlockScroll()
      onDone()
    }
    if (reduced) {
      markEntered()
      done()
      return
    }
    gsap
      .timeline({ onComplete: done })
      .to(dot.current, { scale: 0.55, duration: 0.3, ease: 'power2.in' })
      .to(dot.current, { scale: 1, duration: 0.5, ease: 'hush' })
      .fromTo(ring.current, { scale: 0.001, opacity: 1 }, { scale: 1, duration: 1.4, ease: 'hush' }, 0.3)
      .to(ring.current, { opacity: 0, duration: 0.5, ease: 'power1.out' }, 1.2)
      .to(split.current?.chars ?? line.current, { yPercent: -110, duration: 0.8, ease: 'exhale', stagger: 0.02 }, 0.3)
      .to(hint.current, { opacity: 0, duration: 0.4 }, 0.2)
      .to(root.current, { opacity: 0, duration: 1.1, ease: 'exhale' }, 0.55)
      .call(markEntered, [], 0.7)
      .set(root.current, { pointerEvents: 'none' }, 0.3)
  }

  // Any first input turns the sound on.
  useEffect(() => {
    const blocked = (e: Event) => (e.target as Element | null)?.closest?.('[data-no-enter]')
    const onPointer = (e: Event) => {
      if (!blocked(e)) enter()
    }
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'ArrowDown', 'PageDown', 'End'].includes(e.key) && !blocked(e)) {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('wheel', onPointer, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('wheel', onPointer)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={intro.enter}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-basalt"
    >
      <div className="absolute right-[var(--gutter)] top-4">
        <SoundToggle />
      </div>

      <span
        ref={ring}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] block rounded-full border border-brass/70"
        style={{ width: '220vmax', height: '220vmax', translate: '-50% -50%', opacity: 0, transform: 'scale(0.001)' }}
      />

      <div className="relative flex flex-col items-center gap-10">
        <span ref={dot} aria-hidden className="block" style={{ opacity: 0 }}>
          <span className="beat block h-3 w-3 rounded-full bg-brass" />
        </span>
        <p ref={line} className="display-m text-center italic" style={{ opacity: 0 }}>
          {intro.line}
        </p>
      </div>

      <button
        ref={hint}
        type="button"
        onClick={enter}
        className="label absolute bottom-[calc(var(--gutter)*1.2)] left-1/2 -translate-x-1/2 px-4 py-3 transition-colors hover:text-bone"
        style={{ opacity: 0 }}
      >
        {intro.hint}
      </button>
    </div>
  )
}
