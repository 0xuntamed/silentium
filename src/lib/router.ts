import { useSyncExternalStore } from 'react'
import { markEntered } from './session'
import { prefersReducedMotion } from './useReducedMotion'

/**
 * A ~60-line history router (no dependency). Routes are flat, so there is nothing to nest. Navigation
 * runs a short curtain: it covers the page, swaps the route while nothing can be seen (pinned scenes
 * unmount, so the layout jumps), then lifts. With reduced motion the swap is instant.
 */
export type Route = '/' | '/one' | '/buds' | '/compare' | '*'
export type Phase = 'idle' | 'covering' | 'revealing'

export interface RouterState {
  path: string
  phase: Phase
}

const ROUTES = new Set(['/', '/one', '/buds', '/compare'])
export const COVER_MS = 380

const normalise = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/'
export const routeOf = (path: string): Route => (ROUTES.has(path) ? (path as Route) : '*')

let state: RouterState = { path: typeof window === 'undefined' ? '/' : normalise(location.pathname), phase: 'idle' }
const listeners = new Set<() => void>()
const set = (next: Partial<RouterState>) => {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

/** A scene to scroll to once the landing has mounted (nav links from other pages). */
let pendingScene: string | null = null
export const takePendingScene = () => {
  const s = pendingScene
  pendingScene = null
  return s
}

/** Deep links to product pages skip the silent intro: it belongs to the front door. */
if (typeof window !== 'undefined') {
  history.scrollRestoration = 'manual'
  if (state.path !== '/') markEntered()
}

let timer = 0

export function navigate(to: string, opts: { scene?: string } = {}) {
  const path = normalise(to)
  if (state.phase !== 'idle') return
  if (path === state.path) {
    if (opts.scene) window.dispatchEvent(new CustomEvent('sil:scene', { detail: opts.scene }))
    return
  }
  pendingScene = opts.scene ?? null
  const swap = () => {
    history.pushState({}, '', path)
    window.scrollTo(0, 0)
    set({ path })
  }
  if (prefersReducedMotion()) {
    swap()
    return
  }
  set({ phase: 'covering' })
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    swap()
    set({ phase: 'revealing' })
    timer = window.setTimeout(() => set({ phase: 'idle' }), 700)
  }, COVER_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    window.scrollTo(0, 0)
    set({ path: normalise(location.pathname), phase: 'idle' })
  })
}

export const getRouter = () => state
export const subscribeRouter = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export function useRouter() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state,
  )
}
