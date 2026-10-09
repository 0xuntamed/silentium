import { clamp, damp } from './math'

/**
 * Shared scroll signals, read (not subscribed to) by anything that animates:
 * notes, hero type, grain, the noise time-scale. One source, many consumers.
 */
export const scrollSignal = {
  y: 0,
  /** Smoothed signed velocity in px/s (positive = scrolling down). */
  velocity: 0,
  /** |velocity| normalised to 0..1 (≈3000 px/s = 1). */
  speed: 0,
  direction: 0 as -1 | 0 | 1,
}

let lastY = 0

/** Call once per frame from the shared ticker. */
export function updateScrollSignal(y: number, dt: number) {
  const dtSafe = Math.max(dt, 1 / 240)
  const raw = (y - lastY) / dtSafe
  lastY = y
  scrollSignal.y = y
  scrollSignal.velocity += (raw - scrollSignal.velocity) * damp(14, dtSafe)
  if (Math.abs(scrollSignal.velocity) < 1) scrollSignal.velocity = 0
  scrollSignal.speed = clamp(Math.abs(scrollSignal.velocity) / 3000)
  scrollSignal.direction = scrollSignal.velocity > 8 ? 1 : scrollSignal.velocity < -8 ? -1 : 0
}
