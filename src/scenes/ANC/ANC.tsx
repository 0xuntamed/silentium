import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { anc } from '../../content/copy'
import { ancAt, BEATS, DB_START } from './state'
import { ancLive } from './live'
import { useAncStills } from './stills'

const BARS = 30

/** Map a decibel reading to how many of the meter's bars are lit. */
const litBars = (db: number) => Math.round(((db - 40) / (90 - 40)) * BARS)

/**
 * ANC — "The world, on mute." The DOM half of the pinned, scrubbed scene: copy states, the dB meter
 * and the ANC chip. The person, headphones, noise and bubble are drawn by AncStage in the shared
 * WebGL canvas; both halves are pure functions of the same local progress (see state.ts).
 */
export function ANC() {
  const root = useRef<HTMLElement>(null)
  const stills = useAncStills()

  useScene(root, {
    id: 'anc',
    build: (tl, { q, root }) => {
      const readout = root.querySelector<HTMLElement>('[data-db]')
      const bars = q('[data-bar]')
      const paint = (db: number) => {
        if (readout) readout.textContent = String(Math.round(db))
        const lit = litBars(db)
        bars.forEach((b, i) => {
          b.style.opacity = i < lit ? '1' : '0.14'
        })
      }
      paint(DB_START)

      // The meter is a pure function of progress — the same ancAt() the GL scene reads.
      const proxy = { p: 0 }
      tl.to(proxy, { p: 1, duration: 1, ease: 'none', onUpdate: () => paint(ancAt(proxy.p).db) }, 0)

      // 1. Chaos: the first state holds, then yields.
      tl.to('[data-state="noise"]', { opacity: 0, y: -30, duration: 0.06 }, 0.24)
      // 2. ANC switches on at the click.
      tl.to('[data-chip="off"]', { opacity: 0, duration: 0.03 }, 0.3)
      tl.fromTo('[data-chip="on"]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.3)
      tl.fromTo('[data-state="listen"]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.07 }, BEATS.engageStart - 0.01)
      // 3. Out with the explanation, in with the line.
      tl.to('[data-state="listen"]', { opacity: 0, y: -30, duration: 0.06 }, 0.72)
      tl.fromTo('[data-state="reveal"]', { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, BEATS.revealStart)
      tl.to('[data-state="reveal"]', { opacity: 0, duration: 0.05 }, 0.96)
    },
  })

  // While the noise is loud, the live reading flickers like a real meter.
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const readout = el.querySelector<HTMLElement>('[data-db]')
    const bars = Array.from(el.querySelectorAll<HTMLElement>('[data-bar]'))
    const tick = () => {
      if (!ancLive.active || ancLive.p > BEATS.engageStart) return
      const level = ancLive.state.noise
      const db = DB_START + (Math.random() - 0.5) * 5 * level
      if (readout) readout.textContent = String(Math.round(db))
      const lit = litBars(db)
      bars.forEach((b, i) => {
        b.style.opacity = i < lit ? '1' : '0.14'
      })
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  const still = (i: number) =>
    stills[i] ? (
      <img
        src={stills[i]}
        alt=""
        aria-hidden
        className="mb-8 hidden aspect-[4/5] w-full rounded-sm border hairline object-cover motion-reduce:block md:aspect-[16/9]"
      />
    ) : null

  return (
    <Scene ref={root} id="anc" index={anc.index} label={anc.label} labelledBy="anc-title">
      <h2 id="anc-title" className="sr-only">
        {anc.reveal.big} {anc.reveal.small}
      </h2>

      {/* dB meter */}
      <div
        className="absolute right-[var(--gutter)] top-[7.25rem] z-10 w-[min(15rem,46vw)] md:top-[5.25rem] motion-reduce:static motion-reduce:mb-10"
        aria-hidden
      >
        <div className="flex items-baseline justify-between">
          <span className="label">{anc.meter.label}</span>
          <span className="relative h-4 w-14">
            <span data-chip="off" className="label absolute right-0 text-static">
              {anc.meter.off}
            </span>
            <span data-chip="on" className="label label-brass absolute right-0">
              {anc.meter.on}
            </span>
          </span>
        </div>
        <p className="mt-2 flex items-baseline gap-1.5 font-display leading-none tracking-tight">
          <span data-db className="text-6xl tabular-nums">
            {DB_START}
          </span>
          <span className="label">{anc.meter.unit}</span>
        </p>
        <div className="mt-3 flex h-6 items-end gap-[3px]">
          {Array.from({ length: BARS }, (_, i) => (
            <i key={i} data-bar className="block w-full origin-bottom bg-bone" style={{ height: `${28 + (i / BARS) * 72}%` }} />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end pb-[calc(var(--gutter)*0.6)]">
        <div className="stack">
          <div data-state="noise" className="max-w-[min(46rem,92vw)]">
            {still(0)}
            <p className="display-m">{anc.noise.title}</p>
            <p className="body-l mt-6">{anc.noise.body}</p>
          </div>
          <div data-state="listen" className="max-w-[min(46rem,92vw)]">
            {still(1)}
            <p className="display-m">{anc.listen.title}</p>
            <p className="body-l mt-6">{anc.listen.body}</p>
          </div>
          <div data-state="reveal" className="self-end">
            {still(2)}
            <p className="display-xl">{anc.reveal.big}</p>
            <p className="display-m mt-2 italic">{anc.reveal.small}</p>
          </div>
        </div>
      </div>
    </Scene>
  )
}
