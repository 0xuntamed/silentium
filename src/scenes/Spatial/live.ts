import { ScrollTrigger } from '../../lib/gsap'
import { clamp, damp } from '../../lib/math'
import { ancLayout } from '../ANC/state'
import { autopilot, clampSource, readSource, spatialLayout, type SourceReadout, type Vec2 } from './spatialMath'

const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** How long after the last pointer movement the source keeps following it before autopilot resumes. */
export const POINTER_HOLD_MS = 2600

/**
 * The Spatial scene's live state, written once per frame by the Stage ticker and read by the GL pass,
 * the DOM readout and the audio. The source follows the pointer, or orbits on autopilot if nobody is steering.
 */
export const spatialLive = {
  p: 0,
  vis: 0,
  active: false,
  head: { x: 0, y: 0 } as Vec2,
  headR: 0.17,
  src: { x: 0, y: 0.5 } as Vec2,
  read: readSource({ x: 0, y: 0 }, { x: 0, y: 1 }) as SourceReadout,
  steering: false,
  /** The bubble's ring, handed over from the ANC scene, and how far it has relaxed. */
  ring: { x: 0, y: 0, r: 0, alpha: 0 },
  /** 0..1, how far the playfield has contracted for the hand-off to the next scene. */
  contract: 0,
  /** Test hook: pin the scene at a progress. */
  override: null as number | null,
}

export interface PointerInput {
  /** World coordinates of the pointer. */
  x: number
  y: number
  /** performance.now() of its last movement / tap. */
  lastAct: number
  present: boolean
}

export function updateSpatialLive(dt: number, now: number, scrollY: number, aspect: number, pointer: PointerInput) {
  const L = spatialLive
  const st = ScrollTrigger.getById('scene-spatial')
  const anc = ScrollTrigger.getById('scene-anc')
  if (L.override === null && (!st || !anc || st.end - st.start < 50)) {
    L.vis = 0
    L.active = false
    return
  }
  const lay = spatialLayout(aspect)
  L.head = lay.head
  L.headR = lay.headR

  let p: number
  if (L.override !== null) {
    p = L.override
    L.vis = 1
  } else {
    p = clamp((scrollY - st!.start) / (st!.end - st!.start))
    const vh = window.innerHeight
    // The scene is born from the ANC bubble: visible from the end of ANC's pin, gone as it contracts.
    L.vis = sm(anc!.end - 0.15 * vh, st!.start, scrollY) * (1 - sm(0.9, 1, p))
  }
  L.p = p
  L.contract = sm(0.84, 1, p)
  L.active = L.vis > 0.004

  // The ANC bubble's final ring becomes this scene's first reference ring.
  const a = ancLayout(aspect)
  const refRing = lay.headR * 5.2
  const t = L.override !== null ? 1 : clamp((scrollY - anc!.end) / Math.max(1, st!.start + 0.22 * (st!.end - st!.start) - anc!.end))
  const k = easeInOut(t)
  L.ring.x = a.cx + (lay.head.x - a.cx) * k
  L.ring.y = a.cy + (lay.head.y - a.cy) * k
  L.ring.r = (a.rMax * 2.7) * (1 - k) + refRing * k
  L.ring.alpha = sm(anc!.end - 0.05 * window.innerHeight, anc!.end + 0.25 * window.innerHeight, scrollY) * 0.9 || (L.override !== null ? 0.9 : 0)

  // Source: the pointer if it has moved lately, otherwise a slow orbit.
  const target = (() => {
    if (pointer.present && now - pointer.lastAct < POINTER_HOLD_MS) {
      L.steering = true
      return clampSource(lay.head, { x: pointer.x, y: pointer.y }, aspect)
    }
    L.steering = false
    return clampSource(lay.head, autopilot(now / 1000, lay.head, 0.62 * (aspect > 1 ? 1 : 0.7)), aspect)
  })()
  const f = damp(L.steering ? 14 : 3.5, dt)
  L.src = { x: L.src.x + (target.x - L.src.x) * f, y: L.src.y + (target.y - L.src.y) * f }
  L.read = readSource(L.head, L.src)
}
