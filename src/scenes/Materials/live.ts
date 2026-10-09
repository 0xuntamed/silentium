import { useSyncExternalStore } from 'react'
import { ScrollTrigger } from '../../lib/gsap'
import { clamp } from '../../lib/math'
import { heroProduct, materialsProduct, OFF, type ProductState } from './productState'
import { PART_COUNT } from './constants'

/**
 * The product model's live state: which scene is driving it, the resulting transform, the finish the
 * visitor chose, and each part's projected screen position for the DOM labels.
 */
export const productLive = {
  scene: 'hero' as 'hero' | 'materials',
  p: 0,
  state: OFF as ProductState,
  /** Test hook: pin to a scene and progress. */
  override: null as null | { scene: 'hero' | 'materials'; p: number },
  /** Projected label anchors (CSS px) and opacity, written each frame by the Stage. */
  labels: Array.from({ length: PART_COUNT }, () => ({ x: 0, y: 0, a: 0 })),
}

export function updateProductLive(scrollY: number) {
  const L = productLive
  if (L.override) {
    L.scene = L.override.scene
    L.p = L.override.p
    L.state = L.scene === 'hero' ? heroProduct(L.p) : materialsProduct(L.p)
    return
  }
  const hero = ScrollTrigger.getById('scene-hero')
  const mat = ScrollTrigger.getById('scene-materials')
  const anc = ScrollTrigger.getById('scene-anc')
  if (!hero || !mat || !anc || mat.end - mat.start < 50) {
    L.state = OFF
    return
  }
  if (scrollY < anc.start) {
    L.scene = 'hero'
    L.p = clamp((scrollY - hero.start) / (hero.end - hero.start))
    L.state = heroProduct(L.p)
  } else {
    L.scene = 'materials'
    L.p = clamp((scrollY - mat.start) / (mat.end - mat.start))
    L.state = materialsProduct(L.p)
  }
}

// — The finish the visitor picked (Basalt / Bone / Brass).
let finish = 0
const listeners = new Set<() => void>()
export const getFinish = () => finish
export function setFinishIndex(i: number) {
  finish = i
  listeners.forEach((l) => l())
}
export function useFinish() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => finish,
    () => 0,
  )
}

// — Reduced-motion stills of the model: [exploded, assembled].
let stills: string[] = []
const stillListeners = new Set<() => void>()
export function setProductStills(urls: string[]) {
  stills = urls
  stillListeners.forEach((l) => l())
}
export function useProductStills() {
  return useSyncExternalStore(
    (l) => {
      stillListeners.add(l)
      return () => stillListeners.delete(l)
    },
    () => stills,
    () => stills,
  )
}
