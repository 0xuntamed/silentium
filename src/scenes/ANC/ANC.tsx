import { useRef } from 'react'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { anc } from '../../content/copy'

const BARS = 30
const DB_START = 86
const DB_END = 44

/** Map a decibel reading to how many of the meter's bars are lit. */
const litBars = (db: number) => Math.round(((db - 40) / (90 - 40)) * BARS)

/**
 * ANC — "The world, on mute." Phase 1 skeleton: the pinned, scrubbed story beats as real HTML
 * (copy states, dB meter, bubble ring). Phase 3 puts the person, headphones, noise field and
 * refraction bubble behind it.
 */
export function ANC() {
  const root = useRef<HTMLElement>(null)

  useScene(root, {
    id: 'anc',
    build: (tl, { q, root }) => {
      const readout = root.querySelector<HTMLElement>('[data-db]')
      const bars = q('[data-bar]')
      const meter = { db: DB_START }
      const paint = () => {
        if (readout) readout.textContent = String(Math.round(meter.db))
        const lit = litBars(meter.db)
        bars.forEach((b, i) => {
          b.style.opacity = i < lit ? '1' : '0.14'
        })
      }
      paint()

      // 1. Chaos: the first state holds, then yields.
      tl.to('[data-state="noise"]', { opacity: 0, y: -30, duration: 0.06 }, 0.24)
      // 2. ANC switches on.
      tl.to('[data-chip="off"]', { opacity: 0, duration: 0.03 }, 0.3)
      tl.fromTo('[data-chip="on"]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.3)
      tl.fromTo('[data-state="listen"]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.07 }, 0.33)
      // 3. The field expands; the level falls.
      tl.fromTo('[data-bubble]', { scale: 0.001, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: 'power3.out' }, 0.34)
      tl.to(meter, { db: DB_END, duration: 0.28, ease: 'power2.out', onUpdate: paint }, 0.34)
      // 4. Out with the explanation, in with the line.
      tl.to('[data-state="listen"]', { opacity: 0, y: -30, duration: 0.06 }, 0.72)
      tl.fromTo('[data-state="reveal"]', { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.8)
      // 5. The bubble fills the frame, ready to become Spatial's first ring.
      tl.to('[data-bubble]', { scale: 2.6, opacity: 0, duration: 0.14, ease: 'power1.in' }, 0.86)
    },
  })

  return (
    <Scene ref={root} id="anc" index={anc.index} label={anc.label} labelledBy="anc-title">
      <h2 id="anc-title" className="sr-only">
        {anc.reveal.big} {anc.reveal.small}
      </h2>

      {/* The future bubble: a single hairline ring for now. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center motion-reduce:hidden" aria-hidden>
        <div
          data-bubble
          className="aspect-square w-[min(62vw,62svh)] rounded-full border border-brass/60"
        />
        <span className="beat absolute block h-2 w-2 rounded-full bg-brass" />
      </div>

      {/* dB meter */}
      <div className="absolute right-[var(--gutter)] top-[7.25rem] z-10 w-[min(15rem,46vw)] md:top-[5.25rem]" aria-hidden>
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
            <i
              key={i}
              data-bar
              className="block w-full origin-bottom bg-bone"
              style={{ height: `${28 + (i / BARS) * 72}%` }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end pb-[calc(var(--gutter)*0.6)]">
        <div className="stack">
          <div data-state="noise" className="max-w-[min(46rem,92vw)]">
            <p className="display-m">{anc.noise.title}</p>
            <p className="body-l mt-6">{anc.noise.body}</p>
          </div>
          <div data-state="listen" className="max-w-[min(46rem,92vw)]">
            <p className="display-m">{anc.listen.title}</p>
            <p className="body-l mt-6">{anc.listen.body}</p>
          </div>
          <div data-state="reveal" className="self-end">
            <p className="display-xl">{anc.reveal.big}</p>
            <p className="display-m mt-2 italic">{anc.reveal.small}</p>
          </div>
        </div>
      </div>
    </Scene>
  )
}
