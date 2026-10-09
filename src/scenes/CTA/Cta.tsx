import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { addItem } from '../../lib/cart'
import { scrollToScene, scrollToY } from '../../lib/lenis'
import { cta, footer, nav } from '../../content/copy'
import { MagneticButton } from '../../components/MagneticButton'
import { Newsletter } from '../../components/Newsletter'
import { SoundToggle } from '../../components/SoundToggle'
import { FINISHES } from '../Materials/constants'
import { getFinish } from '../Materials/live'

/**
 * CTA + footer. The notes system pulls the final staff into an earbud cable that draws across the
 * screen into the Buds outline (see the conductor's `cta` cues). Buttons lean toward the pointer; both
 * add to the (UI-only) cart in the finish chosen in the Craft scene.
 */
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

  const finish = () => FINISHES[getFinish()]?.label ?? FINISHES[0].label

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
          <MagneticButton
            type="button"
            onClick={() => addItem('one', finish())}
            className="label rounded-full bg-brass px-7 py-4 text-basalt transition-colors hover:bg-bone"
          >
            {cta.primary}
            <span className="font-normal opacity-70">{cta.price}</span>
          </MagneticButton>
          <MagneticButton
            type="button"
            onClick={() => addItem('buds', finish())}
            className="label label-bone rounded-full border border-bone/25 px-7 py-4 transition-colors hover:border-brass hover:text-brass"
          >
            {cta.secondary}
            <span className="font-normal text-ash">{cta.secondaryPrice}</span>
          </MagneticButton>
        </div>
      </div>

      <footer className="mt-28 grid gap-12 border-t hairline pb-8 pt-12 md:grid-cols-12">
        <div data-rise className="md:col-span-6">
          <Newsletter />
        </div>
        <nav data-rise aria-label="Footer" className="md:col-span-3 md:col-start-8">
          <p className="label label-bone mb-4">Explore</p>
          <ul className="space-y-2.5">
            {nav.links.map((l) => (
              <li key={l.scene}>
                <button type="button" onClick={() => scrollToScene(l.scene)} className="text-ash transition-colors hover:text-bone">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div data-rise className="flex flex-col items-start gap-3 md:col-span-2 md:items-end">
          <SoundToggle />
          <button type="button" onClick={() => scrollToY(0)} className="label transition-colors hover:text-bone">
            {footer.top} ↑
          </button>
        </div>

        <div data-rise className="flex flex-col gap-3 border-t hairline pt-6 md:col-span-12 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-2xl tracking-tight">{footer.line}</p>
          <p className="label text-fog">{footer.fine}</p>
        </div>
      </footer>
    </section>
  )
}
