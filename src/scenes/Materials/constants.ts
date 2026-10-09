/** Three-free constants for the product model, so the main bundle never pulls in three.js. */
export const PART_COUNT = 24

export interface Finish {
  id: string
  label: string
  /** Metal shell / yokes / sliders. */
  metal: number
  metalness: number
  metalRough: number
  /** Cushions and pad. */
  leather: number
  /** Swatch for the UI chip. */
  swatch: string
}

export const FINISHES: Finish[] = [
  { id: 'basalt', label: 'Basalt', metal: 0x4a4a52, metalness: 0.9, metalRough: 0.34, leather: 0x1a1a1d, swatch: '#26262a' },
  { id: 'bone', label: 'Bone', metal: 0xd6cfbf, metalness: 0.55, metalRough: 0.42, leather: 0xcdbfa6, swatch: '#e8e0d0' },
  { id: 'brass', label: 'Brass', metal: 0xb99158, metalness: 1, metalRough: 0.3, leather: 0x2a1c10, swatch: '#c6a15b' },
]

