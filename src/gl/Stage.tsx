import { useEffect, useLayoutEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { gsap } from '../lib/gsap'
import { detectTier, type Tier } from '../lib/tier'
import { engine } from '../systems/notes/engine'
import { watchScrollCues } from '../systems/notes/scrollCues'
import { conductor, setProgram } from '../systems/notes/conductor'
import { startCursorTracking } from '../systems/cursor/cursorSignal'
import { NotesField } from '../systems/notes/NotesField'
import { NearLayer2D } from '../systems/notes/NearLayer2D'
import { Cursor } from '../systems/cursor/Cursor'
import { DebugPanel } from '../systems/notes/DebugPanel'

/** Fits an orthographic camera to world space (y ∈ [-1, 1], x ∈ [-aspect, aspect]) and drives the loop. */
function Rig({ tier }: { tier: Tier }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const advance = useThree((s) => s.advance)
  const gl = useThree((s) => s.gl)

  // Camera follows the viewport aspect.
  useLayoutEffect(() => {
    const aspect = size.width / size.height
    const cam = camera as import('three').OrthographicCamera
    cam.left = -aspect
    cam.right = aspect
    cam.top = 1
    cam.bottom = -1
    cam.zoom = 1
    cam.near = 0.1
    cam.far = 10
    cam.position.set(0, 0, 5)
    cam.updateProjectionMatrix()
    engine.resize(size.width, size.height)
    if (tier.name === 'still') advance(performance.now())
  }, [camera, size, advance, tier])

  // One shared clock: gsap.ticker advances the sim, then the renderer.
  useEffect(() => {
    gl.setClearColor(0x000000, 0)
    if (tier.name === 'still') {
      engine.prewarm(240)
      advance(performance.now())
      return
    }
    const tick = (time: number, deltaMs: number) => {
      if (document.hidden) return
      engine.frame(deltaMs / 1000)
      advance(time * 1000)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [advance, gl, tier])

  return <NotesField />
}

/** The persistent stage: one WebGL context for the whole site, behind the DOM; near notes in front. */
export default function Stage() {
  const [tier] = useState(() => {
    const t = detectTier()
    engine.create(t, window.innerWidth, window.innerHeight)
    return t
  })

  useEffect(() => {
    const stopCursor = tier.name === 'still' ? () => {} : startCursorTracking()
    const stopCues = watchScrollCues()
    // Dev/test handles for the Playwright harness and the debug panel.
    const w = window as unknown as { __sil?: Record<string, unknown> }
    w.__sil = Object.assign(w.__sil ?? {}, {
      notes: {
        setProgram,
        /** Advance the sim without rendering (software-GL screenshots run at ~12 fps). */
        fastForward: (seconds: number) => {
          for (let k = 0; k < seconds * 30; k++) engine.frame(1 / 30)
        },
        burst: (x = 0, y = 0, n = 600, s = 2.4) => engine.sim?.burst(x, y, n, s),
        /** Dash distance to the staff targets (debug: should be ~0 when the staff is formed). */
        staffError: () => {
          const sim = engine.sim
          if (!sim) return null
          let max = 0
          let sum = 0
          let n = 0
          for (let i = 0; i < sim.n; i++) {
            const d = sim.dashIndex[i]
            if (d < 0) continue
            const e = Math.abs(sim.y[i] - sim.formations.staffY[d])
            max = Math.max(max, e)
            sum += e
            n++
          }
          return { max, mean: sum / n, weights: { ...conductor.weights } }
        },
        stats: () => ({ ...engine.stats, tier: tier.name, n: engine.sim?.n, active: engine.sim?.activeFrac }),
      },
    })
    return () => {
      stopCursor()
      stopCues()
    }
  }, [tier])

  const showDebug =
    (import.meta.env.DEV || import.meta.env.MODE === 'test') && new URLSearchParams(location.search).has('debug')

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <Canvas
          orthographic
          frameloop="never"
          dpr={[1, tier.dpr]}
          camera={{ position: [0, 0, 5], zoom: 1 }}
          gl={{ alpha: true, antialias: false, powerPreference: 'high-performance', premultipliedAlpha: true }}
          style={{ pointerEvents: 'none' }}
        >
          <Rig tier={tier} />
        </Canvas>
      </div>
      <NearLayer2D />
      {tier.name !== 'still' && <Cursor />}
      {showDebug && <DebugPanel />}
    </>
  )
}
