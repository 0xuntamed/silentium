import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { materials } from '../../content/copy'
import { FINISHES } from './constants'
import { productLive, setFinishIndex, useFinish, useProductStills } from './live'

/** Left/right placement of each part's label, by name (centre parts alternate). */
const sideOf = (label: string, i: number) => (/ L$/.test(label) ? -1 : / R$/.test(label) ? 1 : i % 2 ? 1 : -1)

/**
 * Materials — the exploded view. SILENTIUM One is drawn by the shared WebGL stage; this is its DOM:
 * the copy, a technical label that follows each part as it locks in, and the finish switcher.
 * Reduced motion: no pin — the 24-part index and two stills (exploded / assembled) instead.
 */
export function Materials() {
  const root = useRef<HTMLElement>(null)
  const finish = useFinish()
  const stills = useProductStills()

  useScene(root, {
    id: 'materials',
    build: (tl, { q }) => {
      tl.fromTo('[data-copy]', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.02)
      tl.fromTo(q('[data-finish]'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.06, stagger: 0.03 }, 0.58)
      tl.fromTo('[data-note]', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.66)
      tl.to('[data-copy]', { opacity: 0, duration: 0.06 }, 0.62)
      tl.fromTo('[data-spec]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.08, ease: 'power2.out' }, 0.82)
      tl.to('[data-content]', { opacity: 0, duration: 0.1, ease: 'power1.in' }, 0.92)
    },
  })

  // A label rides each part as it assembles. Transform + opacity only, positions from the Stage.
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-label]'))
    const narrow = window.innerWidth < 768
    const tick = () => {
      const on = productLive.scene === 'materials'
      nodes.forEach((n, i) => {
        const l = productLive.labels[i]
        const a = on && !(narrow && i % 3 !== 0) ? l.a : 0
        if (a < 0.01) {
          if (n.style.opacity !== '0') n.style.opacity = '0'
          return
        }
        const side = Number(n.dataset.side)
        const slot = (i % 4) - 1.5
        n.style.opacity = a.toFixed(3)
        n.style.transform = `translate3d(${(l.x + side * 22).toFixed(1)}px, ${(l.y + slot * 15 - 9).toFixed(1)}px, 0) translateX(${side < 0 ? '-100%' : '0'})`
      })
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <Scene ref={root} id="materials" index={materials.index} label={materials.label} labelledBy="materials-title">
      {/* Part labels, projected from the 3D model each frame. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 motion-reduce:hidden">
        {materials.parts.map((p, i) => {
          const side = sideOf(p, i)
          return (
            <div
              key={p}
              data-label
              data-side={side}
              className={`absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap ${side < 0 ? 'flex-row-reverse' : ''}`}
              style={{ opacity: 0, willChange: 'transform, opacity' }}
            >
              <i className="block h-1.5 w-1.5 rounded-full bg-brass" />
              <i className="block h-px w-4 bg-bone/40" />
              <span className="label label-bone">
                <span className="text-brass">{String(i + 1).padStart(2, '0')}</span> {p}
              </span>
            </div>
          )
        })}
      </div>

      <div data-content className="relative z-10 grid h-full grid-cols-1 gap-8 pt-[calc(var(--gutter)*0.4)] lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div data-copy>
            <h2 id="materials-title" className="display-l">
              {materials.title[0]} <em>{materials.title[1]}</em>
            </h2>
            <p className="body-l mt-6 max-w-[28em]">{materials.body}</p>
          </div>
          <dl data-spec className="mt-8 hidden max-w-[26em] grid-cols-3 gap-x-6 border-t hairline pt-4 lg:grid motion-reduce:hidden">
            {materials.materialsList.map((m) => (
              <div key={m.k}>
                <dt className="label">{m.k}</dt>
                <dd className="mt-1 text-sm leading-snug text-bone">{m.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Stills + index: the static, reduced-motion version of the exploded view. */}
        <div className="hidden motion-reduce:block lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            {stills.map((s, i) => (
              <figure key={i}>
                <img src={s} alt="" aria-hidden className="aspect-[4/3] w-full rounded-sm border hairline object-contain" />
                <figcaption className="label mt-2">{i === 0 ? 'Exploded' : 'Assembled'}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>

      {/* The 24 parts, for assistive tech in motion mode and as a visible index when motion is reduced. */}
      <ol className="sr-only motion-reduce:not-sr-only motion-reduce:mt-8 motion-reduce:grid motion-reduce:grid-cols-2 motion-reduce:gap-x-8 sm:motion-reduce:grid-cols-3">
        {materials.parts.map((p, i) => (
          <li key={p} className="flex items-baseline gap-3 border-b hairline py-1.5 text-sm text-bone">
            <span className="label w-5 shrink-0 tabular-nums text-fog">{String(i + 1).padStart(2, '0')}</span>
            {p}
          </li>
        ))}
      </ol>

      {/* Finish switcher. */}
      <div className="absolute inset-x-0 bottom-[calc(var(--gutter)*0.9)] z-20 flex flex-col items-center gap-3 px-[var(--gutter)] motion-reduce:static motion-reduce:mt-10 motion-reduce:items-start motion-reduce:px-0">
        <p data-note className="label hidden sm:block motion-reduce:hidden">
          {materials.finishNote}
        </p>
        <ul className="flex gap-3" role="radiogroup" aria-label="Finish">
          {FINISHES.map((f, i) => (
            <li key={f.id} data-finish>
              <button
                type="button"
                role="radio"
                aria-checked={finish === i}
                onClick={() => setFinishIndex(i)}
                className={`label flex items-center gap-2.5 rounded-full border px-4 py-2.5 transition-colors duration-300 ${
                  finish === i ? 'border-brass text-brass' : 'border-bone/20 text-bone hover:border-bone/50'
                }`}
              >
                <span aria-hidden className="block h-2.5 w-2.5 rounded-full" style={{ background: f.swatch }} />
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Scene>
  )
}
