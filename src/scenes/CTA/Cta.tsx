import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { addItem } from '../../lib/cart'
import { cta } from '../../content/copy'
import { MagneticButton } from '../../components/MagneticButton'
import { Footer } from '../../components/Footer'
import { Link } from '../../components/Link'
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
        <p data-rise className="label mt-8 flex flex-wrap gap-x-8 gap-y-2">
          <Link to="/one" className="transition-colors hover:text-brass">Discover One →</Link>
          <Link to="/buds" className="transition-colors hover:text-brass">Discover Buds →</Link>
          <Link to="/compare" className="transition-colors hover:text-brass">Compare →</Link>
        </p>
      </div>

      <Footer rise />
    </section>
  )
}
