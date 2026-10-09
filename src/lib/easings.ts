/** Named curves, defined once. GSAP gets them through CustomEase (see gsap.ts); Framer takes the arrays. */
export const bezier = {
  /** Entrances and reveals (900–1400 ms). Soft landing. */
  hush: [0.22, 1, 0.36, 1],
  /** Scene crossfades and handoffs. */
  exhale: [0.65, 0, 0.35, 1],
} as const

/** Mechanical snaps — headphones seating, toggles. */
export const spring = { type: 'spring', stiffness: 380, damping: 22 } as const

export const timing = {
  micro: 0.2,
  ui: 0.5,
  reveal: 1.1,
  charStagger: 0.025,
} as const
