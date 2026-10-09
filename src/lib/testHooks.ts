import { ScrollTrigger } from './gsap'
import { markEntered } from './session'
import { getLenis, scrollToY, unlockScroll } from './lenis'

/**
 * Tiny hooks for the Playwright harness (scripts/shots.mjs). Only installed in dev and in the
 * `test` build mode, never in production.
 */
export function installTestHooks() {
  if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return
  const w = window as unknown as { __sil?: Record<string, unknown> }
  w.__sil = Object.assign(w.__sil ?? {}, {
    ...{
      /** Skip the intro gate instantly. */
      enter() {
        markEntered()
        unlockScroll()
        const gate = document.querySelector<HTMLElement>('[role="dialog"]')
        if (gate) gate.style.display = 'none' // React still owns the node; just hide it
        document.querySelector('main')?.removeAttribute('inert')
      },
      /** Jump to a local progress (0..1) inside a registered scene. */
      goto(id: string, p: number) {
        const st = ScrollTrigger.getById(`scene-${id}`)
        if (!st) return false
        scrollToY(st.start + (st.end - st.start) * p, true)
        ScrollTrigger.update()
        return true
      },
      scenes: () => ScrollTrigger.getAll().filter((s) => s.vars.id).map((s) => ({ id: s.vars.id, start: s.start, end: s.end })),
      total: () => document.documentElement.scrollHeight,
      lenis: () => !!getLenis(),
    },
  })
}
