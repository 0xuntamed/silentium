import { describe, expect, it } from 'vitest'
import { clamp, damp, lerp } from '../src/lib/math'

describe('math', () => {
  it('clamps', () => {
    expect(clamp(2)).toBe(1)
    expect(clamp(-1)).toBe(0)
    expect(clamp(0.4)).toBe(0.4)
  })
  it('lerps', () => expect(lerp(10, 20, 0.5)).toBe(15))
  it('damps frame-rate independently', () => {
    // Two half-steps must equal one full step.
    const one = 1 - (1 - damp(8, 1 / 60)) ** 2
    expect(damp(8, 2 / 60)).toBeCloseTo(one, 10)
  })
})
