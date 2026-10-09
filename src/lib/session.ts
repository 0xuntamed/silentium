import { useSyncExternalStore } from 'react'

/** Has the visitor passed the silent intro gate? Scenes wait on this before their entrances. */
let entered = false
let enteredAt = 0
const listeners = new Set<() => void>()

export const hasEntered = () => entered
/** Milliseconds since the visitor passed the gate (Infinity-ish before: -1). */
export const msSinceEntered = () => (entered ? performance.now() - enteredAt : -1)

export function markEntered() {
  if (entered) return
  entered = true
  enteredAt = performance.now()
  listeners.forEach((l) => l())
}

export function whenEntered(cb: () => void): () => void {
  if (entered) {
    cb()
    return () => {}
  }
  const l = () => {
    if (!entered) return
    listeners.delete(l)
    cb()
  }
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useEntered() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => entered,
    () => false,
  )
}
