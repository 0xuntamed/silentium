/**
 * Spatial-audio maths for the Spatial scene. World space as elsewhere (y up, viewport height = 2);
 * the listener's head sits at `head`, facing +y (the top of the screen), seen from above.
 */
import { clamp } from '../../lib/math'

export interface Vec2 {
  x: number
  y: number
}

export interface SourceReadout {
  /** Degrees, 0 = straight ahead, positive = to the listener's right, ±180 behind. */
  azimuth: number
  /** Metres (world distance × 1.6). */
  distance: number
  /** Equal-power pan law, with a gentle distance roll-off, in dB. */
  leftDb: number
  rightDb: number
  /** Linear gains behind those readings. */
  leftGain: number
  rightGain: number
}

export const WORLD_TO_METRES = 1.6
export const MIN_DISTANCE = 0.28

export function readSource(head: Vec2, src: Vec2): SourceReadout {
  let dx = src.x - head.x
  let dy = src.y - head.y
  let r = Math.hypot(dx, dy)
  if (r < MIN_DISTANCE) {
    // Keep the source out of the listener's skull.
    const k = MIN_DISTANCE / Math.max(r, 1e-6)
    dx = r < 1e-6 ? 0 : dx * k
    dy = r < 1e-6 ? MIN_DISTANCE : dy * k
    r = MIN_DISTANCE
  }
  const az = Math.atan2(dx, dy) // 0 = ahead (+y)
  const pan = Math.sin(az) // −1 left … +1 right
  const theta = ((pan + 1) * Math.PI) / 4
  const att = 1 / (1 + Math.max(0, r - 0.5) * 0.9)
  // A floor keeps the far ear audible: heads shadow sound, they do not delete it.
  const lg = Math.max(Math.cos(theta), 0.16) * att
  const rg = Math.max(Math.sin(theta), 0.16) * att
  const db = (g: number) => 20 * Math.log10(Math.max(g, 1e-4))
  return {
    azimuth: (az * 180) / Math.PI,
    distance: r * WORLD_TO_METRES,
    leftDb: db(lg),
    rightDb: db(rg),
    leftGain: lg,
    rightGain: rg,
  }
}

/** Where the source sits when nobody is steering: a slow, slightly eccentric orbit. */
export function autopilot(t: number, head: Vec2, radius: number): Vec2 {
  const a = t * 0.38
  return { x: head.x + Math.sin(a) * radius * 1.15, y: head.y + Math.cos(a * 0.93 + 0.6) * radius * 0.95 }
}

/** Clamp a pointer-driven source into the playfield around the head. */
export function clampSource(head: Vec2, src: Vec2, aspect: number): Vec2 {
  const x = clamp(src.x, -aspect + 0.08, aspect - 0.08)
  const y = clamp(src.y, -0.92, 0.92)
  return { x, y: Number.isFinite(y) ? y : head.y }
}

/** Layout of the playfield for a viewport aspect: the head sits where the ANC listener did. */
export function spatialLayout(aspect: number): { head: Vec2; headR: number } {
  const wide = aspect > 1
  return { head: { x: wide ? aspect * 0.34 : 0, y: wide ? 0.04 : 0.1 }, headR: wide ? 0.17 : 0.13 }
}

export const formatDb = (v: number) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)} dB`
