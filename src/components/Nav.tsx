import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { menu, nav } from '../content/copy'
import { bezier } from '../lib/easings'
import { count, openCart, useCart } from '../lib/cart'
import { getLenis, scrollToScene, scrollToY } from '../lib/lenis'
import { useEntered } from '../lib/session'
import { navigate, useRouter } from '../lib/router'
import { Link } from './Link'
import { SoundToggle } from './SoundToggle'

const SHOP = [
  { label: 'One', to: '/one' },
  { label: 'Buds', to: '/buds' },
  { label: 'Compare', to: '/compare' },
]

/** Scene links go to the landing first when you are on another page. */
const goScene = (scene: string, onLanding: boolean) => (onLanding ? scrollToScene(scene) : navigate('/', { scene }))

/** The phone menu: a full-screen modal with the same links, in display type. */
function MobileMenu({ open, onClose, onLanding }: { open: boolean; onClose: () => void; onLanding: boolean }) {
  const first = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    getLenis()?.stop()
    document.documentElement.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => first.current?.focus())
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
      getLenis()?.start()
      previous?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={menu.label}
          className="fixed inset-0 z-[110] flex flex-col bg-basalt px-[var(--gutter)] pb-10 pt-20 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: bezier.exhale }}
        >
          <button ref={first} type="button" onClick={onClose} className="label label-bone absolute right-[var(--gutter)] top-5 py-2">
            {menu.close}
          </button>
          <ul className="mt-6 flex flex-col overflow-y-auto">
            {[
              ...nav.links.map((l) => ({ key: l.scene, label: l.label, scene: l.scene, to: '' })),
              ...SHOP.map((l) => ({ key: l.to, label: l.label, scene: '', to: l.to })),
            ].map((l, i) => (
              <m.li
                key={l.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: bezier.hush }}
                className="border-b hairline"
              >
                {l.to ? (
                  <Link to={l.to} onClick={onClose} className="display-m flex w-full items-baseline justify-between py-3.5 text-left">
                    {l.label}
                    <span className="label text-brass">→</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      window.setTimeout(() => goScene(l.scene, onLanding), 60)
                    }}
                    className="display-m flex w-full items-baseline justify-between py-3.5 text-left"
                  >
                    {l.label}
                    <span className="label text-fog">{String(i + 2).padStart(2, '0')}</span>
                  </button>
                )}
              </m.li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between">
            <SoundToggle />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export function Nav() {
  const entered = useEntered()
  const { items } = useCart()
  const n = count(items)
  const [menuOpen, setMenuOpen] = useState(false)
  const { path } = useRouter()
  const onLanding = path === '/'

  return (
    <>
      <m.header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[var(--gutter)] py-4 ${onLanding ? '' : 'bg-gradient-to-b from-basalt via-basalt/80 to-transparent'}`}
        initial={{ opacity: 0, y: -12 }}
        animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: 1.1, ease: bezier.hush, delay: 0.9 }}
      >
        <Link
          to="/"
          onClick={(e) => {
            if (onLanding) {
              e.preventDefault()
              scrollToY(0)
            }
          }}
          className="font-display text-[1.6rem] leading-none tracking-[-0.02em]"
          aria-label={onLanding ? 'SILENTIUM — back to top' : 'SILENTIUM — home'}
        >
          SILENTIUM
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-7 lg:gap-9">
            {(onLanding ? nav.links : [{ label: 'Story', scene: 'top' }]).map((l) => (
              <li key={l.scene}>
                <a
                  href={onLanding ? `#${l.scene}` : '/'}
                  onClick={(e) => {
                    e.preventDefault()
                    if (l.scene === 'top') navigate('/')
                    else goScene(l.scene, onLanding)
                  }}
                  className="label transition-colors hover:text-bone"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li aria-hidden className={`h-3 w-px bg-bone/20 ${onLanding ? 'hidden xl:block' : ''}`} />
            {onLanding && (
              <li className="xl:hidden">
                <Link to="/one" className="label label-brass transition-colors hover:text-bone">
                  Shop
                </Link>
              </li>
            )}
            {SHOP.map((l) => (
              <li key={l.to} className={onLanding ? 'hidden xl:block' : ''}>
                <Link
                  to={l.to}
                  aria-current={path === l.to ? 'page' : undefined}
                  className={`label transition-colors hover:text-bone ${path === l.to ? 'label-brass' : ''}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-5 sm:gap-6">
          <SoundToggle />
          <button
            type="button"
            onClick={openCart}
            aria-label={`${nav.cart}, ${n} ${n === 1 ? 'item' : 'items'}`}
            className="label label-bone flex items-center gap-1.5 transition-colors hover:text-brass"
          >
            {nav.cart}
            {/* Re-keyed on count so the number pops when something is added. */}
            <m.span key={n} initial={{ scale: 1.5, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: bezier.hush }} className={n ? 'text-brass' : 'text-ash'}>
              ({n})
            </m.span>
          </button>
          <button type="button" onClick={() => setMenuOpen(true)} className="label label-bone md:hidden" aria-haspopup="dialog">
            {menu.open}
          </button>
        </div>
      </m.header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onLanding={onLanding} />
    </>
  )
}
