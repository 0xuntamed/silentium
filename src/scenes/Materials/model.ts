/**
 * SILENTIUM One — procedural model, 24 named parts. Original geometry (no scans, no brand marks).
 * Model space: x across the cups, y up, z toward the viewer; cups at x = ±0.55.
 * Each part is a group with a `home` position and an explode `offset`, so one model serves the hero
 * (assembled), the exploded view (24 parts assembling) and, later, the product page.
 */
import * as THREE from 'three'
import { materials } from '../../content/copy'
import { FINISHES } from './constants'

export { FINISHES, PART_COUNT, type Finish } from './constants'
export const CUP_X = 0.55
export const CUP_Y = -0.1

export interface Part {
  index: number
  label: string
  /** Assembly order: lower locks in first. */
  order: number
  object: THREE.Group
  home: THREE.Vector3
  /** Displacement at explode = 1. */
  offset: THREE.Vector3
}

export interface HeadphoneModel {
  root: THREE.Group
  parts: Part[]
  /** Live materials that finishes recolour. */
  mats: { metal: THREE.MeshStandardMaterial; shell: THREE.MeshStandardMaterial; leather: THREE.MeshStandardMaterial }
  dispose(): void
}

const alongX = <T extends THREE.BufferGeometry>(g: T, kind: 'y' | 'z') => {
  if (kind === 'y') g.rotateZ(-Math.PI / 2)
  else g.rotateY(Math.PI / 2)
  return g
}

// Assembly order by copy index (see content/copy.ts → materials.parts).
const ORDER = [23, 22, 19, 20, 17, 18, 7, 8, 14, 15, 0, 1, 2, 3, 4, 5, 6, 9, 16, 10, 11, 21, 12, 13]

