import { ScrollTrigger } from '../../lib/gsap'
import { SCROLL_CUES, type Cue } from './conductor'

/** Page positions (scroll px) for each conductor cue. Re-resolved whenever ScrollTrigger refreshes. */
export const scrollCues: Cue[] = []

function sceneY(scene: string, p: number): number | null {
  const st = ScrollTrigger.getById(`scene-${scene}`)
  // Pinned scenes (and the tall Reviews section): ScrollTrigger knows where they start and end.
  // The CTA is always measured from its element: p 0 = it enters the viewport, p 1 = its top reaches the top.
  if (scene !== 'cta' && st && st.end - st.start > 50) return st.start + (st.end - st.start) * p
  // Unpinned sections: p 0 = section top enters the viewport, p 1 = it reaches the top.
  const el = document.getElementById(scene)
  if (!el) return null
  const top = el.getBoundingClientRect().top + window.scrollY
  return top - window.innerHeight + p * window.innerHeight
}

export function resolveScrollCues() {
  const next: Cue[] = []
  for (const [scene, p, w] of SCROLL_CUES) {
    const at = sceneY(scene, p)
    if (at !== null) next.push({ at, w })
  }
  next.sort((a, b) => a.at - b.at)
  scrollCues.length = 0
  scrollCues.push(...next)
}

export function watchScrollCues(): () => void {
  resolveScrollCues()
  const on = () => resolveScrollCues()
  ScrollTrigger.addEventListener('refresh', on)
  return () => ScrollTrigger.removeEventListener('refresh', on)
}
