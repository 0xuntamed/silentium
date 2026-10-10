import { useSyncExternalStore } from 'react'
import { clamp, damp } from '../../lib/math'
import { OFF, type ProductState } from '../Materials/productState'
import type { ProductId } from '../../lib/cart'

/**
 * Live state of the 360° view on the product pages: the Stage reads it each frame, the page's controls
 * write the targets. Three-free so it can sit in the main bundle.
 */
export const viewLive = {
  active: false,
  kind: 'one' as ProductId,
  /** Smoothed values pushed into the render pass. */
  state: OFF as ProductState,
  rotY: -0.5,
  rotX: 0.12,
  targetY: -0.5,
  targetX: 0.12,
  velY: 0,
  explode: 0,
  explodeTarget: 0,
  vis: 0,
  dragging: false,
  lastInput: -1e9,
  finish: 0,
  /** Auto-turn is off with reduced motion; the controls still work and render on demand. */
  still: false,
  /** Page scroll (px) and viewport height: the model rides up with the page. */
  scrollY: 0,
  vh: 900,
}

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())
export const subscribeView = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function activateView(kind: ProductId, still: boolean) {
  Object.assign(viewLive, { active: true, kind, still, finish: 0, explode: 0, explodeTarget: 0, rotY: -0.5, targetY: -0.5, rotX: 0.12, targetX: 0.12, velY: 0, dragging: false })
  viewLive.lastInput = performance.now()
  changed()
}
export function deactivateView() {
  viewLive.active = false
  changed()
}

export function setViewFinish(i: number) {
  viewLive.finish = i
  changed()
}
export function setExplode(on: boolean) {
  viewLive.explodeTarget = on ? 1 : 0
  viewLive.lastInput = performance.now()
  changed()
}
export function setViewAngle(y: number, x = viewLive.targetX) {
  viewLive.targetY = y
  viewLive.targetX = clamp(x, -0.6, 1.25)
  viewLive.velY = 0
  viewLive.lastInput = performance.now()
  changed()
}
/** Drag by pixels (positive dx turns the model to the right). */
export function dragView(dx: number, dy: number) {
  const ry = dx * 0.0085
  viewLive.targetY += ry
  viewLive.rotY += ry // direct follow while dragging
  viewLive.velY = ry
  viewLive.targetX = clamp(viewLive.targetX + dy * 0.005, -0.6, 1.25)
  viewLive.lastInput = performance.now()
  changed()
}
export function nudgeView(dy: number) {
  setViewAngle(viewLive.targetY + dy)
}
export const normaliseAngle = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Per-kind framing (model units). The Buds are small, so they are drawn larger. */
const SCALE: Record<ProductId, number> = { one: 0.95, buds: 1.2 }
const IDLE_MS = 3200

/** Advance the view by dt seconds. `snap` jumps straight to the targets (reduced motion, snapshots). */
export function updateView(dt: number, now: number, snap = false) {
  const L = viewLive
  const idle = now - L.lastInput > IDLE_MS && !L.dragging && !L.still
  if (idle) {
    L.targetY += dt * 0.28
  } else if (!L.dragging && Math.abs(L.velY) > 1e-4) {
    // A flick keeps turning, then settles.
    L.targetY += L.velY
    L.velY *= Math.pow(0.9, dt * 60)
  }
  const k = snap ? 1 : damp(L.dragging ? 30 : 7, dt)
  L.rotY += (L.targetY - L.rotY) * k
  L.rotX += (L.targetX - L.rotX) * k
  L.explode += (L.explodeTarget - L.explode) * (snap ? 1 : damp(4.5, dt))
  const fadeIn = L.active ? 1 : 0
  L.vis += (fadeIn - L.vis) * (snap ? 1 : damp(L.active ? 3.5 : 9, dt))
  if (Math.abs(L.vis - fadeIn) < 0.002) L.vis = fadeIn

  // Scrolling away: the model rides up with the page and fades.
  const away = L.scrollY / L.vh
  L.state = {
    vis: L.vis * (1 - sm(0.55, 1.0, away)),
    x: 0,
    y: away * 2.0,
    scale: SCALE[L.kind],
    rotX: L.rotX,
    rotY: L.rotY,
    explode: L.explode,
  }
}

export function useViewField<T>(pick: (l: typeof viewLive) => T): T {
  return useSyncExternalStore(subscribeView, () => pick(viewLive), () => pick(viewLive))
}
