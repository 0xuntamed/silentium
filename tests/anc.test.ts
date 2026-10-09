import { describe, expect, it } from 'vitest'
import { ancAt, ancLayout, BEATS, DB_END, DB_START } from '../src/scenes/ANC/state'
import { makeSeeds, phase, projectedPos, type ProjUniforms } from '../src/scenes/ANC/projection'

describe('ancAt (pure function of progress)', () => {
  it('is deterministic — reverse scroll replays exactly', () => {
    const forward = [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => JSON.stringify(ancAt(p)))
    const backward = [0.9, 0.7, 0.5, 0.3, 0.1].map((p) => JSON.stringify(ancAt(p))).reverse()
    expect(backward).toEqual(forward)
  })

  it('tells the story in order', () => {
    expect(ancAt(0).fit).toBe(0)
    expect(ancAt(0).engaged).toBe(0)
    expect(ancAt(0).db).toBe(DB_START)
    expect(ancAt(BEATS.fitEnd).fit).toBeCloseTo(1, 5)
    expect(ancAt(BEATS.click).click).toBeGreaterThan(0.99)
    expect(ancAt(0.5).engaged).toBeGreaterThan(0.5)
    expect(ancAt(BEATS.engageEnd).db).toBeCloseTo(DB_END, 5)
    expect(ancAt(1).fade).toBe(0)
  })

  it('bubble only grows while engaging, dB only falls', () => {
    let lastR = 0
    let lastDb = Infinity
    for (let p = 0; p <= 0.86; p += 0.01) {
      const s = ancAt(p)
      expect(s.radius).toBeGreaterThanOrEqual(lastR - 1e-9)
      expect(s.db).toBeLessThanOrEqual(lastDb + 1e-9)
      lastR = s.radius
      lastDb = s.db
    }
  })

  it('shake peaks at the click and is gone once the bubble is up', () => {
    expect(ancAt(0.2).noise).toBeGreaterThanOrEqual(1)
    expect(ancAt(BEATS.click).noise).toBeGreaterThan(1.3)
    expect(ancAt(0.7).noise).toBeLessThan(0.05)
  })
})

describe('projection flow', () => {
  const layout = ancLayout(1.6)
  const seeds = makeSeeds(600)
  const U = (R: number): ProjUniforms => ({ cx: layout.cx, cy: layout.cy, R, bMax: 1.6 * layout.rMax, rs: layout.rs })

  it('equals the straight line when there is no bubble', () => {
    for (const s of seeds.slice(0, 50)) {
      const p = projectedPos(s, 0.37, U(0))
      expect(p.x).toBeCloseTo(p.rx, 5)
      expect(p.y).toBeCloseTo(p.ry, 5)
    }
  })

  it('never lets noise inside the bubble', () => {
    const R = layout.rMax
    let worst = Infinity
    for (const s of seeds) {
      for (let u = 0; u <= 1; u += 0.01) {
        const p = projectedPos(s, u, U(R))
        worst = Math.min(worst, Math.hypot(p.x - layout.cx, p.y - layout.cy) - R)
      }
    }
    expect(worst).toBeGreaterThan(-1e-4)
  })

  it('is continuous along the path, including head-on particles (no 180° flips)', () => {
    const R = layout.rMax
    const headOn = seeds.filter((s) => Math.abs(s.b - 0.5) < 0.02)
    expect(headOn.length).toBeGreaterThan(3)
    for (const s of headOn) {
      let prev = projectedPos(s, 0, U(R))
      for (let u = 0.002; u <= 1; u += 0.002) {
        const p = projectedPos(s, u, U(R))
        expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(0.05)
        prev = p
      }
    }
  })

  it('is continuous as the bubble grows (scrubbing the scene)', () => {
    for (const s of seeds.slice(0, 60)) {
      let prev = projectedPos(s, 0.5, U(0))
      for (let R = 0.005; R <= layout.rMax; R += 0.005) {
        const p = projectedPos(s, 0.5, U(R))
        expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(0.03)
        prev = p
      }
    }
  })

  it('particles far from the bubble are untouched', () => {
    for (const s of seeds.slice(0, 80)) {
      const p = projectedPos(s, 0.02, U(layout.rMax))
      expect(p.x).toBeCloseTo(p.rx, 3)
      expect(p.y).toBeCloseTo(p.ry, 3)
    }
  })

  it('phase loops in 0..1', () => {
    for (const s of seeds.slice(0, 20)) for (const t of [0, 3.3, 99.9]) expect(phase(s, t)).toBeGreaterThanOrEqual(0)
  })
})
