import { useRef } from 'react'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { spatial } from '../../content/copy'

const RINGS = [0.28, 0.46, 0.64, 0.82, 1]

/**
 * Spatial — "Sound has a place." Phase 1 skeleton: scrubbed rings and an orbiting source dot in HTML.
 * Phase 4 swaps in the contour head, cursor-driven source and optional HRTF audio.
 */
export function Spatial() {
  const root = useRef<HTMLElement>(null)

  useScene(root, {
    id: 'spatial',
    build: (tl, { q }) => {
      tl.fromTo(q('[data-ring]'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.16, stagger: 0.04, ease: 'power2.out' }, 0)
      tl.fromTo('[data-copy]', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0.04)
      tl.fromTo('[data-orbit]', { rotation: -40 }, { rotation: 320, duration: 0.7 }, 0.15)
      tl.fromTo('[data-readout]', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.2)
      tl.to('[data-stage]', { scale: 0.7, opacity: 0, duration: 0.14, ease: 'power1.in' }, 0.86)
      tl.to('[data-copy]', { opacity: 0, duration: 0.1 }, 0.88)
    },
  })

  return (
    <Scene ref={root} id="spatial" index={spatial.index} label={spatial.label} labelledBy="spatial-title">
      <div data-stage className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
        <div className="relative aspect-square w-[min(78vw,78svh)]">
          {RINGS.map((r) => (
            <div
              key={r}
              data-ring
              className="absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-bone/15"
              style={{ width: `${r * 100}%` }}
            />
          ))}
          <div className="absolute inset-0" data-orbit>
            <span className="absolute left-1/2 top-[3%] block h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brass shadow-[0_0_24px_4px_rgba(198,161,91,0.45)]" />
          </div>
          <span className="absolute left-1/2 top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bone/60" />
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between pt-[calc(var(--gutter)*0.4)]">
        <div data-copy>
          <h2 id="spatial-title" className="display-l max-w-[8em]">
            {spatial.title[0]} <em>{spatial.title[1]}</em>
          </h2>
          <p className="body-l mt-6 max-w-[26em]">{spatial.body}</p>
        </div>

        <div className="flex flex-col gap-6 pb-[calc(var(--gutter)*0.6)] md:flex-row md:items-end md:justify-between">
          <p className="label label-bone">{spatial.hint}</p>
          <dl data-readout className="grid grid-cols-4 gap-x-6 gap-y-1 sm:gap-x-10">
            {spatial.readout.map((r) => (
              <div key={r.k}>
                <dt className="label">{r.k}</dt>
                <dd className="mt-1 font-display text-2xl leading-none tabular-nums sm:text-3xl">{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Scene>
  )
}
