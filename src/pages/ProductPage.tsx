import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { addItem, money } from '../lib/cart'
import { bezier } from '../lib/easings'
import { scrollToY } from '../lib/lenis'
import { prefersReducedMotion } from '../lib/useReducedMotion'
import { differs, productCopy, productUi, specGroups, specRows } from '../content/products'
import type { ProductId } from '../lib/cart'
import { FINISHES } from '../scenes/Materials/constants'
import { ProductViewer } from '../scenes/Product/ProductViewer'
import { activateView, deactivateView, setExplode, setViewFinish, useViewField } from '../scenes/Product/viewLive'
import { MagneticButton } from '../components/MagneticButton'
import { Footer } from '../components/Footer'
import { Link } from '../components/Link'
import { Reveal } from '../components/Reveal'

/**
 * A product page. The model lives in the shared WebGL canvas behind the page (the same single context
 * as the landing); this is everything in front of it: the copy, the finish switcher, the 360° controls,
 * the spec grid. One component serves both products — the data decides.
 */
export default function ProductPage({ id }: { id: ProductId }) {
  const p = productCopy[id]
  const other = productCopy[id === 'one' ? 'buds' : 'one']
  const finish = useViewField((l) => l.finish)
  const hero = useRef<HTMLElement>(null)
  const [past, setPast] = useState(false)
  const [added, setAdded] = useState(0)

  useEffect(() => {
    activateView(id, prefersReducedMotion())
    return deactivateView
  }, [id])

  // The buy bar slides in once the hero is behind you.
  useEffect(() => {
    const el = hero.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const add = () => {
    addItem(id, FINISHES[finish].label)
    setAdded((n) => n + 1)
  }

  const explodeFromAnatomy = () => {
    scrollToY(0)
    window.setTimeout(() => setExplode(true), 500)
  }

  return (
    <>
      <section ref={hero} aria-labelledby="product-title" className="relative flex flex-col px-[var(--gutter)] pb-16 pt-24 lg:grid lg:min-h-svh lg:grid-cols-12 lg:gap-10 lg:pb-12 lg:pt-28">
        {/* On phones the model sits above the copy, in the space this block holds. */}
        <div className="relative z-10 order-2 flex flex-col justify-center lg:order-1 lg:col-span-5">
          <Reveal>
            <p className="label flex items-center gap-3">
              <span className="label-brass">{p.index}</span>
              <span className="h-px w-8 bg-bone/20" aria-hidden />
              {p.kind}
            </p>
          </Reveal>
          <h1 id="product-title" className="mt-6">
            <m.span
              className="label label-bone block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.1 }}
            >
              SILENTIUM
            </m.span>
            <m.span
              className="display-xl mt-2 block"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.3, delay: 0.2, ease: bezier.hush }}
            >
              {p.short}
            </m.span>
          </h1>
          <Reveal delay={0.1}>
            <p className="display-m mt-6 text-bone">
              {p.title[0]} <em>{p.title[1]}</em>
            </p>
            <p className="body-l mt-6 max-w-[27em]">{p.blurb}</p>
          </Reveal>

          <Reveal delay={0.15} className="mt-8">
            <FinishPicker />
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <MagneticButton type="button" onClick={add} className="label rounded-full bg-brass px-7 py-4 text-basalt transition-colors hover:bg-bone">
                {productUi.add}
                <span className="font-normal opacity-70">{money(p.price)}</span>
              </MagneticButton>
              <Link to="/compare" className="label rounded-full border border-bone/25 px-6 py-4 transition-colors hover:border-brass hover:text-brass">
                {productUi.compare}
              </Link>
            </div>
            <p role="status" aria-live="polite" className="label label-brass mt-4 h-4">
              {added > 0 ? `${FINISHES[finish].label} · ${productUi.sticky}` : ''}
            </p>
          </Reveal>
        </div>

        <div className="relative z-10 order-1 mb-6 h-[56svh] min-h-[24rem] lg:order-2 lg:col-span-7 lg:mb-0 lg:h-auto">
          <ProductViewer product={p} />
        </div>
      </section>

      {/* At a glance. */}
      <section aria-labelledby="glance-title" className="relative z-10 px-[var(--gutter)] py-24">
        <Reveal>
          <h2 id="glance-title" className="label mb-8 flex items-center gap-3">
            <span className="label-brass">—</span> {productUi.highlights}
          </h2>
        </Reveal>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-12 border-t hairline pt-10 md:grid-cols-4">
          {p.highlights.map((h, i) => (
            <Reveal key={h.note} delay={i * 0.08} className="flex flex-col-reverse justify-end gap-3">
              <dt className="label">{h.note}</dt>
              <dd className="font-display text-[clamp(3.5rem,8vw,8rem)] leading-[0.9] tracking-[-0.03em]">
                {h.big}
                <span className="ml-1 text-[0.32em] italic text-brass">{h.unit}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* Anatomy: the exploded part list as real text. */}
      <section aria-labelledby="anatomy-title" className="relative z-10 grid gap-12 px-[var(--gutter)] py-24 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <p className="label mb-6 flex items-center gap-3">
            <span className="label-brass">—</span> {productUi.anatomy}
          </p>
          <h2 id="anatomy-title" className="display-m">
            {p.partsTitle[0]} <em>{p.partsTitle[1]}</em>
          </h2>
          <p className="body-l mt-6">{p.partsBody}</p>
          <button
            type="button"
            onClick={explodeFromAnatomy}
            className="label label-brass mt-8 rounded-full border border-brass/60 px-5 py-3 transition-colors hover:border-brass"
          >
            {productUi.view.explode} ↑
          </button>
        </Reveal>
        <ol className="grid grid-cols-1 content-start gap-x-8 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
          {p.parts.map((part, i) => (
            <li key={part} className="flex items-baseline gap-3 border-b hairline py-2 text-[0.95rem] text-bone">
              <span className="label w-6 shrink-0 tabular-nums text-fog">{String(i + 1).padStart(2, '0')}</span>
              {part}
            </li>
          ))}
        </ol>
      </section>

      {/* Specifications. */}
      <section aria-labelledby="specs-title" className="relative z-10 px-[var(--gutter)] py-24">
        <Reveal>
          <p className="label mb-6 flex items-center gap-3">
            <span className="label-brass">—</span> {productUi.specs}
          </p>
          <h2 id="specs-title" className="display-m max-w-[14em]">
            Everything, <em>measured.</em>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-2">
          {specGroups().map((g) => (
            <Reveal key={g} as="section">
              <h3 className="label label-bone border-b hairline pb-3">{g}</h3>
              <dl>
                {specRows
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <div key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 border-b hairline py-3.5 sm:grid-cols-[12rem_1fr]">
                      <dt className="label pt-0.5">{r.label}</dt>
                      <dd className={`text-[0.98rem] leading-snug ${differs(r) ? 'text-bone' : 'text-ash'}`}>{r[id]}</dd>
                    </div>
                  ))}
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="label mt-8 text-fog">{productUi.specsNote}</p>
      </section>

      {/* In the box + the other product. */}
      <section aria-labelledby="box-title" className="relative z-10 grid gap-12 px-[var(--gutter)] py-24 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <h2 id="box-title" className="label mb-6 flex items-center gap-3">
            <span className="label-brass">—</span> {productUi.box}
          </h2>
          <ul className="space-y-2.5 text-[1.02rem] text-bone">
            {p.box.map((b) => (
              <li key={b} className="flex gap-3">
                <span aria-hidden className="mt-2.5 block h-px w-4 shrink-0 bg-brass" />
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="lg:col-span-7 lg:col-start-6" delay={0.1}>
          <Link
            to={other.path}
            className="group block border-t hairline pt-6 transition-colors hover:border-brass/60"
          >
            <p className="label">{id === 'one' ? productUi.other.one : productUi.other.buds}</p>
            <p className="display-l mt-4 transition-colors group-hover:text-brass">
              {other.short} <span className="text-brass">→</span>
            </p>
            <p className="label mt-4">
              {other.kind} · {money(other.price)}
            </p>
          </Link>
        </Reveal>
      </section>

      <div className="relative z-10 px-[var(--gutter)]">
        <Footer />
      </div>

      {/* Sticky buy bar. */}
      <AnimatePresence>
        {past && (
          <m.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.6, ease: bezier.hush }}
            className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-4 rounded-full border border-bone/15 bg-basalt/85 py-2 pl-6 pr-2 backdrop-blur-md sm:inset-x-auto sm:right-6 sm:min-w-[26rem]"
          >
            <span className="min-w-0 truncate text-sm">
              <span className="font-display text-xl">{p.name}</span>
              <span className="label ml-3 hidden sm:inline">{FINISHES[finish].label}</span>
            </span>
            <button type="button" onClick={add} className="label shrink-0 rounded-full bg-brass px-5 py-3 text-basalt transition-colors hover:bg-bone">
              {productUi.add} · {money(p.price)}
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** The finish switcher: a radio group. The model eases between colourways in the stage. */
function FinishPicker() {
  const finish = useViewField((l) => l.finish)
  return (
    <div>
      <p id="finish-label" className="label mb-3">
        {productUi.finish}: <span className="label-bone">{FINISHES[finish].label}</span>
      </p>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="finish-label">
        {FINISHES.map((f, i) => (
          <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={finish === i}
              onClick={() => setViewFinish(i)}
              className={`label flex items-center gap-2.5 rounded-full border px-4 py-2.5 transition-colors duration-300 ${
                finish === i ? 'border-brass text-brass' : 'border-bone/20 text-bone hover:border-bone/50'
              }`}
            >
              <span aria-hidden className="block h-2.5 w-2.5 rounded-full ring-1 ring-bone/20" style={{ background: f.swatch }} />
              {f.label}
            </button>
        ))}
      </div>
    </div>
  )
}
