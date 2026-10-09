import { scrollSignal } from './scroll'

/** Returns the live signal object. Read it inside a ticker/useFrame; it never triggers a re-render. */
export function useScrollVelocity() {
  return scrollSignal
}
