import { NotesSim, type SimInputs } from './sim'
import { conductor, stepConductor } from './conductor'
import { scrollCues } from './scrollCues'
import { scrollSignal } from '../../lib/scroll'
import { cursorSignal, tickCursor } from '../cursor/cursorSignal'
import type { Tier } from '../../lib/tier'
import { ancLive } from '../../scenes/ANC/live'
import { bloom } from './bloom'
import { ancLayout } from '../../scenes/ANC/state'
import { productLive } from '../../scenes/Materials/live'
import { getRouter } from '../../lib/router'
import { viewLive } from '../../scenes/Product/viewLive'
import { spatialLive } from '../../scenes/Spatial/live'

/**
 * The notes engine: owns the sim and runs it once per shared-ticker frame.
 * Renderers (WebGL mesh, 2D near-layer) subscribe with `onFrame` and read the sim's buffers.
 */
class NotesEngine {
  sim: NotesSim | null = null
  tier: Tier | null = null
  t = 0
  viewportW = 1
  viewportH = 1
  readonly inputs: SimInputs = {
    t: 0,
    scrollVelPx: 0,
    viewportH: 1,
    cursor: { x: 0, y: 0, speed: 0, active: false },
    weights: conductor.weights,
    anc: { gather: 0, cx: 0, cy: 0, R: 0 },
  }
  readonly stats = { simMs: 0, writeMs: 0, frames: 0, avgFrameMs: 16.7 }
  private listeners = new Set<(sim: NotesSim) => void>()
  private governorOn = true
  private slowFrames = 0

  create(tier: Tier, w: number, h: number) {
    this.tier = tier
    this.viewportW = w
    this.viewportH = h
    this.sim = new NotesSim({
      notes: tier.notes,
      dashes: tier.dashes,
      near: tier.near,
      aspect: w / h,
      cursorForces: tier.cursorForces,
    })
    // Headless browsers render in software; never let the governor thin the field there.
    this.governorOn = !navigator.webdriver
    return this.sim
  }

  resize(w: number, h: number) {
    this.viewportW = w
    this.viewportH = h
    this.sim?.setAspect(w / h)
  }

  onFrame(cb: (sim: NotesSim) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Run the sim N steps with no input (used to give the reduced-motion still a settled field). */
  prewarm(steps: number) {
    const sim = this.sim!
    const inp = this.inputs
    inp.viewportH = this.viewportH
    for (let k = 0; k < steps; k++) {
      inp.t = k / 60
      sim.step(1 / 60, inp)
    }
    this.t = steps / 60
    inp.t = this.t
    sim.write(inp, 0)
    this.listeners.forEach((cb) => cb(sim))
  }

  frame(dt: number) {
    const sim = this.sim
    if (!sim) return
    dt = Math.min(dt, 1 / 20)
    if (bloom.pending) {
      const b = bloom.pending
      bloom.pending = null
      if (performance.now() - b.t < 6000) {
        // The intro's first input: a burst of notes from the dot (high velocity = long streaks).
        sim.burst((b.x / this.viewportW - 0.5) * 2 * sim.aspect, -(b.y / this.viewportH - 0.5) * 2, 1300, 3.6)
      }
    }
    this.t += dt
    tickCursor(dt)
    stepConductor(dt, scrollCues, scrollSignal.y)

    const inp = this.inputs
    const H = this.viewportH
    inp.t = this.t
    inp.viewportH = H
    inp.scrollVelPx = scrollSignal.velocity
    inp.cursor.active = cursorSignal.active && cursorSignal.pointerType !== 'touch'
    inp.cursor.x = (cursorSignal.x / this.viewportW - 0.5) * 2 * sim.aspect
    inp.cursor.y = -(cursorSignal.y / H - 0.5) * 2
    inp.cursor.speed = cursorSignal.speed * (2 / H)

    // Reading pages (product, compare): keep the notes, but quieter than the copy.
    inp.dim = Math.max(getRouter().path === '/' ? 0 : 1, productLive.state.vis, viewLive.state.vis * 0.8, spatialLive.active ? spatialLive.vis * 0.7 : 0)
    const lay = ancLayout(sim.aspect)
    const a = inp.anc!
    a.gather = ancLive.state.gather * ancLive.vis
    a.cx = lay.cx
    a.cy = lay.cy
    a.R = lay.rMax * ancLive.state.radius

    const t0 = performance.now()
    sim.step(dt, inp)
    const t1 = performance.now()
    sim.write(inp, inp.cursor.active ? inp.cursor.x : 0)
    const t2 = performance.now()
    this.listeners.forEach((cb) => cb(sim))

    const s = this.stats
    s.frames++
    s.simMs += (t1 - t0 - s.simMs) * 0.05
    s.writeMs += (t2 - t1 - s.writeMs) * 0.05
    s.avgFrameMs += (dt * 1000 - s.avgFrameMs) * 0.05
    this.govern()
  }

  /** Frame-rate governor: if we're persistently slow, keep fewer particles alive. */
  private govern() {
    const sim = this.sim!
    if (!this.governorOn || this.stats.frames < 120) return
    if (this.stats.avgFrameMs > 24 && sim.activeFrac > 0.4) {
      if (++this.slowFrames > 90) {
        sim.activeFrac = Math.max(0.4, sim.activeFrac * 0.8)
        this.slowFrames = 0
      }
    } else this.slowFrames = 0
  }
}

export const engine = new NotesEngine()
