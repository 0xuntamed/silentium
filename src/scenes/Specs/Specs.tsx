import { useRef } from 'react'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { specs } from '../../content/copy'
import { DotMatrix } from './DotMatrix'
import { Odometer } from './Odometer'

/**
 * Specs — "The numbers". Numerals roll like odometers as the hairline grid draws in, and a dot-matrix
 * battery charges up to "60h". All of it is a pure function of scroll progress (scrubbed).
 */
export function Specs() {
  const root = useRef<HTMLElement>(null)
  // The dot-matrix canvas reads this; the timeline writes it.
  const charge = useRef(0)

  useScene(root, {
    id: 'specs',
    build: (tl, { q }) => {
      charge.current = 0
      tl.fromTo('[data-copy]', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0)
      tl.fromTo('[data-matrix]', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.06)
      tl.to(charge, { current: 1, duration: 0.5, ease: 'none' }, 0.1)
      tl.fromTo(q('[data-cell]'), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.14, stagger: 0.07, ease: 'power2.out' }, 0.14)
      tl.fromTo(q('[data-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 0.18, stagger: 0.07 }, 0.14)
      // Roll every digit from 0 to its value.
      q('[data-odo-strip]').forEach((strip, i) => {
        const d = Number(strip.dataset.digit)
        tl.fromTo(strip, { yPercent: 0 }, { yPercent: -d * 10, duration: 0.3, ease: 'power3.out' }, 0.26 + (i % 6) * 0.03)
      })
      tl.fromTo(q('[data-unit]'), { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.04 }, 0.4)
      tl.to('[data-content]', { opacity: 0, duration: 0.1, ease: 'power1.in' }, 0.9)
    },
  })

  return (
    <Scene ref={root} id="specs" index={specs.index} label={specs.label} labelledBy="specs-title">
      <div data-content className="relative z-10 flex h-full flex-col justify-between pt-[calc(var(--gutter)*0.4)]">
        <div className="grid gap-8 md:grid-cols-12 md:items-start">
          <h2 id="specs-title" data-copy className="display-m max-w-[11em] md:col-span-7">
            {specs.title[0]} <em>{specs.title[1]}</em>
          </h2>
          <div data-matrix className="md:col-span-5 md:justify-self-end">
            <DotMatrix value={charge} />
            <p className="label mt-3 md:text-right">{specs.matrixLabel}</p>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 pb-[calc(var(--gutter)*0.6)] md:grid-cols-3 md:gap-x-10 md:gap-y-8">
          {specs.items.map((s) => (
            <li key={s.note} data-cell>
              <div data-rule className="mb-3 h-px origin-left bg-bone/25" aria-hidden />
              <p className="flex items-baseline gap-2 font-display leading-none tracking-tight">
                <span className="text-[clamp(2.75rem,6.4vw,6.75rem)]">
                  <Odometer value={s.big} />
                </span>
                {s.unit && (
                  <span data-unit className="text-[clamp(1.25rem,2.4vw,2.25rem)] italic text-ash">
                    {s.unit}
                  </span>
                )}
              </p>
              <p className="label mt-3">{s.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </Scene>
  )
}
