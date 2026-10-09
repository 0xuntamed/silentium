/**
 * NotesSim — the CPU side of the musical-notes system. Structure-of-arrays typed arrays, no DOM,
 * no three.js, so it is deterministic and unit-testable. The renderer only reads the output buffers.
 *
 * World space: y ∈ [-1, 1] (viewport height = 2), x ∈ [-aspect, aspect], y up.
 *
 * Particle order (so one instanced draw covers WebGL and the 2D overlay takes the tail):
 *   [far notes][mid notes][dashes][near notes]
 */
import { clamp, lerp } from '../../lib/math'
import { Formations } from './formations'
import type { Weights } from './conductor'

export const LAYER_FAR = 0
export const LAYER_MID = 1
export const LAYER_NEAR = 2
/** Parallax: how much of the page scroll each layer follows. Near sits "in front" of the page. */
export const DEPTH = [0.12, 0.35, 1.15] as const

export const GLYPH_COUNT = 7 // 0..6 are notes/accidentals; 7 is the dash sprite
export const GLYPH_DASH = 7

export interface SimConfig {
  notes: number
  dashes: number
  near: number
  aspect: number
  cursorForces: boolean
  seed?: number
}

export interface SimInputs {
  /** Seconds, monotonic. */
  t: number
  /** Signed scroll velocity in px/s (positive = scrolling down). */
  scrollVelPx: number
  viewportH: number
  cursor: { x: number; y: number; speed: number; active: boolean }
  weights: Weights
}

/** Output buffers, 4/4/2 floats per particle: (x, y, rot, glyph), (sx, sy, alpha, tint), (vx, vy). */
export interface RenderBuffers {
  a: Float32Array
  b: Float32Array
  v: Float32Array
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MARGIN = 0.22

/** Analytic curl-noise: a divergence-free flow from a streamfunction of drifting sines. */
export function curl(x: number, y: number, t: number, out: [number, number]) {
  const a1 = 1.7 * x + 0.31 * t
  const b1 = 1.3 * y - 0.27 * t
  const a2 = 3.1 * x - 0.43 * t + 1.3
  const b2 = 2.7 * y + 0.37 * t
  const sa1 = Math.sin(a1)
  const ca1 = Math.cos(a1)
  const sb1 = Math.sin(b1)
  const cb1 = Math.cos(b1)
  const sa2 = Math.sin(a2)
  const ca2 = Math.cos(a2)
  const sb2 = Math.sin(b2)
  const cb2 = Math.cos(b2)
  // ψ = sin(a1)cos(b1) + 0.6 sin(a2) sin(b2);  v = (∂ψ/∂y, −∂ψ/∂x)
  const dpsidx = 1.7 * ca1 * cb1 + 0.6 * 3.1 * ca2 * sb2
  const dpsidy = -1.3 * sa1 * sb1 + 0.6 * 2.7 * sa2 * cb2
  out[0] = dpsidy
  out[1] = -dpsidx
}

/** The curl field baked on a coarse grid (refreshed at 20 Hz) so each particle pays a bilinear lookup, not 8 trig calls. */
class FlowGrid {
  readonly cols = 56
  readonly rows = 32
  readonly gx = new Float32Array(this.cols * this.rows)
  readonly gy = new Float32Array(this.cols * this.rows)
  private lastT = -1
  private tmp: [number, number] = [0, 0]

  update(t: number, hx: number, hy: number) {
    if (this.lastT >= 0 && t - this.lastT < 0.05 && t >= this.lastT) return
    this.lastT = t
    for (let j = 0; j < this.rows; j++) {
      const y = -hy + (j / (this.rows - 1)) * 2 * hy
      for (let i = 0; i < this.cols; i++) {
        const x = -hx + (i / (this.cols - 1)) * 2 * hx
        curl(x, y, t, this.tmp)
        this.gx[j * this.cols + i] = this.tmp[0]
        this.gy[j * this.cols + i] = this.tmp[1]
      }
    }
  }

  /** Bilinear sample; result is (this.ox, this.oy). */
  ox = 0
  oy = 0
  sample(x: number, y: number, hx: number, hy: number) {
    let u = ((x + hx) / (2 * hx)) * (this.cols - 1)
    let v = ((y + hy) / (2 * hy)) * (this.rows - 1)
    u = u < 0 ? 0 : u > this.cols - 1.001 ? this.cols - 1.001 : u
    v = v < 0 ? 0 : v > this.rows - 1.001 ? this.rows - 1.001 : v
    const i0 = u | 0
    const j0 = v | 0
    const fu = u - i0
    const fv = v - j0
    const k = j0 * this.cols + i0
    const k2 = k + this.cols
    const w00 = (1 - fu) * (1 - fv)
    const w10 = fu * (1 - fv)
    const w01 = (1 - fu) * fv
    const w11 = fu * fv
    this.ox = this.gx[k] * w00 + this.gx[k + 1] * w10 + this.gx[k2] * w01 + this.gx[k2 + 1] * w11
    this.oy = this.gy[k] * w00 + this.gy[k + 1] * w10 + this.gy[k2] * w01 + this.gy[k2 + 1] * w11
  }
}

const FLOW_SPEED = [0.03, 0.045, 0.085]

export class NotesSim {
  readonly n: number
  readonly nearStart: number
  readonly cfg: SimConfig