export function buildHeadphones(): HeadphoneModel {
  const root = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const std = (p: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(p)
    disposables.push(m)
    return m
  }
  const metal = std({ color: FINISHES[0].metal, metalness: 0.9, roughness: 0.34 })
  const leather = std({ color: FINISHES[0].leather, metalness: 0, roughness: 0.72 })
  const brass = std({ color: 0xc6a15b, metalness: 1, roughness: 0.26 })
  const steel = std({ color: 0x9a9aa2, metalness: 1, roughness: 0.28 })
  const gun = std({ color: 0x2a2a2f, metalness: 0.85, roughness: 0.4 })
  const pcb = std({ color: 0x16271e, metalness: 0.2, roughness: 0.55 })
  const chip = std({ color: 0x0c0c0e, metalness: 0.3, roughness: 0.5 })
  const silicone = std({ color: 0xd9d2c3, metalness: 0, roughness: 0.85 })
  const dbl = std({ color: 0x3a3a40, metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide })
  const shellMat = metal.clone()
  shellMat.side = THREE.DoubleSide
  disposables.push(shellMat)

  const parts: Part[] = []
  const meshOf = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    disposables.push(geo)
    return new THREE.Mesh(geo, mat)
  }
  const add = (index: number, group: THREE.Group, home: [number, number, number], offset: [number, number, number]) => {
    group.position.set(...home)
    root.add(group)
    parts.push({
      index,
      label: materials.parts[index],
      order: ORDER[index],
      object: group,
      home: group.position.clone(),
      offset: new THREE.Vector3(...offset),
    })
  }

  // — Headband shell + pad (arcs over the top).
  {
    const g = new THREE.Group()
    g.add(meshOf(new THREE.TorusGeometry(0.55, 0.03, 14, 72, Math.PI), metal))
    add(0, g, [0, 0.2, 0], [0, 0.62, 0])
    const p = new THREE.Group()
    const pad = meshOf(new THREE.TorusGeometry(0.5, 0.042, 14, 72, Math.PI), leather)
    pad.scale.z = 0.55
    p.add(pad)
    add(1, p, [0, 0.17, 0], [0, 0.34, 0.12])
  }

  // — Cup assemblies, one per side. Parts are authored with the cup axis along local +x (outward).
  const sides = [
    { sign: -1, slider: 2, yoke: 4, shell: 6, cushion: 8, driver: 10, magnet: 12, board: 14, grille: 19, seal: 22 },
    { sign: 1, slider: 3, yoke: 5, shell: 7, cushion: 9, driver: 11, magnet: 13, board: 15, grille: 20, seal: 23 },
  ]
  for (const s of sides) {
    const cx = s.sign * CUP_X
    const place = (index: number, g: THREE.Group, axis: number, off: [number, number, number]) => {
      g.rotation.y = s.sign > 0 ? 0 : Math.PI
      add(index, g, [cx + s.sign * axis, CUP_Y, 0], [s.sign * off[0], off[1], off[2]])
    }

    // Spring slider: a steel rod from the band end into the yoke.
    {
      const g = new THREE.Group()
      const rod = meshOf(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 14), steel)
      g.add(rod)
      add(s.slider, g, [cx, 0.2 - 0.0, 0], [0, 0.95, 0])
    }
    // Yoke: a halo bracket that cups the shell, in the plane across the cup axis.
    {
      const g = new THREE.Group()
      const arc = meshOf(new THREE.TorusGeometry(0.24, 0.017, 10, 40, Math.PI), metal)
      arc.rotation.y = Math.PI / 2
      g.add(arc)
      place(s.yoke, g, 0.0, [0, -0.5, 0.05])
    }
    // Cup shell: a lathe, open toward the head, closed outward.
    {
      const g = new THREE.Group()
      const profile = [
        [0.19, -0.075], [0.215, -0.03], [0.212, 0.03], [0.185, 0.085], [0.12, 0.105], [0.0, 0.108],
      ].map(([r, x]) => new THREE.Vector2(r, x))
      g.add(meshOf(alongX(new THREE.LatheGeometry(profile, 56), 'y'), shellMat))
      place(s.shell, g, 0.0, [1.15, 0, 0])
    }
    // Cushion: a leather torus facing the ear.
    {
      const g = new THREE.Group()
      const t = meshOf(alongX(new THREE.TorusGeometry(0.17, 0.078, 22, 56), 'z'), leather)
      t.scale.x = 0.75
      g.add(t)
      place(s.cushion, g, -0.15, [0.1, 0.02, 0])
    }
    // Driver: coated cone + voice-coil can.
    {
      const g = new THREE.Group()
      g.add(meshOf(alongX(new THREE.CylinderGeometry(0.15, 0.15, 0.018, 40), 'y'), gun))
      const dome = meshOf(alongX(new THREE.SphereGeometry(0.11, 32, 12, 0, Math.PI * 2, 0, 0.9), 'y'), brass)
      dome.rotation.z = -Math.PI / 2
      dome.scale.set(0.5, 1, 1)
      dome.position.x = -0.012
      g.add(dome)
      place(s.driver, g, -0.01, [0.72, 0.04, 0])
    }
    // Magnet ring.
    {
      const g = new THREE.Group()
      g.add(meshOf(alongX(new THREE.TorusGeometry(0.105, 0.036, 14, 40), 'z'), gun))
      place(s.magnet, g, 0.04, [0.9, -0.03, 0])
    }
    // Board: a PCB with a few chips.
    {
      const g = new THREE.Group()
      g.add(meshOf(new THREE.BoxGeometry(0.012, 0.25, 0.2), pcb))
      for (const [y, z, w] of [[0.06, 0.03, 0.06], [-0.05, -0.04, 0.05], [0.0, 0.06, 0.035]] as const) {
        const c = meshOf(new THREE.BoxGeometry(0.014, w, w * 1.3), chip)
        c.position.set(0.012, y, z)
        g.add(c)
      }
      place(s.board, g, 0.075, [1.34, 0.12, 0])
    }
    // Grille: concentric rings behind the ear cushion.
    {
      const g = new THREE.Group()
      for (const r of [0.165, 0.12, 0.075, 0.03]) {
        g.add(meshOf(alongX(new THREE.TorusGeometry(r, 0.006, 8, 48), 'z'), dbl))
      }
      place(s.grille, g, -0.075, [0.5, -0.02, 0])
    }
    // Seal ring: a thin silicone gasket.
    {
      const g = new THREE.Group()
      g.add(meshOf(alongX(new THREE.TorusGeometry(0.19, 0.013, 10, 56), 'z'), silicone))
      place(s.seal, g, -0.062, [0.3, 0, 0])
    }
  }

  // — Single parts that don't belong to one side.
  {
    // Battery: sits in the left cup.
    const g = new THREE.Group()
    const body = meshOf(new THREE.BoxGeometry(0.05, 0.2, 0.12), gun)
    g.add(body)
    const stripe = meshOf(new THREE.BoxGeometry(0.052, 0.2, 0.014), brass)
    stripe.position.z = 0.02
    g.add(stripe)
    add(16, g, [-CUP_X - 0.02, CUP_Y - 0.0, 0.02], [-0.55, -0.62, 0])
  }
  {
    // Mic ports ×8: four on each cup rim, brass-lipped.
    const g = new THREE.Group()
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        const m = meshOf(alongX(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 14), 'y'), brass)
        m.position.set(sign * (CUP_X + 0.1), CUP_Y + Math.sin(a) * 0.2, Math.cos(a) * 0.2)
        g.add(m)
      }
    }
    add(17, g, [0, 0, 0], [0, 0.0, 0.85])
  }
  {
    // Hinge pins ×4: where each yoke meets its slider and the shell.
    const g = new THREE.Group()
    for (const sign of [-1, 1]) {
      for (const z of [-0.22, 0.22]) {
        const p = meshOf(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 14), brass)
        p.rotation.z = Math.PI / 2
        p.position.set(sign * (CUP_X + 0.04), CUP_Y, z)
        g.add(p)
      }
    }
    add(18, g, [0, 0, 0], [0, 0, -0.85])
  }
  {
    // Touch plate on the right cup's outer face.
    const g = new THREE.Group()
    g.add(meshOf(alongX(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 40), 'y'), brass))
    g.add(meshOf(alongX(new THREE.TorusGeometry(0.095, 0.008, 8, 48), 'z'), steel))
    add(21, g, [CUP_X + 0.115, CUP_Y, 0], [1.6, 0.22, 0])
  }

  parts.sort((a, b) => a.index - b.index)

  return {
    root,
    parts,
    mats: { metal, shell: shellMat, leather },
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
