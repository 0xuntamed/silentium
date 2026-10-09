import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { useScene } from '../../lib/useScene'
import { useSoundOn } from '../../lib/audio'
import { Scene } from '../../components/Scene'
import { spatial } from '../../content/copy'
import { spatialLive } from './live'
import { formatDb } from './spatialMath'

const RINGS = [0.28, 0.46, 0.64, 0.82, 1]

/**
 * Spatial — "Sound has a place." The picture (a contour head, the source, rings that point at it) is
 * drawn by SpatialPass in the shared canvas. This is the DOM half: copy, a live readout of azimuth,
 * distance and L/R level, and the audio hint. With sound on, a real HRTF panner follows the source.
 */
export function Spatial() {
  const root = useRef<HTMLElement>(null)
  const soundOn = useSoundOn()
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  useScene(root, {
    id: 'spatial',
    build: (tl) => {
      tl.fromTo('[data-copy]', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0.04)
      tl.fromTo('[data-readout]', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.18)
      tl.fromTo('[data-hint]', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.14)
      tl.to('[data-copy]', { opacity: 0, duration: 0.1 }, 0.84)
      tl.to('[data-readout], [data-hint]', { opacity: 0, duration: 0.08 }, 0.84)
    },
  })

  // The readout is live: text only, read straight from the Stage's state.
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const az = el.querySelector<HTMLElement>('[data-az]')
    const dist = el.querySelector<HTMLElement>('[data-dist]')
    const l = el.querySelector<HTMLElement>('[data-l]')
    const r = el.querySelector<HTMLElement>('[data-r]')
    const tick = () => {
      if (!spatialLive.active) return
      const s = spatialLive.read
      if (az) az.textContent = `${Math.round(s.azimuth)}°`
      if (dist) dist.textContent = `${s.distance.toFixed(1)} m`
      if (l) l.textContent = formatDb(s.leftDb)
      if (r) r.textContent = formatDb(s.rightDb)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <Scene ref={root} id="spatial" index={spatial.index} label={spatial.label} labelledBy="spatial-title">
      {/* Static rings: the reduced-motion version of the field. */}
      <div className="pointer-events-none absolute inset-0 hidden place-items-center motion-reduce:grid" aria-hidden>
        <div className="relative aspect-square w-[min(78vw,78svh)]">
          {RINGS.map((r) => (
            <div
              key={r}
              className="absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-bone/15"
              style={{ width: `${r * 100}%` }}
            />
          ))}
          <span className="absolute left-1/2 top-[3%] block h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brass shadow-[0_0_24px_4px_rgba(198,161,91,0.45)]" />
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
          <div data-hint className="max-w-[22rem]">
            <p className="label label-bone">{coarse ? spatial.hintTouch : spatial.hint}</p>
            <p className="label mt-2 text-fog">{soundOn ? spatial.audioOn : spatial.audioOff}</p>
          </div>
          <dl data-readout className="grid grid-cols-4 gap-x-6 gap-y-1 sm:gap-x-10">
            {[
              { k: 'Azimuth', a: 'data-az', v: '37°' },
              { k: 'Distance', a: 'data-dist', v: '1.2 m' },
              { k: 'L', a: 'data-l', v: '−4.1 dB' },
              { k: 'R', a: 'data-r', v: '−1.8 dB' },
            ].map((r) => (
              <div key={r.k}>
                <dt className="label">{r.k}</dt>
                <dd {...{ [r.a]: '' }} className="mt-1 font-display text-2xl leading-none tabular-nums sm:text-3xl">
                  {r.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Scene>
  )
}
