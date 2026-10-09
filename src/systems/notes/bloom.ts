/**
 * The intro's first input throws a burst of notes from the dot. The Stage chunk may not have loaded
 * yet, so the request waits here; the engine consumes it (and drops it if it is stale).
 */
export const bloom = {
  pending: null as null | { x: number; y: number; t: number },
}

export function requestBloom(clientX: number, clientY: number) {
  bloom.pending = { x: clientX, y: clientY, t: performance.now() }
}
