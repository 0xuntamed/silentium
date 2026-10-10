import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '../../lib/gsap'
import { ConeLetters } from '../../lib/coneLetters'
import { scrollSignal } from '../../lib/scroll'
import { isSoundOn } from '../../lib/audio'
import { cursorSignal } from '../../systems/cursor/cursorSignal'
import { useScene } from '../../lib/useScene'
import { whenEntered } from '../../lib/session'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { Scene } from '../../components/Scene'
import { brand, hero } from '../../content/copy'

const LETTERS = brand.name.split('')

/**
 * Hero "Wake": a wordmark whose letters ring like speaker cones, the tagline, technical callouts and a
 * scrubbed hand-off. SILENTIUM One itself is drawn behind the type by the shared WebGL stage.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null)

  // Entrance, played when the visitor passes the intro gate.
  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return
      const chars = root.current.querySelectorAll('[data-char]')
      const split = new SplitText('[data-tagline]', { type: 'lines', mask: 'lines', aria: 'none' })
      gsap.set(chars, { yPercent: 108 })
      gsap.set(split.lines, { yPercent: 105 })
      gsap.set('[data-fade-in]', { opacity: 0 })

      const stop = whenEntered(() => {
        gsap
          .timeline({ delay: 0.5 })
          .to(chars, { yPercent: 0, duration: 1.5, ease: 'hush', stagger: 0.045 }, 0)
          .to(split.lines, { yPercent: 0, duration: 1.2, ease: 'hush', stagger: 0.12 }, 0.7)
          .to('[data-fade-in]', { opacity: 1, duration: 1.4, ease: 'hush', stagger: 0.1 }, 1.1)
      })
      return () => {
        stop()
        split.revert()
      }
    },
    { scope: root },
  )

  // Hero type made of sound: every letter is a speaker cone. The intro bloom sets them ringing in a
  // wave out from the dot; after that the cursor, scroll speed and the 1 Hz heartbeat keep exciting them.
  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-char]'))
    const cone = new ConeLetters(chars.length)
    const set = chars.map((c) => ({
      y: gsap.quickSetter(c, 'y', 'px'),
      sy: gsap.quickSetter(c, 'scaleY'),
      sk: gsap.quickSetter(c, 'skewX', 'deg'),
    }))
    const centres = chars.map(() => ({ x: 0, y: 0 }))
    const measure = () => {
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect()
        centres[i].x = r.left + r.width / 2
        centres[i].y = r.top + r.height / 2
      })
    }
    measure()
    let frame = 0
    let lastBeat = -1
    let t = 0
    const pending: { at: number; i: number; k: number }[] = []

    const stopEntered = whenEntered(() => {
      measure()
      // A shockwave from the dot: letters ring in order of their distance from the centre of the screen.
      chars.forEach((_, i) => {
        const d = Math.abs(centres[i].x - window.innerWidth / 2) / window.innerWidth
        pending.push({ at: t + 0.75 + d * 1.1, i, k: 1.1 })
      })
    })

    const hero = () => ScrollTrigger.getById('scene-hero')
    const tick = (_time: number, dtMs: number) => {
      const dt = Math.min(dtMs / 1000, 0.05)
      t += dt
      if (frame++ % 12 === 0) measure()
      const p = hero()?.progress ?? 0
      const live = p < 0.4

      for (let k = pending.length - 1; k >= 0; k--) {
        if (t >= pending[k].at) {
          cone.kick(pending[k].i, pending[k].k)
          pending.splice(k, 1)
        }
      }
      if (live) {
        // Cursor: moving through a letter plucks it.
        if (cursorSignal.active && cursorSignal.pointerType !== 'touch' && cursorSignal.speed > 120) {
          const s = Math.min(1, cursorSignal.speed / 1800)
          for (let i = 0; i < chars.length; i++) {
            const d = Math.hypot(cursorSignal.x - centres[i].x, cursorSignal.y - centres[i].y)
            if (d < 300) cone.kick(i, s * (1 - d / 300) * 0.5 * dt * 60 * (i % 2 ? 1 : -1))
          }
        }
        // Scroll speed shakes the whole word.
        if (scrollSignal.speed > 0.06) {
          for (let i = 0; i < chars.length; i++) cone.kick(i, scrollSignal.speed * 0.45 * dt * 60 * (Math.sin(t * 40 + i * 2.1) > 0 ? 1 : -1))
        }
        // The bass: a gentle thump on every beat (stronger when sound is on).
        const beat = Math.floor(t)
        if (beat !== lastBeat && t > 3) {
          lastBeat = beat
          for (let i = 0; i < chars.length; i++) cone.kick(i, isSoundOn() ? 0.26 : 0.09)
        }
      }

      cone.step(dt)
      for (let i = 0; i < chars.length; i++) {
        const x = cone.pos[i]
        set[i].y(x * 15)
        set[i].sy(1 + x * 0.055)
        set[i].sk(x * 3.2)
      }
    }
    gsap.ticker.add(tick)
    window.addEventListener('resize', measure)
    return () => {
      stopEntered()
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', measure)
      chars.forEach((c) => gsap.set(c, { y: 0, scaleY: 1, skewX: 0 }))
    }
  }, [])

  useScene(root, {
    id: 'hero',
    build: (tl, { q }) => {
      const chars = q('[data-mask]')
      const mid = (chars.length - 1) / 2
      // Wordmark exhales apart and recedes.
      tl.to(
        chars,
        {
          x: (i: number) => (i - mid) * 1.2 + 'vw',
          opacity: 0.1,
          duration: 0.42,
          ease: 'power2.inOut',
        },
        0.1,
      )
      tl.to('[data-wordmark]', { scale: 0.88, duration: 0.42, ease: 'power2.inOut' }, 0.1)
      tl.to('[data-tagline-wrap]', { opacity: 0, y: -36, duration: 0.25 }, 0.12)
      // Technical callouts type in.
      tl.fromTo(q('[data-callout]'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.14, stagger: 0.07 }, 0.42)
      tl.fromTo('[data-sub]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.2 }, 0.38)
      // Leave.
      tl.to('[data-hero-content]', { opacity: 0, duration: 0.18, ease: 'power1.in' }, 0.82)
    },
  })

  return (
    <Scene ref={root} id="hero" index="01" label={hero.product} labelledBy="hero-title">
      <div data-hero-content className="relative flex h-full flex-col justify-end">
        <div data-fade-in className="absolute right-0 top-0 hidden text-right sm:block">
          <p className="label label-bone">{hero.product}</p>
          <p className="label mt-1">{hero.kind}</p>
        </div>

        <div data-tagline-wrap className="mb-[clamp(1rem,3vw,2.5rem)]">
          <p data-tagline className="display-m max-w-[11em]">
            {brand.tagline[0]} <em>{brand.tagline[1]}</em>
          </p>
        </div>

        <h1 id="hero-title" data-wordmark aria-label={brand.name} className="wordmark whitespace-nowrap text-bone">
          {LETTERS.map((c, i) => (
            <span key={i} data-mask aria-hidden className="char-mask">
              <span data-char className="inline-block will-change-transform">
                {c}
              </span>
            </span>
          ))}
        </h1>

        <div className="mt-[clamp(1.25rem,3vw,2.5rem)] grid grid-cols-1 items-end gap-6 border-t hairline pt-5 md:grid-cols-[1fr_auto]">
          <p data-sub className="body-l max-w-[28em] text-[0.95rem]">
            {hero.sub}
          </p>
          <ul className="flex gap-8 sm:gap-12">
            {hero.callouts.map((c) => (
              <li key={c.k} data-callout>
                <p className="label">{c.k}</p>
                <p className="mt-1 font-display text-3xl leading-none tracking-tight">{c.v}</p>
              </li>
            ))}
          </ul>
        </div>

        <p data-fade-in className="label absolute bottom-[-0.2rem] left-1/2 hidden -translate-x-1/2 md:block">
          {hero.cue}
        </p>
      </div>
    </Scene>
  )
}
