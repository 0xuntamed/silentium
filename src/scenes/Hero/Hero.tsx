import { useRef } from 'react'
import { gsap, SplitText, useGSAP } from '../../lib/gsap'
import { useScene } from '../../lib/useScene'
import { whenEntered } from '../../lib/session'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { Scene } from '../../components/Scene'
import { brand, hero } from '../../content/copy'

const LETTERS = brand.name.split('')

/**
 * Hero "Wake". Phase 1 skeleton: wordmark, tagline and technical callouts with a scrubbed hand-off.
 * (Phase 4 adds cone-vibrating letters, the SILENTIUM One model and the staff gather.)
 */
export function Hero() {
  const root = useRef<HTMLElement>(null)

  // Entrance, played when the visitor passes the intro gate.
  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return
      const chars = root.current.querySelectorAll('[data-char]')
      const split = new SplitText('[data-tagline]', { type: 'lines', mask: 'lines' })
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
