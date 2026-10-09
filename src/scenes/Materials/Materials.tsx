import { useRef } from 'react'
import { useScene } from '../../lib/useScene'
import { Scene } from '../../components/Scene'
import { materials } from '../../content/copy'

/**
 * Materials — the exploded view. Phase 1 skeleton: the parts index lights up one by one as the scene
 * scrubs. Phase 4 assembles the 3D headphones from these same 24 parts.
 */
export function Materials() {
  const root = useRef<HTMLElement>(null)

  useScene(root, {
    id: 'materials',
    build: (tl, { q }) => {
      tl.fromTo('[data-copy]', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0)
      tl.fromTo(q('[data-part]'), { opacity: 0.12 }, { opacity: 1, duration: 0.03, stagger: 0.022 }, 0.1)
      tl.fromTo(q('[data-finish]'), { opacity: 0.25, y: 12 }, { opacity: 1, y: 0, duration: 0.08, stagger: 0.05 }, 0.66)
      tl.to('[data-content]', { opacity: 0, duration: 0.12, ease: 'power1.in' }, 0.88)
    },
  })

  return (
    <Scene ref={root} id="materials" index={materials.index} label={materials.label} labelledBy="materials-title">
      <div data-content className="relative z-10 grid h-full grid-cols-1 gap-10 pt-[calc(var(--gutter)*0.4)] lg:grid-cols-12">
        <div data-copy className="lg:col-span-6">
          <h2 id="materials-title" className="display-l">
            {materials.title[0]} <em>{materials.title[1]}</em>
          </h2>
          <p className="body-l mt-6 max-w-[28em]">{materials.body}</p>
        </div>

        <div className="flex min-h-0 flex-col justify-between lg:col-span-5 lg:col-start-8">
          <ol className="grid grid-cols-2 gap-x-8 border-t hairline pt-4 [counter-reset:part] sm:gap-x-12">
            {materials.parts.map((p, i) => (
              <li
                key={p}
                data-part
                className="flex items-baseline gap-3 border-b hairline py-[0.32rem] text-[0.8rem] leading-tight text-bone sm:py-[0.4rem] sm:text-sm"
              >
                <span className="label w-5 shrink-0 tabular-nums text-fog">{String(i + 1).padStart(2, '0')}</span>
                {p}
              </li>
            ))}
          </ol>

          <ul className="mt-6 flex gap-3 pb-[calc(var(--gutter)*0.6)]">
            {materials.finishes.map((f, i) => (
              <li
                key={f}
                data-finish
                className="label label-bone flex items-center gap-2.5 rounded-full border border-bone/20 px-4 py-2.5"
              >
                <span
                  aria-hidden
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{ background: ['#26262a', '#e8e0d0', '#c6a15b'][i] }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Scene>
  )
}
