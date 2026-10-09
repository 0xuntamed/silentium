import { describe, expect, it } from 'vitest'
import { Formations, STAFF_LINES, STAFF_SPACING, samplePath, ellipse } from '../src/systems/notes/formations'
import { PROGRAM, weightsAt } from '../src/systems/notes/conductor'

describe('samplePath', () => {
  it('returns n evenly spaced points on an ellipse', () => {
    const s = samplePath(ellipse(0, 0, 1, 0.5), 200)
    for (let i = 0; i < 200; i++) {
      const r = (s.x[i] / 1) ** 2 + (s.y[i] / 0.5) ** 2
      expect(r).toBeGreaterThan(0.97)
      expect(r).toBeLessThan(1.03)
    }
    const d = (i: number) => Math.hypot(s.x[i + 1] - s.x[i], s.y[i + 1] - s.y[i])
    expect(Math.abs(d(10) - d(120))).toBeLessThan(0.02)
  })
})

describe('Formations', () => {
  const f = new Formations(1.6, 1000)
  it('lays dashes on five staff lines inside the viewport', () => {
    const ys = new Set(Array.from(f.staffY, (y) => y.toFixed(4)))
    expect(ys.size).toBe(STAFF_LINES)
    expect(Math.max(...f.staffY) - Math.min(...f.staffY)).toBeCloseTo(STAFF_SPACING * (STAFF_LINES - 1), 4)
    for (const x of f.staffX) expect(Math.abs(x)).toBeLessThan(1.6)
  })
  it('wave is deterministic and bends the staff', () => {
    const a = f.wave(40, 1.25)
    const b = f.wave(40, 1.25)
    expect(a).toEqual(b)
    let moved = 0
    for (let i = 0; i < 1000; i += 7) if (Math.abs(f.wave(i, 0.3)[1] - f.staffY[i]) > 0.02) moved++
    expect(moved).toBeGreaterThan(40)
  })
  it('outline and cable have a target for every dash and stay near the viewport', () => {
    for (const s of [f.outline, f.cable]) {
      expect(s.x.length).toBe(1000)
      for (let i = 0; i < 1000; i++) {
        expect(Number.isFinite(s.x[i] + s.y[i] + s.angle[i])).toBe(true)
        expect(Math.abs(s.y[i])).toBeLessThan(1.1)
        expect(Math.abs(s.x[i])).toBeLessThan(1.8)
      }
    }
  })
  it('puts the motif on the staff', () => {
    expect(f.motif).toHaveLength(4)
    for (const m of f.motif) expect(Math.abs(m.y)).toBeLessThan(STAFF_SPACING * 3)
  })
})

describe('conductor weights', () => {
  it('holds at the ends and blends between cues', () => {
    expect(weightsAt(PROGRAM, 0).staff).toBe(0)
    expect(weightsAt(PROGRAM, 0.26).staff).toBe(1)
    const mid = weightsAt(PROGRAM, 0.15)
    expect(mid.staff).toBeGreaterThan(0.3)
    expect(mid.staff).toBeLessThan(0.7)
    expect(weightsAt(PROGRAM, 1).cable).toBe(1)
  })
})
