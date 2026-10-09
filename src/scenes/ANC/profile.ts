/**
 * The listener: an original, gender-neutral side profile, authored as cubic béziers in head units
 * (head radius = 1, origin at the head centre, facing LEFT, y up). The body runs off the bottom
 * of the viewport so only the head, neck and shoulders read.
 */
import { samplePath, type Cubic, type Pt } from '../../systems/notes/formations'

const c = (a: Pt, b: Pt, d: Pt, e: Pt): Cubic => [a, b, d, e]
/** A straight run expressed as a cubic. */
const line = (a: Pt, b: Pt): Cubic => c(a, [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3], b)

/** Closed silhouette, clockwise from the crown. */
export const SILHOUETTE: Cubic[] = [
  // forehead → brow → nasion
  c([0.05, 1.0], [-0.38, 1.0], [-0.8, 0.8], [-0.85, 0.46]),
  c([-0.85, 0.46], [-0.87, 0.36], [-0.89, 0.29], [-0.91, 0.22]),
  // nose
  c([-0.91, 0.22], [-0.96, 0.08], [-1.12, -0.03], [-1.17, -0.14]),
  c([-1.17, -0.14], [-1.15, -0.2], [-1.03, -0.2], [-0.95, -0.22]),
  // lips, chin
  c([-0.95, -0.22], [-0.97, -0.3], [-0.99, -0.36], [-0.95, -0.42]),
  c([-0.95, -0.42], [-0.93, -0.46], [-0.97, -0.5], [-0.93, -0.56]),
  c([-0.93, -0.56], [-0.91, -0.7], [-0.87, -0.82], [-0.71, -0.92]),
  // jaw → neck
  c([-0.71, -0.92], [-0.52, -0.99], [-0.3, -0.92], [-0.17, -0.98]),
  c([-0.17, -0.98], [-0.23, -1.3], [-0.31, -1.6], [-0.43, -2.0]),
  // shoulder, then off the bottom of the frame and back up the far side
  c([-0.43, -2.0], [-0.56, -2.16], [-1.2, -2.26], [-1.9, -2.7]),
  line([-1.9, -2.7], [-2.0, -7.0]),
  line([-2.0, -7.0], [3.4, -7.0]),
  line([3.4, -7.0], [3.4, -2.6]),
  c([3.4, -2.6], [2.3, -2.4], [1.1, -2.1], [0.62, -1.9]),
  // back of the neck → occiput → crown
  c([0.62, -1.9], [0.55, -1.5], [0.65, -1.0], [0.78, -0.6]),
  c([0.78, -0.6], [0.98, -0.3], [1.04, 0.3], [0.96, 0.62]),
  c([0.96, 0.62], [0.86, 0.92], [0.5, 1.02], [0.05, 1.0]),
]

/** Ear: an open C-shaped curve. */
export const EAR: Cubic[] = [
  c([0.1, 0.3], [0.5, 0.4], [0.62, -0.1], [0.34, -0.5]),
  c([0.34, -0.5], [0.24, -0.62], [0.08, -0.5], [0.12, -0.34]),
  c([0.12, -0.34], [0.14, -0.22], [0.26, -0.2], [0.28, -0.08]),
]

/** Hairline: a fine curve just inside the skull. */
export const HAIR: Cubic[] = [c([-0.78, 0.68], [-0.4, 0.98], [0.5, 1.02], [0.9, 0.42])]

/** Where the ear sits (the headphone cup centres here), in head units. */
export const EAR_POS: Pt = [0.26, -0.12]

export function samplePolygon(path: Cubic[], n: number): Pt[] {
  const s = samplePath(path, n)
  return Array.from({ length: n }, (_, i) => [s.x[i], s.y[i]] as Pt)
}
