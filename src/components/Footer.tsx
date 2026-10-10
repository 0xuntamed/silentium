import { footer, nav } from '../content/copy'
import { productCopy } from '../content/products'
import { scrollToY } from '../lib/lenis'
import { navigate } from '../lib/router'
import { Link } from './Link'
import { Newsletter } from './Newsletter'
import { SoundToggle } from './SoundToggle'

/** Newsletter, site map and the small print. `rise` tags blocks for the landing CTA's entrance. */
export function Footer({ rise = false }: { rise?: boolean }) {
  const r = rise ? { 'data-rise': '' } : {}
  const goScene = (scene: string) => navigate('/', { scene })
  return (
    <footer className="mt-28 grid gap-12 border-t hairline pb-8 pt-12 md:grid-cols-12">
      <div {...r} className="md:col-span-6">
        <Newsletter />
      </div>
      <nav {...r} aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-4 md:col-start-8">
        <div>
          <p className="label label-bone mb-4">Explore</p>
          <ul className="space-y-2.5">
            {nav.links.map((l) => (
              <li key={l.scene}>
                <a
                  href={`/#${l.scene}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goScene(l.scene)
                  }}
                  className="text-ash transition-colors hover:text-bone"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label label-bone mb-4">Shop</p>
          <ul className="space-y-2.5">
            <li><Link to={productCopy.one.path} className="text-ash transition-colors hover:text-bone">{productCopy.one.name}</Link></li>
            <li><Link to={productCopy.buds.path} className="text-ash transition-colors hover:text-bone">{productCopy.buds.name}</Link></li>
            <li><Link to="/compare" className="text-ash transition-colors hover:text-bone">Compare</Link></li>
          </ul>
        </div>
      </nav>
      <div {...r} className="flex flex-col items-start gap-3 md:col-span-12 md:flex-row md:items-center md:justify-between">
        <SoundToggle />
        <button type="button" onClick={() => scrollToY(0)} className="label transition-colors hover:text-bone">
          {footer.top} ↑
        </button>
      </div>
      <div {...r} className="flex flex-col gap-3 border-t hairline pt-6 md:col-span-12 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-2xl tracking-tight">{footer.line}</p>
        <p className="label text-fog">{footer.fine}</p>
      </div>
    </footer>
  )
}
