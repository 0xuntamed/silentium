import { useSyncExternalStore } from 'react'

/** Has the visitor passed the silent intro gate? Scenes wait on this before their entrances. */
let entered = false
const listeners = new Set<() => void>()

export const hasEntered = () => entered

export function markEntered() {
  if (entered) return
  entered = true
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
