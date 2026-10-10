import { lazy, Suspense, useEffect, useState } from 'react'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { ScrollTrigger } from './lib/gsap'
import { scrollToScene, startSmoothScroll } from './lib/lenis'
import { routeOf, takePendingScene, useRouter } from './lib/router'
import { hasEntered } from './lib/session'
import { Nav } from './components/Nav'
import { CartDrawer } from './components/CartDrawer'
import { useCart } from './lib/cart'
import { Silence } from './scenes/Intro/Silence'
import { Hero } from './scenes/Hero/Hero'
import { ANC } from './scenes/ANC/ANC'
import { Spatial } from './scenes/Spatial/Spatial'
import { Materials } from './scenes/Materials/Materials'
import { Specs } from './scenes/Specs/Specs'
import { Reviews } from './scenes/Reviews/Reviews'
import { Cta } from './scenes/CTA/Cta'
import { installTestHooks } from './lib/testHooks'
import { Curtain } from './components/Curtain'
import { Link } from './components/Link'
import { notFound, productCopy } from './content/products'

const ProductPage = lazy(() => import('./pages/ProductPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))

const TITLES: Record<string, { title: string; description: string }> = {
  '/': { title: 'SILENTIUM — Hear only what matters.', description: 'SILENTIUM — premium adaptive noise-cancelling headphones and earbuds. Hear only what matters.' },
  '/one': { title: 'SILENTIUM One — Over-ear adaptive ANC', description: productCopy.one.meta },
  '/buds': { title: 'SILENTIUM Buds — True wireless ANC', description: productCopy.buds.meta },
  '/compare': { title: 'Compare — SILENTIUM One and Buds', description: 'SILENTIUM One and SILENTIUM Buds compared, spec by spec.' },
}

function Landing() {
  return (
    <>
      <Hero />
      <ANC />
      <Spatial />
      <Materials />
      <Specs />
      <Reviews />
      <Cta />
    </>
  )
}

function NotFound() {
  return (
    <div className="relative z-10 flex min-h-svh flex-col justify-center px-[var(--gutter)] pt-24">
      <h1 className="display-xl">
        {notFound.title[0]}
        <br />
        <em>{notFound.title[1]}</em>
      </h1>
      <p className="body-l mt-8">{notFound.body}</p>
      <Link to="/" className="label label-brass mt-8">{notFound.home} →</Link>
    </div>
  )
}

// The WebGL stage is its own chunk; it downloads while the visitor sits in the silent intro.
const Stage = lazy(() => import('./gl/Stage'))

export default function App() {
  const [stageReady, setStageReady] = useState(false)
  const [gate, setGate] = useState(!hasEntered())
  const { open: cartOpen } = useCart()
  const { path } = useRouter()
  const route = routeOf(path)

  useEffect(() => startSmoothScroll(), [])

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const go = () => setStageReady(true)
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 1500 })
    else setTimeout(go, 400)
  }, [])

  // Webfonts change text metrics, which moves every pin: re-measure once they land.
  useEffect(() => {
    document.fonts.ready.then(() => ScrollTrigger.refresh())
    installTestHooks()
  }, [])

  // Each route has its own title and description; the pinned landing needs a re-measure on the way in.
  useEffect(() => {
    const t = TITLES[path] ?? { title: 'Not found — SILENTIUM', description: TITLES['/'].description }
    document.title = t.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.description)
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh())
    const scene = takePendingScene()
    const timer = scene ? window.setTimeout(() => scrollToScene(scene), 450) : 0
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [path])

  // "Craft" etc. while already on the landing.
  useEffect(() => {
    const on = (e: Event) => scrollToScene((e as CustomEvent<string>).detail)
    window.addEventListener('sil:scene', on)
    return () => window.removeEventListener('sil:scene', on)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation} strict>
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-bone focus:px-4 focus:py-2 focus:text-basalt"
      >
        Skip to content
      </a>
      {stageReady && (
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      )}
      {gate && route === '/' && <Silence onDone={() => setGate(false)} />}
      <Nav />
      <CartDrawer />
      <main id="top" tabIndex={-1} inert={(gate && route === '/') || cartOpen} className="relative z-[1] outline-none">
        {route === '/' && <Landing />}
        <Suspense fallback={null}>
          {route === '/one' && <ProductPage key="one" id="one" />}
          {route === '/buds' && <ProductPage key="buds" id="buds" />}
          {route === '/compare' && <ComparePage />}
        </Suspense>
        {route === '*' && <NotFound />}
      </main>
      <Curtain />
    </LazyMotion>
    </MotionConfig>
  )
}
