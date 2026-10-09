import { useRef, type RefObject } from 'react'
import { gsap, useGSAP } from './gsap'
import { MOBILE_SCALE, SCENE_LENGTH } from './scenes'

export interface SceneCtx {
  root: HTMLElement
  mobile: boolean
  /** Scoped selector, like gsap.utils.selector(root). */
  q: <T extends Element = HTMLElement>(sel: string) => T[]
}

interface Options {
  id: keyof typeof SCENE_LENGTH
  /**
   * Populate a scrubbed timeline. Tweens are positioned on a 0→1 timeline, so a position is
   * the scene's local progress. The timeline must be a pure function of progress (no callbacks
   * with side effects) so reverse scroll is exact.
   */
  build: (tl: gsap.core.Timeline, ctx: SceneCtx) => void
}

/**
 * One GSAP context per scene: pins the scene, scrubs its timeline, cleans up on unmount.
 * With prefers-reduced-motion nothing is built — the scene stays in its static, still-designed state.
 */
export function useScene(scope: RefObject<HTMLElement | null>, { id, build }: Options) {
  const buildRef = useRef(build)
  buildRef.current = build

  useGSAP(
    () => {
      const root = scope.current
      if (!root) return
      const mm = gsap.matchMedia()

      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 767px)' },
        (ctx) => {
          const { motion, mobile } = ctx.conditions as { motion: boolean; mobile: boolean }
          if (!motion) return

          const length = SCENE_LENGTH[id] * (mobile ? MOBILE_SCALE : 1)
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              id: `scene-${id}`,
              trigger: root,
              start: 'top top',
              end: `+=${length}%`,
              pin: true,
              scrub: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          const q = gsap.utils.selector(root) as SceneCtx['q']
          buildRef.current(tl, { root, mobile, q })

          // Hairline progress bar at the foot of every scene.
          const bar = root.querySelector('[data-progress]')
          if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
          // Pad so the timeline is exactly 1 long regardless of how it was authored.
          tl.set({}, {}, 1)
        },
      )

      return () => mm.revert()
    },
    { scope, dependencies: [id] },
  )
}
