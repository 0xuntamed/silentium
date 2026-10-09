import type * as THREE from 'three'
import { ScrollTrigger } from '../lib/gsap'
import { scrollSignal } from '../lib/scroll'
import { msSinceEntered } from '../lib/session'
import { spatialFrame } from '../lib/audio'
import { cursorSignal } from '../systems/cursor/cursorSignal'
import type { Tier } from '../lib/tier'
import { AncStage } from '../scenes/ANC/AncStage'
import { ancLive, updateAncLive } from '../scenes/ANC/live'
import { ProductStage } from '../scenes/Materials/ProductStage'
import { getFinish, productLive, updateProductLive } from '../scenes/Materials/live'
import { partProgress } from '../scenes/Materials/productState'
import { SpatialPass } from '../scenes/Spatial/SpatialPass'
import { spatialLive, updateSpatialLive } from '../scenes/Spatial/live'

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Owns the scene passes that share the one canvas — ANC, the product model, the Spatial field — and
 * builds each lazily, a couple of viewports ahead of the scene that needs it (PMREM, shader compiles
 * and render targets are not free). The Stage ticks it once per frame, then asks it to render.
 */
export class Passes {
  anc: AncStage | null = null
  product: ProductStage | null = null
  spatial: SpatialPass | null = null
  aspect: number

  constructor(
    readonly tier: Tier,
    readonly gl: THREE.WebGLRenderer,
    readonly camera: THREE.Camera,
    aspect: number,
  ) {
    this.aspect = aspect
  }

  ensureAnc() {
    if (!this.anc) {
      this.anc = new AncStage(this.tier, this.gl, this.aspect)
      void this.gl.compileAsync?.(this.anc.scene, this.camera)
    }
    return this.anc
  }

  ensureProduct() {
    if (!this.product) {
      this.product = new ProductStage(this.tier, this.gl, this.aspect)
      void this.gl.compileAsync?.(this.product.scene, this.camera)
    }
    return this.product
  }

  ensureSpatial() {
    if (!this.spatial) this.spatial = new SpatialPass(this.aspect)
    return this.spatial
  }

  resize(aspect: number) {
    this.aspect = aspect
    this.anc?.resize(this.gl, aspect)
    this.product?.resize(this.gl, aspect)
    this.spatial?.resize(aspect)
  }

  /** Once per frame: advance each scene's state and push it into its pass. */
  tick(dt: number, time: number) {
    const y = scrollSignal.y
    const vh = window.innerHeight
    const W = window.innerWidth
    const aspect = this.aspect

    updateAncLive(y, vh)
    updateProductLive(y)
    const pointer = {
      x: (cursorSignal.x / W - 0.5) * 2 * aspect,
      y: -(cursorSignal.y / vh - 0.5) * 2,
      lastAct: cursorSignal.lastAct,
      present: cursorSignal.x > -1000,
    }
    updateSpatialLive(dt, time * 1000, y, aspect, pointer)

    // Lazy construction, ahead of the scenes.
    const stA = ScrollTrigger.getById('scene-anc')
    const stS = ScrollTrigger.getById('scene-spatial')
    if (!this.anc && stA && y > stA.start - 2.5 * vh) this.ensureAnc()
    if (!this.spatial && stS && y > stS.start - 3.2 * vh) this.ensureSpatial()
    // The hero model: a couple of seconds after the bloom, so the bloom never hitches.
    if (!this.product && (msSinceEntered() > 2200 || (y > 0.2 * vh && msSinceEntered() >= 0))) this.ensureProduct()

    if (this.anc && ancLive.active) this.anc.update(Math.min(dt, 0.05), ancLive.state, ancLive.vis, time)
    if (this.spatial && spatialLive.active) this.spatial.update(time)
    if (this.product) {
      this.product.setFinish(getFinish())
      this.product.update(dt, productLive.state)
      if (productLive.state.vis > 0.003) this.projectLabels()
    }

    spatialFrame(spatialLive.active && spatialLive.vis > 0.35, spatialLive.src.x - spatialLive.head.x, spatialLive.src.y - spatialLive.head.y)
  }

  /** Project each part to the screen for the DOM labels; opacity follows its own assembly progress. */
  private projectLabels() {
    const product = this.product!
    const st = productLive.state
    const W = window.innerWidth
    const H = window.innerHeight
    const inMaterials = productLive.scene === 'materials'
    const parts = product.model.parts
    product.model.root.updateMatrixWorld(true)
    for (let i = 0; i < parts.length; i++) {
      const out = productLive.labels[i]
      product.project(i, this.camera, W, H, out)
      const u = partProgress(1 - st.explode, parts[i].order, parts.length)
      out.a = inMaterials ? sm(0.02, 0.16, u) * (1 - sm(0.82, 1, u)) * st.vis : 0
    }
  }

  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    if (this.anc && ancLive.active) this.anc.render(renderer, camera)
    if (this.spatial && spatialLive.active) this.spatial.render(renderer, camera)
    if (this.product && productLive.state.vis > 0.003) this.product.render(renderer, camera)
  }

  dispose() {
    this.anc?.dispose()
    this.product?.dispose()
    this.spatial?.dispose()
    this.anc = this.product = this.spatial = null
  }
}
