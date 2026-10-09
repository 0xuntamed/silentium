import { describe, expect, it } from 'vitest'
import { NotesSim, type SimInputs } from '../src/systems/notes/sim'
import { ZERO } from '../src/systems/notes/conductor'

const base = (over: Partial<SimInputs> = {}): SimInputs => ({
  t: 0,
  scrollVelPx: 0,
  viewportH: 900,
  cursor: { x: 0, y: 0, speed: 0, active: false },
  weights: { ...ZERO },
  ...over,
})

function run(sim: NotesSim, seconds: number, inp: () => SimInputs) {
  const dt = 1 / 60
  for (let k = 0; k < seconds * 60; k++) {
    const i = inp()
    i.t = k * dt
    sim.step(dt, i)
  }
}

const mk = () => new NotesSim({ notes: 600, dashes: 400, near: 30, aspect: 1.6, cursorForces: true })

describe('NotesSim', () => {
  it('lays particles out as far, mid, dashes, near', () => {
    const s = mk()
    expect(s.n).toBe(1000)
    expect(s.nearStart).toBe(970)
    expect(s.layer[s.nearStart]).toBe(2)
    expect(s.kind[s.nearStart - 1]).toBe(1)
  })

  it('stays finite and inside the wrap bounds', () => {
    const s = mk()
    run(s, 8, () => base({ scrollVelPx: 2500, cursor: { x: 0.2, y: 0, speed: 1.5, active: true } }))
    for (let i = 0; i < s.n; i++) {
      expect(Number.isFinite(s.x[i] + s.y[i])).toBe(true)
      expect(Math.abs(s.x[i])).toBeLessThanOrEqual(1.6 + 0.23)
      expect(Math.abs(s.y[i])).toBeLessThanOrEqual(1.23)
    }
  })

  it('dashes converge onto the staff, and release when the weight drops', () => {
    const s = mk()
    run(s, 5, () => base({ weights: { ...ZERO, staff: 1 } }))
    expect(s.meanDashError(s.formations.staffX, s.formations.staffY)).toBeLessThan(0.02)
    run(s, 4, () => base())
    expect(s.meanDashError(s.formations.staffX, s.formations.staffY)).toBeGreaterThan(0.1)
  })

  it('reaches the outline and the cable too', () => {
    const s = mk()
    run(s, 5, () => base({ weights: { ...ZERO, outline: 1 } }))
    expect(s.meanDashError(s.formations.outline.x, s.formations.outline.y)).toBeLessThan(0.03)
    run(s, 5, () => base({ weights: { ...ZERO, cable: 1 } }))
    expect(s.meanDashError(s.formations.cable.x, s.formations.cable.y)).toBeLessThan(0.03)
  })

  it('streams while scrolling and settles when scrolling stops', () => {
    const s = mk()
    const speed = () => {
      let sum = 0
      for (let i = 0; i < s.nearStart; i++) sum += Math.hypot(s.vx[i], s.vy[i])
      return sum / s.nearStart
    }
    run(s, 2, () => base())
    const idle = speed()
    run(s, 1.5, () => base({ scrollVelPx: 2800 }))
    const fast = speed()
    run(s, 6, () => base())
    const settled = speed()
    expect(fast).toBeGreaterThan(idle * 3)
    expect(settled).toBeLessThan(fast * 0.35)
  })

  it('the cursor stirs only the notes near it', () => {
    const stir = (active: boolean) => {
      const s = mk()
      run(s, 3, () => base())
      run(s, 1.5, () => base({ cursor: { x: 0, y: 0, speed: 2.5, active } }))
      let near = 0
      let nearN = 0
      let far = 0
      let farN = 0
      for (let i = 0; i < s.nearStart; i++) {
        if (s.kind[i] !== 0) continue
        const sp = Math.hypot(s.vx[i], s.vy[i])
        if (Math.hypot(s.x[i], s.y[i]) < 0.25) (near += sp), nearN++
        else if (Math.hypot(s.x[i], s.y[i]) > 0.9) (far += sp), farN++
      }
      return { near: near / Math.max(nearN, 1), far: far / Math.max(farN, 1) }
    }
    const on = stir(true)
    const off = stir(false)
    expect(on.near).toBeGreaterThan(off.near * 1.8)
    expect(on.far).toBeLessThan(off.far * 1.3)
  })

  it('burst relocates notes to the origin with outward velocity', () => {
    const s = mk()
    s.burst(0.1, -0.2, 400, 2)
    let moved = 0
    for (let i = 0; i < s.nearStart; i++) if (Math.abs(s.x[i] - 0.1) < 1e-6 && Math.abs(s.y[i] + 0.2) < 1e-6) moved++
    expect(moved).toBeGreaterThan(100)
  })
})
