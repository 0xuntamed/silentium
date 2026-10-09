import { prefersReducedMotion } from './useReducedMotion'

/**
 * Performance tiers. 'full' desktop, 'lite' phones/tablets (fewer particles, no heavy shaders),
 * 'still' for prefers-reduced-motion (one frozen, designed frame — no animation loop).
 */
export type TierName = 'full' | 'lite' | 'still'

export interface Tier {
  name: TierName
  /** Total particles = notes + dashes. */
  notes: number
  dashes: number
  /** How many of the notes live on the blurred near layer (drawn in the 2D overlay). */
  near: number
  dpr: number
  cursorForces: boolean
}

const TIERS: Record<Exclude<TierName, 'still'>, Tier> = {
  full: { name: 'full', notes: 3400, dashes: 1600, near: 220, dpr: 1.5, cursorForces: true },
  lite: { name: 'lite', notes: 650, dashes: 250, near: 36, dpr: 1, cursorForces: false },
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return TIERS.full
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = window.innerWidth < 768
  const base = coarse || small ? TIERS.lite : TIERS.full
  // A frozen frame needs no loop, only a decent field.
  if (prefersReducedMotion()) return { ...base, name: 'still' }
  return base
}
