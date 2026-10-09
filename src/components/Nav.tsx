import * as m from 'motion/react-m'
import { nav } from '../content/copy'
import { bezier } from '../lib/easings'
import { scrollToScene, scrollToY } from '../lib/lenis'
import { useEntered } from '../lib/session'
import { SoundToggle } from './SoundToggle'

export function Nav() {
  const entered = useEntered()
  return (
    <m.header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[var(--gutter)] py-4"
      initial={{ opacity: 0, y: -12 }}
      animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 1.1, ease: bezier.hush, delay: 0.9 }}
    >
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault()
          scrollToY(0)
        }}
        className="font-display text-[1.6rem] leading-none tracking-[-0.02em]"
        aria-label="SILENTIUM — back to top"
      >
        SILENTIUM
      </a>

      <nav aria-label="Primary" className="hidden md:block">
        <ul className="flex items-center gap-9">
          {nav.links.map((l) => (
            <li key={l.scene}>
              <a
                href={`#${l.scene}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToScene(l.scene)
                }}
                className="label transition-colors hover:text-bone"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-6">
        <SoundToggle />
        <button type="button" className="label label-bone hidden transition-colors hover:text-brass sm:block">
          {nav.cart} <span className="text-ash">(0)</span>
        </button>
      </div>
    </m.header>
  )
}
