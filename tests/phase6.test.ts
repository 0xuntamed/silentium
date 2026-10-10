import { describe, expect, it } from 'vitest'
import { routeOf } from '../src/lib/router'
import { differs, productCopy, specGroups, specRows } from '../src/content/products'
import { buildBuds } from '../src/scenes/Product/budsModel'
import { activateView, normaliseAngle, setExplode, setViewAngle, updateView, viewLive } from '../src/scenes/Product/viewLive'

describe('router', () => {
  it('knows the four routes and calls the rest 404', () => {
    expect(routeOf('/')).toBe('/')
    expect(routeOf('/one')).toBe('/one')
    expect(routeOf('/buds')).toBe('/buds')
    expect(routeOf('/compare')).toBe('/compare')
    expect(routeOf('/nope')).toBe('*')
    expect(routeOf('/one/extra')).toBe('*')
  })
})

describe('product data', () => {
  it('every spec row has a value for both products and a known group', () => {
    const groups = new Set(specGroups())
    for (const r of specRows) {
      expect(r.one.length).toBeGreaterThan(0)
      expect(r.buds.length).toBeGreaterThan(0)
      expect(groups.has(r.group)).toBe(true)
    }
    expect(specRows.some(differs)).toBe(true)
    expect(specRows.some((r) => !differs(r))).toBe(true)
  })
  it('spec labels are unique (they are React keys and row headers)', () => {
    expect(new Set(specRows.map((r) => r.label)).size).toBe(specRows.length)
  })
})

describe('buds model', () => {
  const m = buildBuds()
  it('has one uniquely named part per label, in order', () => {
    expect(m.parts).toHaveLength(productCopy.buds.parts.length)
    expect(m.parts.map((p) => p.label)).toEqual(productCopy.buds.parts)
    expect(new Set(m.parts.map((p) => p.order)).size).toBe(m.parts.length)
  })
  it('mirrors left and right buds about the centre, and explodes by finite offsets', () => {
    const byLabel = (l: string) => m.parts.find((p) => p.label === l)!
    const L = byLabel('Bud shell L').home
    const R = byLabel('Bud shell R').home
    expect(L.x + R.x).toBeCloseTo(0, 5)
    for (const p of m.parts) expect(Number.isFinite(p.home.length() + p.offset.length())).toBe(true)
  })
})

describe('360° view state', () => {
  it('angles normalise into [0, 2π)', () => {
    expect(normaliseAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2)
    expect(normaliseAngle(7 * Math.PI)).toBeCloseTo(Math.PI)
  })
  it('eases to a target angle and settles', () => {
    activateView('one', true)
    setViewAngle(1.2, 0.3)
    for (let i = 0; i < 240; i++) updateView(1 / 60, performance.now())
    expect(viewLive.rotY).toBeCloseTo(1.2, 2)
    expect(viewLive.rotX).toBeCloseTo(0.3, 2)
  })
  it('turns by itself when idle, but never under reduced motion', () => {
    activateView('buds', false)
    const t0 = performance.now() + 10_000 // long after the last input
    const before = viewLive.targetY
    updateView(0.5, t0)
    expect(viewLive.targetY).toBeGreaterThan(before)

    activateView('buds', true)
    const still = viewLive.targetY
    updateView(0.5, t0)
    expect(viewLive.targetY).toBe(still)
  })
  it('explodes and fades in, and rides up and out as the page scrolls', () => {
    activateView('one', true)
    setExplode(true)
    for (let i = 0; i < 300; i++) updateView(1 / 60, performance.now(), false)
    expect(viewLive.state.explode).toBeGreaterThan(0.98)
    expect(viewLive.state.vis).toBeGreaterThan(0.98)
    viewLive.scrollY = viewLive.vh * 1.2
    updateView(1 / 60, performance.now(), false)
    expect(viewLive.state.vis).toBe(0)
    expect(viewLive.state.y).toBeGreaterThan(1)
  })
  it('snap jumps straight to the targets', () => {
    activateView('one', true)
    viewLive.scrollY = 0
    setViewAngle(2, 0.5)
    updateView(1, performance.now(), true)
    expect(viewLive.rotY).toBe(2)
    expect(viewLive.state.vis).toBe(1)
  })
})
