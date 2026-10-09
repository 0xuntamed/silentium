/**
 * Formation targets for the notes system: where the "dash" particles go when they gather into
 * a staff, bend into a waveform, trace the product outline, or draw the earbud cable.
 * Pure maths (no DOM, no three) so it can be unit-tested.
 *
 * World space: y ∈ [-1, 1] (viewport height = 2), x ∈ [-aspect, aspect], y up.
 */

export type Pt = readonly [number, number]
/** A cubic bézier: start, c1, c2, end. */
export type Cubic = readonly [Pt, Pt, Pt, Pt]

const K = 0.5522847498 // circle → cubic bézier constant

export function ellipse(cx: number, cy: number, rx: number, ry: number): Cubic[] {
  return [
    [[cx + rx, cy], [cx + rx, cy + K * ry], [cx + K * rx, cy + ry], [cx, cy + ry]],
    [[cx, cy + ry], [cx - K * rx, cy + ry], [cx - rx, cy + K * ry], [cx - rx, cy]],
    [[cx - rx, cy], [cx - rx, cy - K * ry], [cx - K * rx, cy - ry], [cx, cy - ry]],
    [[cx, cy - ry], [cx + K * rx, cy - ry], [cx + rx, cy - K * ry], [cx + rx, cy]],
  ]
}

const cubicAt = (c: Cubic, t: number): Pt => {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const d = 3 * u * t * t
  const e = t * t * t
  return [
    a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0],
    a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1],
  ]
}

export interface Sampled {
  x: Float32Array
  y: Float32Array
  /** Tangent angle (radians) at each point. */
  angle: Float32Array
}

/** Distribute `n` points evenly by arc length along a chain of cubics (flattened, then walked). */
export function samplePath(path: Cubic[], n: number, steps = 28): Sampled {
  const pts: Pt[] = []
  for (const c of path) for (let i = 0; i < steps; i++) pts.push(cubicAt(c, i / steps))
  const last = path[path.length - 1]
  pts.push(last[3])

  const cum = new Float32Array(pts.length)
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  }
  const total = cum[cum.length - 1]

  const out: Sampled = { x: new Float32Array(n), y: new Float32Array(n), angle: new Float32Array(n) }
  let seg = 1
  for (let i = 0; i < n; i++) {
    const d = (i / n) * total
    while (seg < cum.length - 1 && cum[seg] < d) seg++
    const span = cum[seg] - cum[seg - 1] || 1
    const f = (d - cum[seg - 1]) / span
    const a = pts[seg - 1]
    const b = pts[seg]
    out.x[i] = a[0] + (b[0] - a[0]) * f
    out.y[i] = a[1] + (b[1] - a[1]) * f
    out.angle[i] = Math.atan2(b[1] - a[1], b[0] - a[0])
  }
  return out
}

/** Sample several closed/open sub-paths, giving each a share of `n` proportional to its length. */
export function sampleMany(paths: Cubic[][], n: number): Sampled {
  const lens = paths.map((p) => {
    const s = samplePath(p, 400)
    let l = 0
    for (let i = 1; i < 400; i++) l += Math.hypot(s.x[i] - s.x[i - 1], s.y[i] - s.y[i - 1])
    return l
  })
  const total = lens.reduce((a, b) => a + b, 0)
  const out: Sampled = { x: new Float32Array(n), y: new Float32Array(n), angle: new Float32Array(n) }
  let o = 0
  paths.forEach((p, k) => {
    const count = k === paths.length - 1 ? n - o : Math.round((lens[k] / total) * n)
    const s = samplePath(p, Math.max(count, 2))
    for (let i = 0; i < count && o < n; i++, o++) {
      out.x[o] = s.x[i]
      out.y[o] = s.y[i]
      out.angle[o] = s.angle[i]
    }
  })
  return out
}

/** SILENTIUM One, front view: band, inner band, two cups with cushions. Unit ≈ viewport half-height. */
export function headphoneOutline(scale = 0.9): Cubic[][] {
  const s = (c: Cubic[]): Cubic[] => c.map((seg) => seg.map(([x, y]) => [x * scale, y * scale]) as unknown as Cubic)
  const band: Cubic[] = [
    [[-0.5, -0.05], [-0.5, 0.4], [-0.3, 0.66], [0, 0.66]],
    [[0, 0.66], [0.3, 0.66], [0.5, 0.4], [0.5, -0.05]],
  ]
  const bandInner: Cubic[] = [
    [[-0.4, -0.05], [-0.4, 0.32], [-0.23, 0.53], [0, 0.53]],
    [[0, 0.53], [0.23, 0.53], [0.4, 0.32], [0.4, -0.05]],
  ]
  return [
    s(band),
    s(bandInner),
    s(ellipse(-0.47, -0.2, 0.14, 0.26)),
    s(ellipse(-0.43, -0.2, 0.09, 0.17)),
    s(ellipse(0.47, -0.2, 0.14, 0.26)),
    s(ellipse(0.43, -0.2, 0.09, 0.17)),
  ]
}

