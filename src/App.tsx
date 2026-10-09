import { useEffect, useState } from 'react'
import { LazyMotion, domAnimation } from 'motion/react'
import { ScrollTrigger } from './lib/gsap'
import { startSmoothScroll } from './lib/lenis'
import { hasEntered } from './lib/session'
import { Nav } from './components/Nav'
import { Silence } from './scenes/Intro/Silence'
import { Hero } from './scenes/Hero/Hero'
import { ANC } from './scenes/ANC/ANC'
import { Spatial } from './scenes/Spatial/Spatial'
import { Materials } from './scenes/Materials/Materials'
import { Specs } from './scenes/Specs/Specs'
import { Reviews } from './scenes/Reviews/Reviews'
import { Cta } from './scenes/CTA/Cta'
import { installTestHooks } from './lib/testHooks'

export default function App() {
  const [gate, setGate] = useState(!hasEntered())

  useEffect(() => startSmoothScroll(), [])

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
      {gate && <Silence onDone={() => setGate(false)} />}
      <Nav />
      <main id="top" inert={gate}>
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
