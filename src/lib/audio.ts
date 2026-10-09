import { useSyncExternalStore } from 'react'

/** Sound is muted by default. Phase 1 only holds the preference; synthesis arrives with the intro bloom. */
let on = false
const listeners = new Set<() => void>()

export const isSoundOn = () => on

export function toggleSound() {
  on = !on
  listeners.forEach((l) => l())
}

export function useSoundOn() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
    () => false,
  )
}
