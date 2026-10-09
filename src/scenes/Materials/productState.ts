/**
 * SILENTIUM One's transform in the two scenes that show it, as PURE FUNCTIONS of local progress:
 *   hero      — rises from behind the wordmark, turns to a clean side profile, lifts away
 *   materials — assembles from 24 floating parts, turns 360°, then fades
 */
import { clamp } from '../../lib/math'

const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3)
const easeInCubic = (t: number) => Math.pow(clamp(t), 3)

export interface ProductState {
  /** 0..1 opacity of the whole model. */
  vis: number
  /** World offset from the stage anchor. */
  x: number
  y: number
  /** Uniform scale. */
  scale: number
  rotX: number
  rotY: number
  /** 0 = assembled, 1 = fully exploded. */
  explode: number
}

export const OFF: ProductState = { vis: 0, x: 0, y: 0, scale: 1, rotX: 0, rotY: 0, explode: 0 }

export function heroProduct(p: number): ProductState {
  p = clamp(p)
  const rise = easeOutCubic(sm(0.1, 0.52, p))
  const lift = easeInCubic(sm(0.74, 1, p))
  return {
    vis: sm(0.1, 0.3, p) * (1 - sm(0.86, 0.98, p)),
    x: 0,
    y: -1.0 + 1.05 * rise + 1.5 * lift,
    scale: 0.82,
    rotX: 0.12,
    // A three-quarter view with both cups and the band arc visible reads better than a true profile.
    rotY: -0.5 + 1.35 * easeInOut(sm(0.14, 0.62, p)),
    explode: 0,
  }
}

/** The beats of the exploded view, as local progress. */
export const MAT = {
  appear: [0.04, 0.14],
  assemble: [0.12, 0.6],
  spin: [0.62, 0.84],
  exit: [0.9, 1],
} as const

export function materialsProduct(p: number): ProductState {
  p = clamp(p)
  const spin = easeInOut(sm(MAT.spin[0], MAT.spin[1], p))
  return {
    vis: sm(MAT.appear[0], MAT.appear[1], p) * (1 - sm(MAT.exit[0], MAT.exit[1], p)),
    x: 0,
    y: 0,
    scale: 0.7 + 0.1 * sm(MAT.appear[0], MAT.appear[1], p),
    rotX: 0.3,
    rotY: -0.62 + Math.PI * 2 * spin,
    explode: 1 - easeInOut(sm(MAT.assemble[0], MAT.assemble[1], p)),
  }
}

/** Per-part progress u ∈ [0,1] for the assembly: part k of n locks in during its own slice of `assemble`. */
export function partProgress(assembled: number, order: number, n: number): number {
  const slice = 0.34
  const start = (order / Math.max(1, n - 1)) * (1 - slice)
  return sm(start, start + slice, assembled)
}

/** Layout of the model on screen. Desktop keeps the copy column free on the left. */
export function productAnchor(aspect: number): { x: number; y: number; k: number } {
  const wide = aspect > 1
  return wide ? { x: aspect * 0.2, y: 0.02, k: 1 } : { x: 0, y: -0.2, k: Math.min(1, aspect / 0.9) * 0.86 }
}
