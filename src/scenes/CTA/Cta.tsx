import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { cta, footer } from '../../content/copy'

/** CTA + footer. Phase 5 adds the cable-to-Buds draw, magnetic buttons, newsletter and cart drawer. */
export function Cta() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el || prefersReducedMotion()) return
      ScrollTrigger.create({ id: 'scene-cta', trigger: el, start: 'top top', end: 'bottom bottom' })
      gsap.from(el.querySelectorAll('[data-rise]'), {
        opacity: 0,
        y: 60,
        duration: 1.3,
        ease: 'hush',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 55%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="cta" aria-labelledby="cta-title" className="relative flex min-h-svh flex-col justify-between px-[var(--gutter)] pt-[clamp(5rem,12vw,10rem)]">
      <div>
        <div data-rise className="mb-10 flex items-center gap-3">
          <span className="label label-brass">{cta.index}</span>
          <span className="h-px w-8 bg-bone/20" aria-hidden />
        </div>
        <h2 id="cta-title" data-rise className="display-xl">
          {cta.title[0]}
          <br />
          <em>{cta.title[1]}</em>
        </h2>
        <div data-rise className="mt-12 flex flex-wrap items-center gap-4">
          <a
            href="#cta"
            className="label flex items-center gap-4 rounded-full bg-brass px-7 py-4 text-basalt transition-colors hover:bg-bone"
          >
            {cta.primary}
            <span className="font-normal opacity-70">{cta.price}</span>
          </a>
          <a href="#cta" className="label label-bone rounded-full border border-bone/25 px-7 py-4 transition-colors hover:border-brass hover:text-brass">
            {cta.secondary}
          </a>
        </div>
      </div>

      <footer className="mt-24 flex flex-col gap-3 border-t hairline py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-2xl tracking-tight">{footer.line}</p>
        <p className="label text-fog">{footer.fine}</p>
      </footer>
    </section>
  )
}
