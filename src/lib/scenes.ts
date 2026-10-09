/** Pinned scroll length per scene, in % of viewport height (the plan's vh budget). Mobile scales ×0.7. */
export const SCENE_LENGTH = {
  hero: 220,
  anc: 520,
  spatial: 300,
  materials: 380,
  specs: 180,
} as const

export type SceneId = keyof typeof SCENE_LENGTH | 'reviews' | 'cta'

export const MOBILE_SCALE = 0.7
