/**
 * The conductor turns "where are we on the page" into formation weights:
 *   staff · wave · outline · cable  (each 0..1)
 * The particle system only ever reads `conductor.weights`; scenes and the debug panel write them.
 */
import { clamp } from '../../lib/math'

export interface Weights {
  staff: number
  wave: number
  outline: number
  cable: number
}

export const ZERO: Weights = { staff: 0, wave: 0, outline: 0, cable: 0 }
export const WEIGHT_KEYS: (keyof Weights)[] = ['staff', 'wave', 'outline', 'cable']

export interface Cue {
  /** Position on the axis (scroll px, or 0..1 for the debug program). */
  at: number
  w: Partial<Weights>
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Interpolate weights between sorted cues with a smoothstep. Outside the range, the end cues hold. */
export function weightsAt(cues: Cue[], at: number, out: Weights = { ...ZERO }): Weights {
  if (cues.length === 0) return Object.assign(out, ZERO)
  let i = 0
  while (i < cues.length - 1 && cues[i + 1].at <= at) i++
  const a = cues[i]
  const b = cues[Math.min(i + 1, cues.length - 1)]
  const f = b.at === a.at ? 0 : smooth(clamp((at - a.at) / (b.at - a.at)))
  for (const k of WEIGHT_KEYS) {
    const wa = a.w[k] ?? 0
    const wb = b.w[k] ?? 0
    out[k] = wa + (wb - wa) * f
  }
  return out
}

/** The debug "program": free → staff → wave → outline → cable, scrubbed 0..1. */
export const PROGRAM: Cue[] = [
  { at: 0.0, w: {} },
  { at: 0.08, w: {} },
  { at: 0.22, w: { staff: 1 } },
  { at: 0.3, w: { staff: 1 } },
  { at: 0.42, w: { wave: 1 } },
  { at: 0.5, w: { wave: 1 } },
  { at: 0.62, w: { outline: 1 } },
  { at: 0.7, w: { outline: 1 } },
  { at: 0.84, w: { cable: 1 } },
  { at: 1.0, w: { cable: 1 } },
]

export const conductor = {
  /** What the particles actually follow (eased toward `target`). */
  weights: { ...ZERO } as Weights,
  /** What the page/debug panel asks for. */
  target: { ...ZERO } as Weights,
  /** Debug override: when set, scroll cues are ignored. */
  program: null as number | null,
}

export function setProgram(p: number | null) {
  conductor.program = p
}

/**
 * Where the scroll-driven cues sit, as page positions. Resolved after ScrollTrigger refreshes.
 * Each entry is [scene, local progress, weights]; unpinned sections use element rects.
 */
export type CueSpec = [scene: string, p: number, w: Partial<Weights>]

export const SCROLL_CUES: CueSpec[] = [
  ['hero', 0.62, {}],
  ['hero', 0.95, { staff: 1 }],
  ['anc', 0.0, { wave: 1 }],
  ['anc', 0.08, {}],
  ['spatial', 0.9, {}],
  ['materials', 0.03, { outline: 1 }],
  ['materials', 0.14, { outline: 1 }],
  ['materials', 0.22, {}],
  ['cta', 0.0, {}],
  ['cta', 0.7, { cable: 1 }],
]

/** Advance eased weights toward the target. Frame-rate independent. */
export function stepConductor(dt: number, scrollCues: Cue[], scrollY: number) {
  if (conductor.program !== null) weightsAt(PROGRAM, conductor.program, conductor.target)
  else weightsAt(scrollCues, scrollY, conductor.target)
  const k = 1 - Math.exp(-3.2 * dt)
  for (const key of WEIGHT_KEYS) {
    conductor.weights[key] += (conductor.target[key] - conductor.weights[key]) * k
  }
}
