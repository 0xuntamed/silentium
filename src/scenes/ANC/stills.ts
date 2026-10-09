import { useSyncExternalStore } from 'react'

/** Reduced-motion stills of the ANC scene (before / ANC on / after), rendered once by the Stage. */
let stills: string[] = []
const listeners = new Set<() => void>()

export function setAncStills(urls: string[]) {
  stills = urls
  listeners.forEach((l) => l())
}

export function useAncStills() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => stills,
    () => stills,
  )
}
