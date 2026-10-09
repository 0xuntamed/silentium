/**
 * ANC scene state as a PURE FUNCTION of local scroll progress p ∈ [0, 1].
 * No history, no callbacks — so reverse scroll replays the scene exactly. (Only the ambient noise
 * clock is time-driven, and it is stochastic by nature.)
 */
import { clamp } from '../../lib/math'

const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3)
const easeOutQuad = (t: number) => 1 - Math.pow(1 - clamp(t), 2)
const easeInCubic = (t: number) => Math.pow(clamp(t), 3)
const easeOutBack = (t: number, s = 1.4) => {
  const u = clamp(t) - 1
  return 1 + (s + 1) * u * u * u + s * u * u
}

/** Story beats, as local progress. Mirrored by the DOM timeline in ANC.tsx. */
export const BEATS = {
  chaosEnd: 0.08,
  fitStart: 0.08,
  fitEnd: 0.3,
  click: 0.31,
  engageStart: 0.34,
  engageEnd: 0.62,
  gatherStart: 0.6,
  gatherEnd: 0.74,
  revealStart: 0.8,
  exitStart: 0.86,
} as const

export const DB_START = 86
export const DB_END = 44

export interface AncState {
  /** Headphone seating, 0 = hovering above, 1 = on the head (briefly >1: the press-in overshoot). */
  fit: number
  /** Bell around the "click" moment. */
  click: number
  /** The click ring's travel, 0..1 (starts at the click). */
  clickRing: number
  /** Bubble expansion ease, 0..1. */
  engaged: number
  /** Bubble radius as a fraction of the full radius (grows beyond 1 in the exit). */
  radius: number
  /** Camera shake / grain level, 0..1.5. */
  noise: number
  /** Outside-the-bubble clock speed. */
  timeScale: number
  /** Outside-the-bubble saturation, 1 → ~0.12. */
  sat: number
  /** Ambient level shown on the dB meter. */
  db: number
  /** Opacity of the waveform ribbons. */
  waves: number
  /** 0 = the calm sheaf handed over from the notes system, 1 = fully jagged. */
  corrupt: number
  /** How strongly notes are drawn into the bubble. */
  gather: number
  /** Opacity of the bubble rim (fades as it becomes Spatial's first ring). */
  ring: number
  /** Whole-scene fade at the very end. */
  fade: number
  /** "ANC on" indicator, 0..1. */
  chip: number
}

export function ancAt(p: number): AncState {
  p = clamp(p)
  const fit = p <= BEATS.fitStart ? 0 : easeOutBack((p - BEATS.fitStart) / (BEATS.fitEnd - BEATS.fitStart))
  const click = Math.exp(-Math.pow((p - BEATS.click) / 0.012, 2))
  const clickRing = clamp((p - BEATS.click) / 0.07)
  const engaged = easeOutCubic((p - BEATS.engageStart) / (BEATS.engageEnd - BEATS.engageStart))
  const exit = easeInCubic((p - BEATS.exitStart) / (1 - BEATS.exitStart))
  const base = p < BEATS.engageStart ? 1 : 1 - sm(BEATS.engageStart, 0.6, p)
  const dbT = clamp((p - BEATS.engageStart) / (BEATS.engageEnd - BEATS.engageStart))
  return {
    fit,
    click,
    clickRing,
    engaged,
    radius: engaged * (1 + 1.7 * exit),
    noise: Math.min(1.5, base + 0.9 * click),
    timeScale: 1 - 0.65 * engaged,
    sat: 1 - 0.88 * engaged,
    db: DB_START - (DB_START - DB_END) * easeOutQuad(dbT),
    waves: sm(0, 0.06, p) * (1 - sm(0.93, 1, p)),
    corrupt: sm(0, 0.1, p),
    gather: sm(BEATS.gatherStart, BEATS.gatherEnd, p) * (1 - sm(0.92, 1, p)),
    ring: 1 - sm(0.9, 1, p),
    fade: 1 - sm(0.94, 1, p),
    chip: sm(0.3, 0.34, p),
  }
}

/** Bubble geometry in world units for a given viewport aspect. */
export interface AncLayout {
  /** Head centre. */
  cx: number
  cy: number
  /** Head radius (the figure is authored in head units). */
  head: number
  /** Full bubble radius. */
  rMax: number
  /** Spawn radius for noise (beyond the viewport corners). */
  rs: number
}

export function ancLayout(aspect: number): AncLayout {
  const wide = aspect > 1
  const cx = wide ? aspect * 0.34 : 0
  const cy = wide ? 0.06 : 0.12
  const rMax = Math.min(0.6, (aspect - Math.abs(cx)) * 0.92)
  return { cx, cy, head: rMax * 0.36, rMax, rs: Math.hypot(aspect + 0.4, 1.4) }
}
