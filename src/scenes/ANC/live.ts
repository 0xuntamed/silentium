import { ScrollTrigger } from '../../lib/gsap'
import { clamp } from '../../lib/math'
import { ancAt, type AncState } from './state'

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * The ANC scene's live, shared state. Written once per frame by the Stage ticker, read by the WebGL
 * pass, the notes sim, shake and grain. `override` pins the scene to a fixed progress (tests, stills).
 */
export const ancLive = {
  /** Local progress 0..1 inside the pinned scene. */
  p: 0,
  /** Visibility 0..1: fades in as the scene approaches, never "pops". */
  vis: 0,
  active: false,
  state: ancAt(0) as AncState,
  override: null as number | null,
  /** Test hook: stop the ambient clocks so a frame is a pure function of progress. */
  frozen: false,
}

export function updateAncLive(scrollY: number, vh: number) {
  if (ancLive.override !== null) {
    ancLive.p = ancLive.override
    ancLive.vis = 1
  } else {
    const st = ScrollTrigger.getById('scene-anc')
    if (!st || st.end - st.start < 50) {
      ancLive.vis = 0
      ancLive.active = false
      return
    }
    ancLive.p = clamp((scrollY - st.start) / (st.end - st.start))
    const enter = clamp((scrollY - (st.start - vh * 0.9)) / (vh * 0.9))
    const exit = clamp((scrollY - st.end) / (vh * 0.5))
    ancLive.vis = smooth(enter) * (1 - smooth(exit))
  }
  ancLive.state = ancAt(ancLive.p)
  ancLive.active = ancLive.vis > 0.003 && ancLive.state.fade > 0.003
}
