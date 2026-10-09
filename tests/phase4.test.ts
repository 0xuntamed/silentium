import { describe, expect, it } from 'vitest'
import { heroProduct, materialsProduct, partProgress, MAT } from '../src/scenes/Materials/productState'
import { autopilot, clampSource, readSource, spatialLayout } from '../src/scenes/Spatial/spatialMath'
import { buildHeadphones, FINISHES, PART_COUNT } from '../src/scenes/Materials/model'
import { materials } from '../src/content/copy'

describe('product state (pure)', () => {
  it('hero: rises from below, turns to a side profile, lifts away', () => {
    expect(heroProduct(0).vis).toBe(0)
    expect(heroProduct(0.5).vis).toBeGreaterThan(0.95)
    expect(heroProduct(0.55).rotY).toBeGreaterThan(0.7)
    expect(heroProduct(0.55).rotY).toBeLessThan(1.2)
    expect(heroProduct(0.3).y).toBeLessThan(heroProduct(0.55).y)
    expect(heroProduct(1).vis).toBe(0)
    expect(heroProduct(1).y).toBeGreaterThan(1)
  })
  it('materials: starts exploded, ends assembled, then spins a full turn', () => {
    expect(materialsProduct(MAT.assemble[0]).explode).toBeCloseTo(1, 5)
    expect(materialsProduct(MAT.assemble[1]).explode).toBeCloseTo(0, 5)
    const turn = materialsProduct(MAT.spin[1]).rotY - materialsProduct(MAT.spin[0]).rotY
    expect(turn).toBeCloseTo(Math.PI * 2, 5)
    expect(materialsProduct(0).vis).toBe(0)
    expect(materialsProduct(1).vis).toBe(0)
  })
  it('is deterministic in either direction', () => {
    const f = [0.1, 0.3, 0.5, 0.7].map((p) => JSON.stringify(materialsProduct(p)))
    const b = [0.7, 0.5, 0.3, 0.1].map((p) => JSON.stringify(materialsProduct(p))).reverse()
    expect(b).toEqual(f)
  })
  it('parts lock in one after another', () => {
    const n = 24
    expect(partProgress(0, 0, n)).toBe(0)
    expect(partProgress(1, n - 1, n)).toBe(1)
    expect(partProgress(0.5, 3, n)).toBeGreaterThan(partProgress(0.5, 20, n))
  })
})

describe('spatial maths', () => {
  const head = { x: 0, y: 0 }
  it('reads azimuth and equal-power pan', () => {
    const ahead = readSource(head, { x: 0, y: 1 })
    expect(ahead.azimuth).toBeCloseTo(0, 5)
    expect(ahead.leftDb).toBeCloseTo(ahead.rightDb, 5)
    const right = readSource(head, { x: 1, y: 0 })
    expect(right.azimuth).toBeCloseTo(90, 5)
    expect(right.rightDb).toBeGreaterThan(right.leftDb + 10)
    const left = readSource(head, { x: -1, y: 0 })
    expect(left.leftDb).toBeGreaterThan(left.rightDb + 10)
    expect(Math.abs(readSource(head, { x: 0, y: -1 }).azimuth)).toBeCloseTo(180, 5)
  })
  it('gets quieter with distance and never sits inside the head', () => {
    expect(readSource(head, { x: 0, y: 1.4 }).leftDb).toBeLessThan(readSource(head, { x: 0, y: 0.5 }).leftDb)
    const inside = readSource(head, { x: 0.01, y: 0.01 })
    expect(inside.distance).toBeGreaterThan(0.4)
    expect(Number.isFinite(inside.leftDb + inside.rightDb)).toBe(true)
  })
  it('autopilot orbits around the head and stays in the playfield', () => {
    for (let t = 0; t < 60; t += 0.7) {
      const p = clampSource(head, autopilot(t, head, 0.6), 1.6)
      expect(Math.hypot(p.x, p.y)).toBeLessThan(0.9)
    }
  })
  it('keeps the head on the same side as the ANC listener', () => {
    expect(spatialLayout(1.6).head.x).toBeCloseTo(1.6 * 0.34, 5)
    expect(spatialLayout(0.46).head.x).toBe(0)
  })
})

describe('headphone model', () => {
  const m = buildHeadphones()
  it('has 24 uniquely named parts with a unique assembly order', () => {
    expect(m.parts).toHaveLength(PART_COUNT)
    expect(m.parts.map((p) => p.label)).toEqual(materials.parts)
    expect(new Set(m.parts.map((p) => p.order)).size).toBe(PART_COUNT)
    expect(Math.max(...m.parts.map((p) => p.order))).toBe(PART_COUNT - 1)
  })
  it('explodes into finite, distinct offsets', () => {
    for (const p of m.parts) {
      expect(Number.isFinite(p.home.length() + p.offset.length())).toBe(true)
      expect(p.offset.length()).toBeGreaterThan(0.09)
    }
  })
  it('mirrors left and right cup parts', () => {
    const byLabel = (l: string) => m.parts.find((p) => p.label === l)!
    const l = byLabel('Driver L')
    const r = byLabel('Driver R')
    expect(l.home.x).toBeCloseTo(-r.home.x, 5)
    expect(l.offset.x).toBeCloseTo(-r.offset.x, 5)
  })
  it('offers three finishes', () => expect(FINISHES.map((f) => f.label)).toEqual(materials.finishes))
})

import { ConeLetters } from '../src/lib/coneLetters'

describe('cone letters (type made of sound)', () => {
  it('rings after a kick and settles', () => {
    const c = new ConeLetters(9)
    c.kick(4, 0.5)
    let peak = 0
    for (let k = 0; k < 60; k++) {
      c.step(1 / 60)
      peak = Math.max(peak, Math.abs(c.pos[4]))
    }
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThan(1)
    // ~1 s later the cone has mostly settled.
    for (let k = 0; k < 120; k++) c.step(1 / 60)
    expect(Math.abs(c.pos[4])).toBeLessThan(0.05)
    expect(c.pos[0]).toBe(0)
  })
  it('is stable even with a long frame', () => {
    const c = new ConeLetters(3)
    c.kick(0, 1)
    for (let k = 0; k < 200; k++) c.step(0.09)
    expect(Number.isFinite(c.energy())).toBe(true)
    expect(c.energy()).toBeLessThan(1)
  })
})
