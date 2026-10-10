import { useMemo, useState } from 'react'
import * as m from 'motion/react-m'
import { LayoutGroup } from 'motion/react'
import { addItem, money } from '../lib/cart'
import { bezier } from '../lib/easings'
import { comparePage, differs, productCopy, specGroups, specRows } from '../content/products'
import type { ProductId } from '../lib/cart'
import { FINISHES } from '../scenes/Materials/constants'
import { Footer } from '../components/Footer'
import { Link } from '../components/Link'
import { Silhouette } from '../components/Silhouette'
import { Reveal } from '../components/Reveal'

const IDS: ProductId[] = ['one', 'buds']

/**
 * The compare page: one real <table> (row headers, column headers, a caption) with a toggle that
 * folds away the rows where the two products agree. Rows animate with Framer layout; the header
 * stays under the nav while you scroll.
 */
export default function ComparePage() {
  const [onlyDiff, setOnlyDiff] = useState(false)
  const [finish, setFinish] = useState(0)
  const groups = useMemo(
    () =>
      specGroups().map((g) => ({
        name: g,
        rows: specRows.filter((r) => r.group === g && (!onlyDiff || differs(r))),
      })),
    [onlyDiff],
  )

  return (
    <div className="relative z-10 px-[var(--gutter)] pb-8 pt-28 lg:pt-36">
      <header className="max-w-[60rem]">
        <m.p className="label flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <span className="label-brass">{comparePage.index}</span>
          <span className="h-px w-8 bg-bone/20" aria-hidden />
          {comparePage.kicker}
        </m.p>
        <m.h1
          className="display-l mt-6"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.1, ease: bezier.hush }}
        >
          {comparePage.title[0]}
          <br />
          <em>{comparePage.title[1]}</em>
        </m.h1>
        <p className="body-l mt-6">{comparePage.body}</p>
      </header>

      {/* Product header cards. */}
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {IDS.map((id, i) => {
          const p = productCopy[id]
          return (
            <Reveal key={id} delay={i * 0.1}>
              <article className="flex h-full flex-col gap-5 border border-bone/12 bg-graphite/60 p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-4xl leading-none tracking-tight">{p.name}</h2>
                    <p className="label mt-3">{p.kind}</p>
                  </div>
                  <div className="text-ash">
                    <Silhouette id={id} />
                  </div>
                </div>
                <p className="body-l text-[0.98rem]">{comparePage.choose[i].head} {comparePage.choose[i].body}</p>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => addItem(id, FINISHES[finish].label)}
                    className="label rounded-full bg-brass px-6 py-3.5 text-basalt transition-colors hover:bg-bone"
                  >
                    Add to cart · {money(p.price)}
                  </button>
                  <Link to={p.path} className="label rounded-full border border-bone/25 px-5 py-3.5 transition-colors hover:border-brass hover:text-brass">
                    View {p.short}
                  </Link>
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>

      {/* Controls. */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-6">
        <button
          type="button"
          aria-pressed={onlyDiff}
          onClick={() => setOnlyDiff((v) => !v)}
          className={`label flex items-center gap-3 rounded-full border px-5 py-3 transition-colors ${onlyDiff ? 'border-brass text-brass' : 'border-bone/25 hover:border-bone/50 hover:text-bone'}`}
        >
          <span aria-hidden className={`relative block h-3 w-6 rounded-full border ${onlyDiff ? 'border-brass' : 'border-bone/40'}`}>
            <span className={`absolute top-0.5 h-1.5 w-1.5 rounded-full transition-all duration-300 ${onlyDiff ? 'left-[0.9rem] bg-brass' : 'left-0.5 bg-bone/60'}`} />
          </span>
          {onlyDiff ? comparePage.all : comparePage.differences}
        </button>
        <div role="radiogroup" aria-label="Finish for the cart" className="flex items-center gap-3">
          <span className="label hidden sm:block">Finish</span>
          {FINISHES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={finish === i}
              onClick={() => setFinish(i)}
              className={`label flex items-center gap-2 rounded-full border px-3.5 py-2 transition-colors ${finish === i ? 'border-brass text-brass' : 'border-bone/20 text-bone hover:border-bone/50'}`}
            >
              <span aria-hidden className="block h-2.5 w-2.5 rounded-full ring-1 ring-bone/20" style={{ background: f.swatch }} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* The table. */}
      <div className="mt-6">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{comparePage.tableCaption}</caption>
          <thead className="sticky top-14 z-20 bg-basalt/90 backdrop-blur-md">
            <tr className="border-b hairline">
              <th scope="col" className="w-[34%] py-4 pr-4 align-bottom sm:w-[28%]">
                <span className="sr-only">Specification</span>
              </th>
              {IDS.map((id) => (
                <th key={id} scope="col" className="py-4 pr-4 align-bottom font-display text-xl font-normal leading-tight tracking-tight sm:text-3xl">
                  {productCopy[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <LayoutGroup>
            {groups.map((g) =>
              g.rows.length === 0 ? null : (
                <tbody key={g.name}>
                  <tr>
                    <th colSpan={3} scope="colgroup" className="label label-brass pb-3 pt-10 text-left">
                      {g.name}
                    </th>
                  </tr>
                  {g.rows.map((r) => {
                    const d = differs(r)
                    return (
                      <m.tr
                        key={r.label}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, ease: bezier.hush }}
                        className="border-b hairline align-top"
                      >
                        <th scope="row" className="label py-3.5 pr-4 font-medium">
                          {r.label}
                        </th>
                        {IDS.map((id) => (
                          <td key={id} className={`py-3.5 pr-4 text-[0.95rem] leading-snug sm:text-base ${d ? 'text-bone' : 'text-ash'}`}>
                            {r[id]}
                          </td>
                        ))}
                      </m.tr>
                    )
                  })}
                </tbody>
              ),
            )}
          </LayoutGroup>
        </table>
        <p className="label mt-6 text-fog">Placeholder values for a concept brand. Rows in bright type differ.</p>
      </div>

      <Footer />
    </div>
  )
}
