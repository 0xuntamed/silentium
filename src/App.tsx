import { lazy, Suspense, useEffect, useState } from 'react'
import { LazyMotion, domAnimation } from 'motion/react'
import { ScrollTrigger } from './lib/gsap'
import { startSmoothScroll } from './lib/lenis'
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

// The WebGL stage is its own chunk; it downloads while the visitor sits in the silent intro.
const Stage = lazy(() => import('./gl/Stage'))

export default function App() {
  const [stageReady, setStageReady] = useState(false)
  const [gate, setGate] = useState(!hasEntered())
  const { open: cartOpen } = useCart()

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

  return (
    <LazyMotion features={domAnimation} strict>
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-bone focus:px-4 focus:py-2 focus:text-basalt"
      >
        Skip to content
      </a>
      {stageReady && (
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      )}
      {gate && <Silence onDone={() => setGate(false)} />}
      <Nav />
      <CartDrawer />
      <main id="top" inert={gate || cartOpen} className="relative z-[1]">
        <Hero />
        <ANC />
        <Spatial />
        <Materials />
        <Specs />
        <Reviews />
        <Cta />
      </main>
    </LazyMotion>
  )
}
