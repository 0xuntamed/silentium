/**
 * SILENTIUM One as a render pass in the shared canvas: one model that is assembled in the hero and
 * explodes into 24 parts in the Materials scene. Rendered into a premultiplied MSAA target, then
 * blitted (the canvas itself has no antialiasing).
 */
import * as THREE from 'three'
import { getEnvironment } from '../../gl/env'
import { buildHeadphones, FINISHES, type HeadphoneModel } from './model'
import { partProgress, productAnchor, type ProductState } from './productState'
import type { Tier } from '../../lib/tier'

const BLIT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uFade;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(uTex, vUv) * uFade;
  vec3 c = t.a > 1e-4 ? t.rgb / t.a : vec3(0.0);
  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(c * t.a, t.a);
}
`

export class ProductStage {
  readonly scene = new THREE.Scene()
  readonly blitScene = new THREE.Scene()
  readonly model: HeadphoneModel
  aspect: number
  /** Current visibility 0..1. */
  vis = 0
  private rt: THREE.WebGLRenderTarget
  private blitMat: THREE.ShaderMaterial
  private blitMesh: THREE.Mesh
  private finish = 0
  private finishTarget = 0
  private tmp = new THREE.Vector3()
  private disposables: { dispose(): void }[] = []

  constructor(tier: Tier, renderer: THREE.WebGLRenderer, aspect: number) {
    this.aspect = aspect
    this.model = buildHeadphones()
    this.scene.add(this.model.root)
    this.scene.environment = getEnvironment(renderer)
    this.scene.environmentIntensity = 1.9
    const key = new THREE.DirectionalLight(0xfff1dc, 2.2)
    key.position.set(-3, 4, 6)
    const rim = new THREE.DirectionalLight(0xe8c88a, 1.8)
    rim.position.set(4, 1, -3)
    this.scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15))

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: tier.name === 'full' ? 4 : 0,
      depthBuffer: true,
    })
    this.blitMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }',
      fragmentShader: BLIT_FRAG,
      uniforms: { uTex: { value: this.rt.texture }, uFade: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    })
    this.blitMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blitMat)
    this.blitMesh.scale.set(aspect, 1, 1)
    this.blitMesh.frustumCulled = false
    this.blitScene.add(this.blitMesh)
    this.disposables.push(this.rt, this.blitMat, this.blitMesh.geometry, this.model)
  }

  resize(renderer: THREE.WebGLRenderer, aspect: number) {
    this.aspect = aspect
    const s = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.rt.setSize(s.x, s.y)
    this.blitMesh.scale.set(aspect, 1, 1)
  }

  setFinish(i: number) {
    this.finishTarget = i
  }

  /** Apply a scene state: transform, explode, finish colours. */
  update(dt: number, st: ProductState, snap = false) {
    this.vis = st.vis
    const anchor = productAnchor(this.aspect)
    const root = this.model.root
    root.position.set(anchor.x + st.x, anchor.y + st.y, 0)
    // Exploded, the model is 4+ units wide — shrink it to keep the whole thing on screen.
    const fit = 1 - 0.42 * st.explode
    root.scale.setScalar(st.scale * anchor.k * fit)
    root.rotation.set(st.rotX, st.rotY, 0)

    const assembled = 1 - st.explode
    const n = this.model.parts.length
    for (const p of this.model.parts) {
      const u = partProgress(assembled, p.order, n)
      p.object.position.copy(p.home).addScaledVector(p.offset, 1 - u)
    }

    // Finishes: ease the shared materials toward the chosen colourway.
    const k = snap ? 1 : 1 - Math.exp(-5 * dt)
    this.finish += (this.finishTarget - this.finish) * k
    const a = FINISHES[Math.floor(this.finish)] ?? FINISHES[0]
    const b = FINISHES[Math.min(FINISHES.length - 1, Math.ceil(this.finish))] ?? a
    const f = this.finish - Math.floor(this.finish)
    const { metal, shell, leather } = this.model.mats
    for (const m of [metal, shell]) {
      m.color.set(a.metal).lerp(this.tmpColor.set(b.metal), f)
      m.metalness = a.metalness + (b.metalness - a.metalness) * f
      m.roughness = a.metalRough + (b.metalRough - a.metalRough) * f
    }
    leather.color.set(a.leather).lerp(this.tmpColor.set(b.leather), f)
    this.blitMat.uniforms.uFade.value = st.vis
  }
  private tmpColor = new THREE.Color()

  /** Screen position (CSS px) of a part's centre, for the DOM labels. */
  project(partIndex: number, camera: THREE.Camera, w: number, h: number, out: { x: number; y: number }) {
    this.model.parts[partIndex].object.getWorldPosition(this.tmp)
    this.tmp.project(camera)
    out.x = (this.tmp.x * 0.5 + 0.5) * w
    out.y = (0.5 - this.tmp.y * 0.5) * h
  }

  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.model.root.updateMatrixWorld(true)
    renderer.setRenderTarget(this.rt)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(this.scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(this.blitScene, camera)
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
  }
}
