import { useRef } from 'react'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { specs } from '../../content/copy'

/** Specs — "The numbers". Phase 5 adds the dot-matrix battery and rolling odometers. */
export function Specs() {
  const root = useRef<HTMLElement>(null)

  useScene(root, {
    id: 'specs',
    build: (tl, { q }) => {
      tl.fromTo('[data-copy]', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0)
      tl.fromTo(q('[data-cell]'), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.18, stagger: 0.09, ease: 'power2.out' }, 0.12)
      tl.fromTo(q('[data-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 0.2, stagger: 0.09 }, 0.12)
      tl.to('[data-content]', { opacity: 0, duration: 0.12, ease: 'power1.in' }, 0.9)
    },
  })

  return (
    <Scene ref={root} id="specs" index={specs.index} label={specs.label} labelledBy="specs-title">
      <div data-content className="relative z-10 flex h-full flex-col justify-between pt-[calc(var(--gutter)*0.4)]">
        <h2 id="specs-title" data-copy className="display-m max-w-[11em]">
          {specs.title[0]} <em>{specs.title[1]}</em>
        </h2>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 pb-[calc(var(--gutter)*0.6)] md:grid-cols-3 md:gap-x-10 md:gap-y-8">
          {specs.items.map((s) => (
            <li key={s.note} data-cell>
              <div data-rule className="mb-3 h-px origin-left bg-bone/25" aria-hidden />
              <p className="flex items-baseline gap-2 font-display leading-none tracking-tight">
                <span className="text-[clamp(2.75rem,6.4vw,6.75rem)]">{s.big}</span>
                {s.unit && <span className="text-[clamp(1.25rem,2.4vw,2.25rem)] italic text-ash">{s.unit}</span>}
              </p>
              <p className="label mt-3">{s.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </Scene>
  )
}