  readonly x: Float32Array
  readonly y: Float32Array
  readonly vx: Float32Array
  readonly vy: Float32Array
  readonly rot: Float32Array
  readonly rotV: Float32Array
  readonly seed: Float32Array
  readonly rank: Float32Array
  readonly layer: Uint8Array
  readonly glyph: Uint8Array
  readonly kind: Uint8Array // 0 note, 1 dash
  readonly baseSize: Float32Array
  readonly baseAlpha: Float32Array
  /** For dashes: index into the formation arrays; −1 otherwise. */
  readonly dashIndex: Int32Array
  /** For motif notes: slot in Formations.motif; −1 otherwise. */
  readonly motifSlot: Int8Array

  readonly render: RenderBuffers
  aspect: number
  formations: Formations
  /** 0..1 — fraction of particles kept alive. The frame-rate governor lowers it. */
  activeFrac = 1

  private rng: () => number
  private flow = new FlowGrid()
  private waveTmp = new Float64Array(3)

  constructor(cfg: SimConfig) {
    this.cfg = cfg
    this.aspect = cfg.aspect
    this.rng = mulberry32(cfg.seed ?? 7)
    const near = Math.min(cfg.near, cfg.notes)
    const notes = cfg.notes - near
    const far = Math.round(notes * 0.55)
    const mid = notes - far
    this.n = cfg.notes + cfg.dashes
    this.nearStart = far + mid + cfg.dashes

    const n = this.n
    this.x = new Float32Array(n)
    this.y = new Float32Array(n)
    this.vx = new Float32Array(n)
    this.vy = new Float32Array(n)
    this.rot = new Float32Array(n)
    this.rotV = new Float32Array(n)
    this.seed = new Float32Array(n)
    this.rank = new Float32Array(n)
    this.layer = new Uint8Array(n)
    this.glyph = new Uint8Array(n)
    this.kind = new Uint8Array(n)
    this.baseSize = new Float32Array(n)
    this.baseAlpha = new Float32Array(n)
    this.dashIndex = new Int32Array(n).fill(-1)
    this.motifSlot = new Int8Array(n).fill(-1)
    this.render = { a: new Float32Array(n * 4), b: new Float32Array(n * 4), v: new Float32Array(n * 2) }
    this.formations = new Formations(cfg.aspect, cfg.dashes)

    const rnd = this.rng
    const glyphBag = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5, 6]
    let i = 0
    const place = (layer: number, kind: number) => {
      this.layer[i] = layer
      this.kind[i] = kind
      this.seed[i] = rnd()
      this.rank[i] = rnd()
      this.x[i] = (rnd() * 2 - 1) * (cfg.aspect + MARGIN)
      this.y[i] = (rnd() * 2 - 1) * (1 + MARGIN)
      this.vx[i] = (rnd() - 0.5) * 0.05
      this.vy[i] = (rnd() - 0.5) * 0.05
      if (kind === 0) {
        this.glyph[i] = glyphBag[Math.floor(rnd() * glyphBag.length)]
        this.rot[i] = (rnd() - 0.5) * 0.9
        this.rotV[i] = (rnd() - 0.5) * 0.25
        const sz = [0.034, 0.052, 0.15][layer] * (0.8 + rnd() * 0.45)
        this.baseSize[i] = sz
        this.baseAlpha[i] = [0.2, 0.38, 0.2][layer] * (0.7 + rnd() * 0.3)
      } else {
        this.glyph[i] = GLYPH_DASH
        this.baseSize[i] = 0.008
        this.baseAlpha[i] = 0.22
      }
      i++
    }
    for (let k = 0; k < far; k++) place(LAYER_FAR, 0)
    for (let k = 0; k < mid; k++) place(LAYER_MID, 0)
    for (let k = 0; k < cfg.dashes; k++) {
      this.dashIndex[i] = k
      place(LAYER_MID, 1)
    }
    for (let k = 0; k < near; k++) place(LAYER_NEAR, 0)

