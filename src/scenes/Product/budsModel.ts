/**
 * SILENTIUM Buds — procedural model, 21 named parts: a charging case with its lid open, and two buds
 * seated in it. Original geometry. Same contract as `buildHeadphones()` so the same render pass draws it.
 * Model space: case centred on x, top face at y = 0, hinge along the back edge (z = -0.25).
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { productCopy } from '../../content/products'
import { FINISHES } from '../Materials/constants'
import type { HeadphoneModel, Part } from '../Materials/model'

const BAY_X = 0.22
/** The Buds are small: pull the exploded parts in so the whole thing stays framed. */
const EXPLODE = 0.5

export function buildBuds(): HeadphoneModel {
  const root = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const std = (p: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(p)
    disposables.push(m)
    return m
  }
  const metal = std({ color: FINISHES[0].metal, metalness: 0.9, roughness: 0.34 })
  const shell = metal.clone()
  shell.side = THREE.DoubleSide
  disposables.push(shell)
  // On the Buds "leather" is the silicone of the tips and the case's soft inner.
  const leather = std({ color: FINISHES[0].leather, metalness: 0, roughness: 0.7 })
  const brass = std({ color: 0xc6a15b, metalness: 1, roughness: 0.26 })
  const gun = std({ color: 0x2a2a2f, metalness: 0.85, roughness: 0.4 })
  const pcb = std({ color: 0x16271e, metalness: 0.2, roughness: 0.55 })
  const cell = std({ color: 0x9a9aa2, metalness: 1, roughness: 0.3 })
  const glow = std({ color: 0xefe9dd, emissive: 0xefe9dd, emissiveIntensity: 0.6, roughness: 0.5 })

  const labels = productCopy.buds.parts
  const parts: Part[] = []
  const meshOf = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    disposables.push(geo)
    return new THREE.Mesh(geo, mat)
  }
  let n = 0
  const add = (group: THREE.Group, home: [number, number, number], offset: [number, number, number]) => {
    const index = n++
    group.position.set(...home)
    root.add(group)
    parts.push({ index, label: labels[index], order: index, object: group, home: group.position.clone(), offset: new THREE.Vector3(...offset).multiplyScalar(EXPLODE) })
  }
  const group = (...kids: THREE.Object3D[]) => {
    const g = new THREE.Group()
    g.add(...kids)
    return g
  }
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z)
    return o
  }

  // 0 · Case base.
  add(group(at(meshOf(new RoundedBoxGeometry(0.95, 0.44, 0.5, 6, 0.16), shell), 0, -0.22, 0)), [0, 0, 0], [0, -0.7, 0])
  // 1 · Case lid, hinged at the back edge and swung open.
  {
    const lid = at(meshOf(new RoundedBoxGeometry(0.95, 0.3, 0.5, 6, 0.15), shell), 0, 0.15, 0.25)
    const g = group(lid)
    g.rotation.x = -1.95
    add(g, [0, 0, -0.25], [0, 0.85, -0.5])
  }
  // 2 · Hinge pin.
  {
    const pin = meshOf(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 20), brass)
    pin.rotation.z = Math.PI / 2
    add(group(pin), [0, 0.0, -0.25], [0, 0.35, -0.9])
  }
  // 3 · Case cell.
  add(
    group(meshOf(new THREE.BoxGeometry(0.52, 0.12, 0.3), gun), at(meshOf(new THREE.BoxGeometry(0.54, 0.124, 0.03), brass), 0, 0, 0.06)),
    [0, -0.2, 0],
    [0, -1.2, 0.1],
  )
  // 4 · Charging coil + board.
  {
    const coil = meshOf(new THREE.TorusGeometry(0.15, 0.018, 10, 40), brass)
    coil.rotation.x = Math.PI / 2
    add(group(coil, at(meshOf(new THREE.BoxGeometry(0.62, 0.012, 0.36), pcb), 0, -0.02, 0)), [0, -0.34, 0], [0, -1.7, 0])
  }
  // 5 · Status light.
  add(group(meshOf(new THREE.SphereGeometry(0.011, 16, 12), glow)), [0, -0.1, 0.255], [0, -0.1, 0.8])
  // 6 · Bud bays: dark soft wells with a brass lip.
  {
    const g = new THREE.Group()
    for (const s of [-1, 1]) {
      g.add(at(meshOf(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 40), leather), s * BAY_X, 0.004, 0))
      const lip = meshOf(new THREE.TorusGeometry(0.15, 0.009, 8, 48), brass)
      lip.rotation.x = Math.PI / 2
      g.add(at(lip, s * BAY_X, 0.01, 0))
    }
    add(g, [0, 0, 0], [0, 0.18, 0.55])
  }

  // 7–20 · The buds. Parts alternate L, R so the index order matches the labels (L then R).
  const sides = [-1, 1]
  const perSide = (build: (s: number) => THREE.Object3D[], home: (s: number) => [number, number, number], offset: (s: number) => [number, number, number]) => {
    for (const s of sides) add(group(...build(s)), home(s), offset(s))
  }
  const budY = 0.14
  // Bud shell (7, 8).
  perSide(
    () => {
      const body = meshOf(new THREE.SphereGeometry(0.115, 36, 24), shell)
      body.scale.set(1, 1.05, 0.92)
      return [body]
    },
    (s) => [s * BAY_X, budY, 0.02],
    (s) => [s * 0.9, 0.9, 0.35],
  )
  // Stem (9, 10).
  perSide(
    () => [at(meshOf(new THREE.CapsuleGeometry(0.04, 0.2, 8, 16), shell), 0, 0, 0)],
    (s) => [s * BAY_X, budY - 0.16, 0.02],
    (s) => [s * 0.9, 0.2, 0.35],
  )
  // Silicone tip (11, 12) — faces inward toward the ear.
  perSide(
    (s) => {
      const tip = meshOf(new THREE.SphereGeometry(0.06, 24, 16), leather)
      tip.scale.set(0.85, 1, 1)
      return [at(tip, -s * 0.0, 0, 0)]
    },
    (s) => [s * BAY_X - s * 0.115, budY - 0.01, 0.045],
    (s) => [-s * 0.55, 0.9, 0.5],
  )
  // Driver (13, 14).
  perSide(
    (s) => {
      const d = meshOf(new THREE.CylinderGeometry(0.065, 0.065, 0.034, 28), gun)
      d.rotation.z = Math.PI / 2
      const dome = meshOf(new THREE.SphereGeometry(0.04, 20, 10, 0, Math.PI * 2, 0, 1.0), brass)
      dome.rotation.z = (s > 0 ? 1 : -1) * Math.PI / 2
      dome.position.x = -s * 0.016
      return [d, dome]
    },
    (s) => [s * BAY_X - s * 0.045, budY + 0.01, 0.03],
    (s) => [-s * 1.0, 0.9, 0.9],
  )
  // Cell (15, 16).
  perSide(
    () => {
      const c = meshOf(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 20), cell)
      c.rotation.z = Math.PI / 2
      return [c]
    },
    (s) => [s * BAY_X + s * 0.045, budY - 0.01, -0.03],
    (s) => [s * 1.25, 0.6, -0.5],
  )
  // Microphone port (17, 18).
  perSide(
    () => [meshOf(new THREE.SphereGeometry(0.016, 14, 10), brass)],
    (s) => [s * BAY_X + s * 0.04, budY + 0.105, 0.03],
    (s) => [s * 0.7, 1.2, 0.2],
  )
  // Touch plate (19, 20) on the outer face.
  perSide(
    (s) => {
      const p = meshOf(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 32), brass)
      p.rotation.z = Math.PI / 2
      p.rotation.y = 0
      const ring = meshOf(new THREE.TorusGeometry(0.05, 0.005, 8, 36), cell)
      ring.rotation.y = Math.PI / 2
      return [p, at(ring, s * 0.0, 0, 0)]
    },
    (s) => [s * BAY_X + s * 0.108, budY + 0.0, 0.04],
    (s) => [s * 1.5, 0.3, 0.9],
  )

  // Seat the buds in the bays, slightly tilted outward like a held pair.
  for (const p of parts) if (p.index >= 7) p.object.rotation.z = 0

  parts.sort((a, b) => a.index - b.index)
  // Centre the assembly on the origin so it turns about its middle.
  const box = new THREE.Box3().setFromObject(root)
  const c = box.getCenter(new THREE.Vector3())
  for (const p of parts) {
    p.object.position.sub(c)
    p.home.copy(p.object.position)
  }

  return {
    root,
    parts,
    mats: { metal, shell, leather },
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
