import { useEffect, useRef } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { closeCart, count, money, PRODUCTS, removeItem, setQty, subtotal, useCart } from '../lib/cart'
import { bezier } from '../lib/easings'
import { getLenis } from '../lib/lenis'
import { cart as copy } from '../content/copy'
import { FINISHES } from '../scenes/Materials/constants'

const swatch = (name: string) => FINISHES.find((f) => f.label === name)?.swatch ?? '#26262a'

/**
 * The cart drawer (UI only). A modal dialog: it takes focus, traps Tab, closes on Escape or a click on
 * the scrim, restores focus afterwards, and stops the page scrolling behind it. Enter/exit is Framer
 * Motion (transform + opacity).
 */
export function CartDrawer() {
  const { items, open } = useCart()
  const panel = useRef<HTMLElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    getLenis()?.stop()
    document.documentElement.style.overflow = 'hidden'
    // Wait a frame so the panel exists before taking focus.
    const raf = requestAnimationFrame(() => closeBtn.current?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeCart()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const f = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
      getLenis()?.start()
      previous?.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120]" data-no-enter>
          <m.div
            aria-hidden
            className="absolute inset-0 bg-basalt/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={closeCart}
          />
          <m.aside
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="absolute inset-y-0 right-0 flex w-[min(28rem,100vw)] flex-col border-l hairline bg-graphite"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: bezier.hush }}
          >
            <header className="flex items-center justify-between border-b hairline px-6 py-5">
              <h2 id="cart-title" className="font-display text-3xl leading-none tracking-tight">
                {copy.title} <span className="text-ash">({count(items)})</span>
              </h2>
              <button ref={closeBtn} type="button" onClick={closeCart} className="label label-bone rounded-full border border-bone/25 px-4 py-2 transition-colors hover:border-brass hover:text-brass">
                {copy.close}
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6" data-lenis-prevent>
              {items.length === 0 ? (
                <p className="body-l mt-10">{copy.empty}</p>
              ) : (
                <ul className="divide-y divide-bone/10">
                  <AnimatePresence initial={false}>
                    {items.map((it) => {
                      const p = PRODUCTS[it.id]
                      return (
                        <m.li
                          key={it.key}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 24 }}
                          transition={{ duration: 0.4, ease: bezier.hush }}
                          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 py-6"
                        >
                          <div>
                            <p className="font-display text-2xl leading-none tracking-tight">{p.name}</p>
                            <p className="label mt-2">{p.kind}</p>
                            <p className="label mt-1 flex items-center gap-2">
                              {copy.finish}
                              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: swatch(it.finish) }} />
                              <span className="label-bone">{it.finish}</span>
                            </p>
                          </div>
                          <p className="font-display text-2xl tabular-nums">{money(p.price * it.qty)}</p>
                          <div className="flex items-center gap-1" role="group" aria-label={`${p.name} quantity`}>
                            <button type="button" aria-label={`Decrease ${p.name} quantity`} onClick={() => setQty(it.key, it.qty - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-bone/20 transition-colors hover:border-brass">
                              −
                            </button>
                            <span className="w-8 text-center tabular-nums" aria-live="polite">
                              {it.qty}
                            </span>
                            <button type="button" aria-label={`Increase ${p.name} quantity`} onClick={() => setQty(it.key, it.qty + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-bone/20 transition-colors hover:border-brass">
                              +
                            </button>
                          </div>
                          <button type="button" onClick={() => removeItem(it.key)} className="label justify-self-end underline-offset-4 transition-colors hover:text-bone hover:underline">
                            {copy.remove}
                          </button>
                        </m.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            <footer className="border-t hairline px-6 py-6">
              <p className="flex items-baseline justify-between">
                <span className="label label-bone">{copy.subtotal}</span>
                <span className="font-display text-4xl tabular-nums leading-none">{money(subtotal(items))}</span>
              </p>
              <button type="button" disabled className="label mt-5 w-full cursor-not-allowed rounded-full bg-brass/40 px-6 py-4 text-basalt/70">
                {copy.checkout}
              </button>
              <p className="label mt-3 text-fog">{copy.demo}</p>
            </footer>
          </m.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