    // The first few mid-layer notes are the "Silentium motif": they land on the staff.
    const motifN = Math.min(this.formations.motif.length, mid)
    for (let k = 0; k < motifN; k++) {
      const idx = far + k
      this.motifSlot[idx] = k
      this.layer[idx] = LAYER_MID
      this.rank[idx] = 0 // never culled by the governor
      this.baseSize[idx] = 0.07
      this.baseAlpha[idx] = 0.95
    }
  }

  /** Re-fit to a new viewport aspect: rescale positions and rebuild formation targets. */
  setAspect(aspect: number) {
    if (Math.abs(aspect - this.aspect) < 1e-4) return
    const f = aspect / this.aspect
    for (let i = 0; i < this.n; i++) this.x[i] *= f
    this.aspect = aspect
    this.formations = new Formations(aspect, this.cfg.dashes)
  }

  /** Throw `count` random notes outward from a point (used by the intro bloom and the debug panel). */
  burst(cx: number, cy: number, count: number, speed: number) {
    const rnd = this.rng
    const total = this.nearStart
    for (let k = 0; k < count; k++) {
      const i = Math.floor(rnd() * total)
      if (this.kind[i] !== 0 || this.motifSlot[i] >= 0) continue
      const a = rnd() * Math.PI * 2
      const s = speed * (0.35 + rnd() * 0.9) * (0.6 + this.layer[i] * 0.5)
      this.x[i] = cx
      this.y[i] = cy
      this.vx[i] = Math.cos(a) * s
      this.vy[i] = Math.sin(a) * s
    }
  }

  step(dt: number, inp: SimInputs) {
    const { weights: W, cursor } = inp
    const wsum = W.staff + W.wave + W.outline + W.cable
    const Wg = clamp(wsum)
    const inv = wsum > 1e-4 ? 1 / wsum : 0
    const F = this.formations
    const flow = this.flow
    const waveTmp = this.waveTmp
    const worldPerPx = 2 / Math.max(inp.viewportH, 1)
    const scrollV = clamp(inp.scrollVelPx * worldPerPx, -9, 9)
    const hx = this.aspect + MARGIN
    const hy = 1 + MARGIN
    const t = inp.t
    const cursorOn = cursor.active && this.cfg.cursorForces
    const mv = clamp(cursor.speed / 1.4)
    const relax = 1.3
    const useWave = W.wave > 0.002
    flow.update(t, hx, hy)

    for (let i = 0; i < this.n; i++) {
      if (this.rank[i] > this.activeFrac) continue
      const layer = this.layer[i]
      const depth = DEPTH[layer]
      const isDash = this.kind[i] === 1
      const dIdx = this.dashIndex[i]
      const mSlot = this.motifSlot[i]
      let x = this.x[i]
      let y = this.y[i]
      let vx = this.vx[i]
      let vy = this.vy[i]

      // How strongly this particle is held by a formation (0 free … 1 locked on).
      let hold = 0
      let tx = 0
      let ty = 0
      let tAng = 0
      if (isDash && wsum > 1e-4) {
        hold = Wg
        let sx = 0
        let sy = 0
        let c = 0
        let s = 0
        if (W.staff > 0) {
          sx += W.staff * F.staffX[dIdx]
          sy += W.staff * F.staffY[dIdx]
          c += W.staff
        }
        if (useWave) {
          F.waveInto(dIdx, t, waveTmp)
          sx += W.wave * waveTmp[0]
          sy += W.wave * waveTmp[1]
          c += W.wave * Math.cos(waveTmp[2])
          s += W.wave * Math.sin(waveTmp[2])
        }
        if (W.outline > 0) {
          sx += W.outline * F.outline.x[dIdx]
          sy += W.outline * F.outline.y[dIdx]
          c += W.outline * Math.cos(F.outline.angle[dIdx])
          s += W.outline * Math.sin(F.outline.angle[dIdx])
        }
        if (W.cable > 0) {
          sx += W.cable * F.cable.x[dIdx]
          sy += W.cable * F.cable.y[dIdx]
          c += W.cable * Math.cos(F.cable.angle[dIdx])
          s += W.cable * Math.sin(F.cable.angle[dIdx])
        }
        tx = sx * inv
        ty = sy * inv
        tAng = Math.atan2(s, c)
      } else if (mSlot >= 0 && W.staff > 1e-3) {
        hold = clamp(W.staff)
        tx = F.motif[mSlot].x
        ty = F.motif[mSlot].y
      }

      const free = 1 - hold
      let ax = 0
      let ay = 0

      // Ambient drift: a slow curl field, faster on the near layer.
      flow.sample(x, y, hx, hy)
      const fs = FLOW_SPEED[layer]
      ax += (flow.ox * fs - vx) * relax * free
      ay += (flow.oy * fs - vy) * relax * free

      // Scroll: stream with the page (parallax) and carry a little momentum, so they settle after.
      y += scrollV * depth * free * dt
      ay += scrollV * depth * 0.55 * free

      // Cursor as a sound source: ripples while it moves, orbit when it rests.
      if (cursorOn) {
        const dx = x - cursor.x
        const dy = y - cursor.y
        const r2 = dx * dx + dy * dy
        if (r2 < 0.36) {
          const r = Math.sqrt(r2) + 1e-4
          const fall = Math.exp(-r / 0.16) * (0.12 + 0.88 * free)
          const nx = dx / r
          const ny = dy / r
          const ripple = 5.5 * Math.sin(20 * r - 9 * t) * fall * mv * (0.6 + depth)
          const orbit = 1.1 * fall * (1 - mv) * (0.5 + depth)
          // Orbit swirls tangentially and pulls slightly inward so notes circle the cursor instead of being flung out.
          ax += nx * (ripple - orbit * 0.9) - ny * orbit
          ay += ny * (ripple - orbit * 0.9) + nx * orbit
        }
      }

      // Formation spring (staggered per particle so they arrive like a flock, not a sheet).
      if (hold > 0) {
        const gain = hold * (0.55 + 0.9 * this.seed[i])
        const ks = 60 * gain
        const kd = 2 * Math.sqrt(ks) * 0.85
        ax += ks * (tx - x) - kd * vx
        ay += ks * (ty - y) - kd * vy
      }

      vx += ax * dt
      vy += ay * dt
      x += vx * dt
      y += vy * dt

      // Wrap the free field; formation members stay put.
      if (x > hx) x -= 2 * hx
      else if (x < -hx) x += 2 * hx
      if (y > hy) y -= 2 * hy
      else if (y < -hy) y += 2 * hy

      this.x[i] = x
      this.y[i] = y
      this.vx[i] = vx
      this.vy[i] = vy

      if (isDash) this.rot[i] = hold > 0.01 ? tAng * hold : 0
      else this.rot[i] += this.rotV[i] * dt * free
    }
  }

