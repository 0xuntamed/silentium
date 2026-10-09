import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { detectTier, type Tier } from '../lib/tier'
import { engine } from '../systems/notes/engine'
import { watchScrollCues } from '../systems/notes/scrollCues'
import { conductor, setProgram } from '../systems/notes/conductor'
import { startCursorTracking } from '../systems/cursor/cursorSignal'
import { NotesField } from '../systems/notes/NotesField'
import { NearLayer2D } from '../systems/notes/NearLayer2D'
import { Cursor } from '../systems/cursor/Cursor'
import { DebugPanel } from '../systems/notes/DebugPanel'
import { scrollSignal } from '../lib/scroll'
import { AncStage } from '../scenes/ANC/AncStage'
import { ancLive, updateAncLive } from '../scenes/ANC/live'
import { setAncStills } from '../scenes/ANC/stills'
import { ShakeAndGrain } from '../systems/grain/ShakeAndGrain'

/** Local progress points for the reduced-motion stills: before / ANC on / after. */
const STILL_POINTS = [0.05, 0.5, 0.8]

/** Fits an orthographic camera to world space (y ∈ [-1, 1], x ∈ [-aspect, aspect]) and drives the loop. */
function Rig({ tier }: { tier: Tier }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const advance = useThree((s) => s.advance)
  const gl = useThree((s) => s.gl)
  const anc = useRef<AncStage | null>(null)

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
    anc.current?.resize(gl, aspect)
    if (tier.name === 'still') advance(performance.now())
  }, [camera, size, advance, tier, gl])

  // The ANC scene is a render pass inside this same canvas. It is built lazily (PMREM + shader
  // compiles are not free), a couple of viewports before the visitor reaches the scene.
  const sizeRef = useRef(size)
  sizeRef.current = size
  const ensureAnc = () => {
    if (!anc.current) {
      const stage = new AncStage(tier, gl, sizeRef.current.width / sizeRef.current.height)
      anc.current = stage
      void gl.compileAsync?.(stage.scene, camera)
    }
    return anc.current
  }

  useEffect(() => {
    const w = window as unknown as { __sil?: Record<string, unknown> }
    w.__sil = Object.assign(w.__sil ?? {}, {
      anc: {
        /** Pin the scene to a progress (or null to follow scroll). */
        setP: (p: number | null) => {
          ancLive.override = p
          ensureAnc()
        },
        parity: (R = 0.45, u = 0.55) => ensureAnc().parity(gl, R, u),
        /** Deterministic frame at progress p (noise clock frozen), as a PNG data URL. */
        snapshot: (p: number) => {
          const stage = ensureAnc()
          ancLive.frozen = true
          ancLive.override = p
          updateAncLive(0, window.innerHeight)
          stage.update(0, ancLive.state, 1, 0)
          advance(performance.now())
          return gl.domElement.toDataURL('image/png')
        },
        progress: () => ancLive.p,
      },
    })
    return () => {
      anc.current?.dispose()
      anc.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, tier])

  // Render order: ANC composite, then the notes on top. (A positive priority takes over rendering.)
  useFrame(({ gl: renderer, scene, camera: cam }) => {
    renderer.autoClear = false
    renderer.setRenderTarget(null)
    renderer.clear()
    if (anc.current && ancLive.active) anc.current.render(renderer, cam)
    renderer.render(scene, cam)
  }, 1)

  // One shared clock: gsap.ticker advances the scene state, the sim, then the renderer.
  useEffect(() => {
    gl.setClearColor(0x000000, 0)
    if (tier.name === 'still') {
      // Reduced motion: no loop. Render three designed ANC stills, then one settled notes frame.
      const urls: string[] = []
      engine.prewarm(240)
      const a = engine.inputs.anc!
      const stage = ensureAnc()
      // The stills drive the notes through the bubble; keep the settled field to restore afterwards.
      const sim = engine.sim!
      const keep = { x: sim.x.slice(), y: sim.y.slice(), vx: sim.vx.slice(), vy: sim.vy.slice(), rot: sim.rot.slice() }
      for (const p of STILL_POINTS) {
        ancLive.override = p
        updateAncLive(0, window.innerHeight)
        a.gather = ancLive.state.gather
        a.cx = stage.layout.cx
        a.cy = stage.layout.cy
        a.R = stage.layout.rMax * ancLive.state.radius
        engine.prewarm(150)
        stage.update(1 / 60, ancLive.state, 1, 2.5)
        advance(performance.now())
        urls.push(gl.domElement.toDataURL('image/png'))
      }
      setAncStills(urls)
      ancLive.override = null
      updateAncLive(0, window.innerHeight)
      a.gather = 0
      a.R = 0
      sim.x.set(keep.x)
      sim.y.set(keep.y)
      sim.vx.set(keep.vx)
      sim.vy.set(keep.vy)
      sim.rot.set(keep.rot)
      engine.prewarm(0)
      advance(performance.now())
      return
    }
    const tick = (time: number, deltaMs: number) => {
      if (document.hidden || ancLive.frozen) return
      const dt = deltaMs / 1000
      updateAncLive(scrollSignal.y, window.innerHeight)
      if (!anc.current) {
        const st = ScrollTrigger.getById('scene-anc')
        if (st && scrollSignal.y > st.start - window.innerHeight * 2.5) ensureAnc()
      }
      engine.frame(dt)
      if (anc.current && ancLive.active) anc.current.update(Math.min(dt, 0.05), ancLive.state, ancLive.vis, time)
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
      <div id="gl-layer" aria-hidden className="pointer-events-none fixed inset-0 z-0">
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
      <ShakeAndGrain />
      {tier.name !== 'still' && <Cursor />}
      {showDebug && <DebugPanel />}
    </>
  )
}