/** The earbud cable: an S-curve across the viewport ending in a bud. Spans the viewport width. */
export function earbudCable(aspect: number): Cubic[][] {
  const w = aspect
  const run: Cubic[] = [
    [[-w * 1.02, 0.34], [-w * 0.6, 0.34], [-w * 0.5, -0.3], [-w * 0.1, -0.3]],
    [[-w * 0.1, -0.3], [w * 0.22, -0.3], [w * 0.2, 0.18], [w * 0.46, 0.18]],
  ]
  const stem: Cubic[] = [[[w * 0.46, 0.18], [w * 0.52, 0.18], [w * 0.55, 0.12], [w * 0.56, 0.02]]]
  return [run, stem, ellipse(w * 0.575, -0.06, 0.055, 0.11)]
}

export const STAFF_LINES = 5
export const STAFF_SPACING = 0.085
export const STAFF_WAVE_AMP = 0.14

export interface MotifNote {
  x: number
  y: number
  glyph: number
}

export class Formations {
  readonly aspect: number
  readonly nDash: number
  readonly staffX: Float32Array
  readonly staffY: Float32Array
  readonly staffLine: Uint8Array
  /** Per-dash waveform envelope (static) and spatial frequency. */
  readonly waveEnv: Float32Array
  readonly waveK: number
  readonly outline: Sampled
  readonly cable: Sampled
  readonly motif: MotifNote[]
  /** Half-length of the staff in world units. */
  readonly staffHalf: number

  constructor(aspect: number, nDash: number) {
    this.aspect = aspect
    this.nDash = nDash
    this.staffHalf = aspect * 0.88

    this.staffX = new Float32Array(nDash)
    this.staffY = new Float32Array(nDash)
    this.staffLine = new Uint8Array(nDash)
    this.waveEnv = new Float32Array(nDash)
    this.waveK = 4.2 / Math.max(aspect, 0.6)
    const perLine = Math.ceil(nDash / STAFF_LINES)
    for (let i = 0; i < nDash; i++) {
      const line = i % STAFF_LINES
      const k = Math.floor(i / STAFF_LINES)
      this.staffLine[i] = line
      this.staffX[i] = -this.staffHalf + ((k + 0.5) / perLine) * 2 * this.staffHalf
      this.staffY[i] = (line - (STAFF_LINES - 1) / 2) * STAFF_SPACING
      this.waveEnv[i] = Math.exp(-Math.pow(this.staffX[i] / (this.staffHalf * 1.15), 2)) * 0.7 + 0.3
    }

    const fit = Math.min(1, aspect / 1.15) // keep the outline inside narrow portrait screens
    this.outline = sampleMany(headphoneOutline(0.95 * Math.max(fit, 0.55)), nDash)
    this.cable = sampleMany(earbudCable(aspect), nDash)

    // The four-note "Silentium motif" lands on the staff (x spread, y on lines/spaces).
    const h = STAFF_SPACING / 2
    const xs = [-0.62, -0.2, 0.22, 0.64].map((f) => f * this.staffHalf)
    const ys = [-h, h * 2, 0, h * 3]
    this.motif = xs.map((x, i) => ({ x, y: ys[i], glyph: [0, 1, 0, 2][i] }))
  }
  /** Waveform target written into out as (x, y, tangent angle). Allocation-free: called per dash per frame. */
  waveInto(i: number, t: number, out: Float64Array, amp = STAFF_WAVE_AMP) {
    const x = this.staffX[i]
    const env = this.waveEnv[i]
    const k = this.waveK
    const arg = x * k + t * 1.4 + this.staffLine[i] * 0.55
    out[0] = x
    out[1] = this.staffY[i] + amp * env * Math.sin(arg)
    out[2] = Math.atan(amp * env * k * Math.cos(arg))
  }

  /** Convenience wrapper for tests/tools. */
  wave(i: number, t: number, amp = STAFF_WAVE_AMP): [number, number, number] {
    const o = new Float64Array(3)
    this.waveInto(i, t, o, amp)
    return [o[0], o[1], o[2]]
  }
}