  /** Fill the render buffers. Apparent velocity includes parallax drift so scroll streaks read. */
  write(inp: SimInputs, cursorX: number) {
    const { a, b, v } = this.render
    const W = inp.weights
    const Wg = clamp(W.staff + W.wave + W.outline + W.cable)
    const worldPerPx = 2 / Math.max(inp.viewportH, 1)
    const scrollV = clamp(inp.scrollVelPx * worldPerPx, -9, 9)
    const beat = 0.5 + 0.5 * Math.cos(inp.t * Math.PI * 2) // 1 Hz heartbeat

    for (let i = 0; i < this.n; i++) {
      const o4 = i * 4
      const o2 = i * 2
      if (this.rank[i] > this.activeFrac) {
        b[o4 + 2] = 0
        continue
      }
      const layer = this.layer[i]
      const isDash = this.kind[i] === 1
      const mSlot = this.motifSlot[i]
      const hold = isDash ? Wg : mSlot >= 0 ? clamp(W.staff) : 0
      const free = 1 - hold

      a[o4] = this.x[i] + cursorX * DEPTH[layer] * 0.05
      a[o4 + 1] = this.y[i]
      a[o4 + 2] = this.rot[i]
      a[o4 + 3] = this.glyph[i]

      if (isDash) {
        b[o4] = lerp(0.008, 0.026, Wg)
        b[o4 + 1] = lerp(0.0034, 0.0058, Wg)
        b[o4 + 2] = lerp(0.2, 0.7, Wg)
        b[o4 + 3] = 0.45
      } else {
        const recede = mSlot >= 0 ? 1 : 1 - 0.8 * Wg
        const sz = this.baseSize[i]
        b[o4] = sz
        b[o4 + 1] = sz
        b[o4 + 2] = this.baseAlpha[i] * recede * (1 + (mSlot >= 0 ? 0.12 * beat : 0))
        b[o4 + 3] = this.seed[i] * 0.5
      }
      v[o2] = this.vx[i]
      v[o2 + 1] = this.vy[i] + scrollV * DEPTH[layer] * free
    }
  }

  /** Mean distance of dashes to the supplied targets — used by tests. */
  meanDashError(tx: Float32Array, ty: Float32Array): number {
    let sum = 0
    let c = 0
    for (let i = 0; i < this.n; i++) {
      const d = this.dashIndex[i]
      if (d < 0) continue
      sum += Math.hypot(this.x[i] - tx[d], this.y[i] - ty[d])
      c++
    }
    return c ? sum / c : 0
  }
}
