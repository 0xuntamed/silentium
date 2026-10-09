/**
 * The ANC scene's WebGL half. Imperative three.js (not R3F components) so the Stage can run it as
 * a render pass inside the one persistent canvas:
 *
 *   ANC scene ──► render target (premultiplied, linear) ──► composite (bubble lens + desaturation)
 *
 * Everything here is a function of `AncState` (scroll progress) plus the ambient noise clock.
 */
import * as THREE from 'three'
import { getEnvironment } from '../../gl/env'
import { PROJECTION_GLSL, makeSeeds, phase, projectedPos, type ProjUniforms, type Seed } from './projection'
import { ancLayout, type AncLayout, type AncState } from './state'
import { EAR, EAR_POS, HAIR, SILHOUETTE, samplePolygon } from './profile'
import { WORD_COLS, WORD_ROWS, WORDS, buildWordAtlas } from './noiseAtlas'
import type { Tier } from '../../lib/tier'

const TRAIL = 8 // segments per noise streak
const WAVE_LINES = 9
const WAVE_SEGS = 220
const N_IMPACTS = 16
const TRACERS = 64

const GLSL_COMMON = /* glsl */ `
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453123); }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
`
const SHARED_UNIFORMS = /* glsl */ `
uniform vec2 uCenter;
uniform float uR;
uniform float uBMax;
uniform float uRs;
uniform float uTime;
`

const RIBBON_VERT = /* glsl */ `
attribute float aJ;
attribute float aSide;
attribute vec4 aSeed;
${SHARED_UNIFORMS}
uniform float uJag;
uniform float uHalfW;
varying float vA;
varying float vHot;
#define K ${TRAIL}.0
${GLSL_COMMON}
${PROJECTION_GLSL}
void main() {
  float u = ancPhase(aSeed, uTime);
  float du = 0.012 * (0.7 + aSeed.w * 0.8);
  float u0 = u - aJ * du;
  float u1 = u - (aJ + 1.0) * du;
  float valid = step(0.0, u1);
  float pen0; float pen1; vec2 r0; vec2 r1;
  vec2 p0 = ancPos(aSeed, max(u0, 0.0), pen0, r0);
  vec2 p1 = ancPos(aSeed, max(u1, 0.0), pen1, r1);
  vec2 t = p0 - p1;
  float tl = length(t);
  t = tl > 1e-6 ? t / tl : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  float zig = (mod(aJ, 2.0) < 1.0 ? 1.0 : -1.0) * uJag * (0.4 + h11(aSeed.x * 91.0 + aJ)) * smoothstep(0.5, 2.0, aJ);
  vec2 pos = p0 + n * (zig + aSide * uHalfW);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 0.0, 1.0);
  vA = pow(1.0 - aJ / K, 1.5) * valid * smoothstep(0.0, 0.04, u) * (1.0 - smoothstep(0.93, 1.0, u));
  vHot = pen0;
}
`
const RIBBON_FRAG = /* glsl */ `
precision highp float;
uniform float uSat;
uniform float uFade;
varying float vA;
varying float vHot;
${GLSL_COMMON}
void main() {
  vec3 red = lin(vec3(0.949, 0.329, 0.176));
  vec3 ash = lin(vec3(0.659, 0.639, 0.604));
  vec3 bone = lin(vec3(0.937, 0.914, 0.867));
  vec3 col = mix(ash, red, uSat);
  col = mix(col, bone, clamp(vHot * 1.5, 0.0, 1.0));
  float a = vA * 0.85 * uFade;
  gl_FragColor = vec4(col * a, a);
}
`

const SPRITE_VERT = /* glsl */ `
attribute vec4 aSeed;
attribute float aKind;
${SHARED_UNIFORMS}
varying vec2 vUv;
varying float vKind;
varying float vA;
varying float vId;
${GLSL_COMMON}
${PROJECTION_GLSL}
void main() {
  float isWord = step(-0.5, aKind);
  float u = ancPhase(aSeed, uTime * mix(1.0, 0.55, isWord));
  float pen; vec2 raw; float pen2; vec2 raw2;
  vec2 p = ancPos(aSeed, u, pen, raw);
  vec2 pPrev = ancPos(aSeed, max(u - 0.004, 0.0), pen2, raw2);
  vec2 vel = p - pPrev;
  vel = length(vel) > 1e-7 ? normalize(vel) : vec2(1.0, 0.0);
  float ang = mix(atan(vel.y, vel.x) + uTime * (aSeed.z - 0.5) * 8.0, (aSeed.y - 0.5) * 0.35, isWord);
  float sz = mix(0.022 + 0.034 * aSeed.w, 0.042 + 0.03 * aSeed.w, isWord);
  vec2 sc = mix(vec2(sz), vec2(sz * 4.0, sz), isWord);
  vec2 l = position.xy * sc;
  float c = cos(ang); float s = sin(ang);
  vec2 pos = p + vec2(c * l.x - s * l.y, s * l.x + c * l.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 0.0, 1.0);
  vUv = vec2(position.x + 0.5, 0.5 - position.y);
  vKind = aKind;
  vId = floor(aSeed.x * 1000.0);
  vA = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.92, 1.0, u));
}
`
const SPRITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uWords;
uniform float uWordsReady;
uniform float uClock;
uniform float uSat;
uniform float uFade;
varying vec2 vUv;
varying float vKind;
varying float vA;
varying float vId;
${GLSL_COMMON}
void main() {
  vec3 red = lin(vec3(0.949, 0.329, 0.176));
  vec3 ash = lin(vec3(0.659, 0.639, 0.604));
  vec3 tint = mix(ash, red, uSat);
  if (vKind < -0.5) {
    float e = (1.0 - vUv.y) - abs(vUv.x - 0.5) * 2.0;
    float a = smoothstep(0.0, 0.12, e) * vA * 0.9 * uFade;
    gl_FragColor = vec4(tint * a, a);
    return;
  }
  if (uWordsReady < 0.5) discard;
  float tick = floor(uClock * 10.0);
  float g = step(0.9, h11(vId + tick));
  float row = floor(vUv.y * 9.0);
  float sl = step(0.7, h11(row + vId + tick * 3.0));
  float shift = g * sl * 0.07 * (h11(vId + tick) - 0.5) * 2.0;
  float split = 0.012 + g * 0.03;
  vec2 cell = vec2(mod(vKind, ${WORD_COLS}.0), floor(vKind / ${WORD_COLS}.0));
  float x0 = clamp(vUv.x + shift, 0.0, 1.0);
  float xr = clamp(x0 + split, 0.0, 1.0);
  float xb = clamp(x0 - split, 0.0, 1.0);
  vec2 grid = vec2(${WORD_COLS}.0, ${WORD_ROWS}.0);
  float cr = texture2D(uWords, (cell + vec2(xr, vUv.y)) / grid).a;
  float cg = texture2D(uWords, (cell + vec2(x0, vUv.y)) / grid).a;
  float cb = texture2D(uWords, (cell + vec2(xb, vUv.y)) / grid).a;
  float a = max(cr, max(cg, cb)) * vA * 0.9 * uFade;
  vec3 rgb = vec3(cr, cg * 0.55, cb * 0.7) * tint * 1.5 * vA * 0.9 * uFade;
  gl_FragColor = vec4(rgb, a);
}
`

const WAVE_VERT = /* glsl */ `
attribute float aT;
attribute float aSide;
attribute float aLine;
uniform vec2 uCenter;
uniform float uR;
uniform float uTime;
uniform float uAspect;
uniform float uCorrupt;
uniform float uHalfW;
varying float vEdge;
varying float vCalm;
#define L ${WAVE_LINES}.0
${GLSL_COMMON}
float noise1(float x, float line) {
  float i = floor(x);
  float f = fract(x);
  return mix(h11(i + line * 31.7), h11(i + 1.0 + line * 31.7), f) * 2.0 - 1.0;
}
float waveY(float x, float line, float baseY, out float calm) {
  float dist = length(vec2(x, baseY) - uCenter);
  calm = uR > 0.001 ? 1.0 - smoothstep(uR * 0.9, uR * 1.03, dist) : 0.0;
  float jag = noise1(x * 16.0 - uTime * 1.7, line) * 0.075 + noise1(x * 41.0 + uTime * 2.9, line + 7.0) * 0.035;
  float sine = 0.028 * sin(x * 5.8 - uTime * 1.2 + line * 0.6);
  float sheaf = 0.12 * sin(x * 3.0 - uTime * 1.4 + line * 0.5);
  return mix(mix(sheaf, jag, uCorrupt), sine, calm);
}
void main() {
  float x = (aT * 2.0 - 1.0) * (uAspect + 0.12);
  float baseY = uCenter.y + (aLine - (L - 1.0) * 0.5) * 0.15 + 0.02;
  float calm; float calm2;
  float y = baseY + waveY(x, aLine, baseY, calm);
  float dx = 0.004;
  float y2 = baseY + waveY(x + dx, aLine, baseY, calm2);
  vec2 t = normalize(vec2(dx, y2 - y));
  vec2 n = vec2(-t.y, t.x);
  vec2 pos = vec2(x, y) + n * aSide * uHalfW;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, -0.05, 1.0);
  vEdge = smoothstep(0.0, 0.08, aT) * (1.0 - smoothstep(0.92, 1.0, aT));
  vCalm = calm;
}
`
const WAVE_FRAG = /* glsl */ `
precision highp float;
uniform float uSat;
uniform float uAlpha;
varying float vEdge;
varying float vCalm;
${GLSL_COMMON}
void main() {
  vec3 red = lin(vec3(0.949, 0.329, 0.176));
  vec3 ash = lin(vec3(0.659, 0.639, 0.604));
  vec3 brass = lin(vec3(0.776, 0.631, 0.357));
  vec3 noisy = mix(ash, red, uSat * 0.8);
  vec3 col = mix(noisy, brass, vCalm);
  float a = vEdge * uAlpha * mix(0.55, 0.95, vCalm);
  gl_FragColor = vec4(col * a, a);
}
`

const COMP_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`
const COMP_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uCenter;
uniform float uR;
uniform float uAspect;
uniform float uTime;
uniform float uEngaged;
uniform float uSat;
uniform float uFade;
uniform float uRing;
uniform float uLite;
uniform vec2 uImp[${N_IMPACTS}];
varying vec2 vUv;
const float PI = 3.14159265359;
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  vec2 w = (vUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
  vec2 d = w - uCenter;
  float r = length(d) + 1e-5;
  float q = uR > 1e-4 ? r / uR : 9.0;
  vec2 dir = d / r;
  float inside = 1.0 - smoothstep(0.985, 1.0, q);
  float ang = atan(d.y, d.x);

  // Shell ripples where noise strikes.
  float hit = 0.0;
  for (int i = 0; i < ${N_IMPACTS}; i++) {
    float da = abs(mod(ang - uImp[i].x + PI, 2.0 * PI) - PI);
    hit += uImp[i].y * exp(-da * da * 14.0);
  }
  float band = exp(-pow((q - 1.0) * 34.0, 2.0));
  float halo = exp(-pow((q - 1.0) * 6.0, 2.0)) * step(1.0, q) * 0.5;
  float dome = 1.0 - clamp(q * q, 0.0, 1.0);

  // Lens: magnify the interior a touch, wobble the rim.
  vec2 off = -dir * 0.04 * dome * uEngaged * (1.0 - uLite);
  off += dir * hit * band * 0.012 * sin((q - 1.0) * 70.0 - uTime * 12.0) * (1.0 - uLite);
  vec2 uvOff = off / vec2(2.0 * uAspect, 2.0);
  float ca = 0.0015 * smoothstep(0.55, 1.0, q) * inside * uEngaged * (1.0 - uLite);
  vec2 caOff = dir * ca / vec2(2.0 * uAspect, 2.0);
  vec4 tc = texture2D(uTex, vUv + uvOff);
  float tr = texture2D(uTex, vUv + uvOff + caOff).r;
  float tb = texture2D(uTex, vUv + uvOff - caOff).b;
  vec4 t = vec4(tr, tc.g, tb, tc.a);

  // Outside the field the world drains of colour and loses a little light.
  float luma = dot(t.rgb, vec3(0.2126, 0.7152, 0.0722));
  float satOut = mix(1.0, uSat, 1.0 - inside);
  t.rgb = mix(vec3(luma), t.rgb, satOut);
  t.rgb *= mix(1.0 - 0.22 * uEngaged, 1.0 + 0.12 * uEngaged, inside);

  // Rim: a brass fresnel edge that flares where it is hit.
  vec3 brass = lin(vec3(0.776, 0.631, 0.357));
  float rim = band * uEngaged * uRing;
  float glow = rim * (0.34 + 1.5 * hit) + halo * 0.05 * uEngaged * uRing + pow(smoothstep(0.72, 1.0, q), 3.0) * inside * 0.05 * uEngaged * uRing;
  t.rgb += brass * glow;
  t.a = clamp(t.a + glow, 0.0, 1.0);

  t *= uFade;
  // Linear → sRGB on the un-premultiplied colour, then premultiply again.
  vec3 c = t.a > 1e-4 ? t.rgb / t.a : vec3(0.0);
  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(c * t.a, t.a);
}
`

// DoubleSide: ribbon winding flips with the particle's direction of travel.
const premult = { side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor } as const

/** Built-in materials need `premultipliedAlpha` to write into a premultiplied target. */
function std(params: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial({ ...params, premultipliedAlpha: true })
}

export class AncStage {
  readonly scene = new THREE.Scene()
  readonly compScene = new THREE.Scene()
  readonly seeds: Seed[]
  layout: AncLayout
  aspect: number
  private rt: THREE.WebGLRenderTarget
  private lite: boolean
  private figure = new THREE.Group()
  private hp = new THREE.Group()
  private cup = new THREE.Group()
  private band = new THREE.Group()
  private clickRing: THREE.Mesh
  private compMesh: THREE.Mesh
  private compMat: THREE.ShaderMaterial
  private waveMat: THREE.ShaderMaterial
  private ribbonMat: THREE.ShaderMaterial
  private spriteMat: THREE.ShaderMaterial
  private shared: Record<string, THREE.IUniform>
  private noiseTime = 0
  private disposables: { dispose(): void }[] = []
  readonly impacts = new Float32Array(N_IMPACTS * 2)
  private uImp: THREE.Vector2[] = Array.from({ length: N_IMPACTS }, () => new THREE.Vector2())
  private nRibbons: number

  constructor(tier: Tier, renderer: THREE.WebGLRenderer, aspect: number) {
    this.lite = tier.name !== 'full'
    this.aspect = aspect
    this.layout = ancLayout(aspect)
    this.nRibbons = this.lite ? 150 : 340
    this.seeds = makeSeeds(this.nRibbons + 400)

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: this.lite ? 0 : 4,
      depthBuffer: true,
    })
    this.disposables.push(this.rt)

    this.shared = {
      uCenter: { value: new THREE.Vector2(this.layout.cx, this.layout.cy) },
      uR: { value: 0 },
      uBMax: { value: 1.6 * this.layout.rMax },
      uRs: { value: this.layout.rs },
      uTime: { value: 0 },
    }

    this.buildEnvironment(renderer)
    this.buildFigure()
    this.ribbonMat = this.buildRibbons()
    this.spriteMat = this.buildSprites()
    this.waveMat = this.buildWaves()
    const comp = this.buildComposite()
    this.compMesh = comp.mesh
    this.compMat = comp.mat

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.636, 96),
      new THREE.MeshBasicMaterial({ color: 0xc6a15b, transparent: true, opacity: 0, premultipliedAlpha: true, depthTest: false }),
    )
    ring.position.set(EAR_POS[0], EAR_POS[1], 0.9)
    this.clickRing = ring
    this.figure.add(ring)
    this.disposables.push(ring.geometry, ring.material as THREE.Material)

    this.applyLayout()
  }

  // ───────────────────────── construction ─────────────────────────

  private buildEnvironment(renderer: THREE.WebGLRenderer) {
    this.scene.environment = getEnvironment(renderer)
    const key = new THREE.DirectionalLight(0xfff1dc, 1.4)
    key.position.set(-3, 4, 6)
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.12))
  }

  private buildFigure() {
    const fillPts = samplePolygon(SILHOUETTE, 420)
    const shape = new THREE.Shape(fillPts.map(([x, y]) => new THREE.Vector2(x, y)))
    const fillGeo = new THREE.ShapeGeometry(shape)
    // Fade the body out below the shoulders so it dissolves instead of ending in a hard edge.
    const pos = fillGeo.getAttribute('position')
    const col = new Float32Array(pos.count * 4)
    const base = new THREE.Color(0x141416)
    for (let i = 0; i < pos.count; i++) {
      col.set([base.r, base.g, base.b, Math.min(1, Math.max(0, (pos.getY(i) + 4.7) / 2.3))], i * 4)
    }
    fillGeo.setAttribute('color', new THREE.BufferAttribute(col, 4))
    const fill = new THREE.Mesh(
      fillGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, premultipliedAlpha: true }),
    )
    this.figure.add(fill)

    const lineMat = (opacity: number) =>
      new THREE.LineBasicMaterial({ color: 0xefe9dd, transparent: true, opacity, premultipliedAlpha: true })
    const mkLine = (path: typeof SILHOUETTE, n: number, opacity: number, z = 0.01) => {
      const pts = samplePolygon(path, n).map(([x, y]) => new THREE.Vector3(x, y, z))
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(opacity))
      this.figure.add(line)
      this.disposables.push(line.geometry, line.material as THREE.Material)
    }
    mkLine(SILHOUETTE.slice(0, 9), 220, 0.6)
    mkLine(SILHOUETTE.slice(14), 120, 0.4)
    mkLine(EAR, 80, 0.32, 0.02)
    mkLine(HAIR, 80, 0.2, 0.02)
    this.disposables.push(fillGeo, fill.material as THREE.Material)

    // — Headphones (procedural): shell, brass ring, cushion, yoke and band. Head units.
    const alu = std({ color: 0x3a3a40, metalness: 0.9, roughness: 0.34 })
    const plate = std({ color: 0x1b1b1e, metalness: 0.8, roughness: 0.5 })
    const brass = std({ color: 0xc6a15b, metalness: 1, roughness: 0.26 })
    const leather = std({ color: 0x101012, metalness: 0, roughness: 0.72 })
    this.disposables.push(alu, plate, brass, leather)

    const profile = [
      [0.0, 0.2], [0.46, 0.2], [0.58, 0.15], [0.63, 0.04], [0.62, -0.08], [0.55, -0.17], [0.0, -0.17],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const shellGeo = new THREE.LatheGeometry(profile, 72)
    const shell = new THREE.Mesh(shellGeo, alu)
    shell.rotation.x = Math.PI / 2
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.44, 64), plate)
    face.position.z = 0.202
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.02, 12, 96), brass)
    ring.position.z = 0.2
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.068, 48), brass)
    mark.position.z = 0.206
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.02, 24), brass)
    dot.position.z = 0.207
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.14, 24, 72), leather)
    cushion.scale.z = 0.75
    cushion.position.z = -0.2
    this.cup.add(shell, face, ring, mark, dot, cushion)
    this.cup.rotation.y = -0.22
    this.cup.position.set(EAR_POS[0], EAR_POS[1], 0.45)

    // Band: a tube arcing over the crown, with a leather pad on the inside.
    const arc = [
      [0.28, 0.5, 0.35], [0.4, 0.78, 0.3], [0.5, 1.02, 0.18], [0.36, 1.24, 0.05], [0.02, 1.3, -0.05], [-0.42, 1.2, -0.12], [-0.74, 0.98, -0.2],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
    const curve = new THREE.CatmullRomCurve3(arc)
    const bandGeo = new THREE.TubeGeometry(curve, 90, 0.058, 14, false)
    const padCurve = new THREE.CatmullRomCurve3(arc.map((v) => new THREE.Vector3(v.x * 0.95, v.y - 0.1, v.z)))
    const padGeo = new THREE.TubeGeometry(padCurve, 90, 0.04, 10, false)
    this.band.add(new THREE.Mesh(bandGeo, alu), new THREE.Mesh(padGeo, leather))
    // Yoke: cup top to band.
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16), alu)
    yoke.position.set(0.28, 0.58, 0.4)
    this.band.add(yoke)

    this.hp.add(this.cup, this.band)
    this.figure.add(this.hp)
    this.disposables.push(shellGeo, face.geometry, ring.geometry, mark.geometry, dot.geometry, cushion.geometry, bandGeo, padGeo, yoke.geometry)
    this.scene.add(this.figure)
  }

  private buildRibbons(): THREE.ShaderMaterial {
    const per = (TRAIL + 1) * 2
    const aJ = new Float32Array(per)
    const aSide = new Float32Array(per)
    const index: number[] = []
    for (let j = 0; j <= TRAIL; j++) {
      aJ[j * 2] = j
      aJ[j * 2 + 1] = j
      aSide[j * 2] = -1
      aSide[j * 2 + 1] = 1
      if (j < TRAIL) {
        const a = j * 2
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const geo = new THREE.InstancedBufferGeometry()
    geo.setIndex(index)
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(per * 3), 3))
    geo.setAttribute('aJ', new THREE.BufferAttribute(aJ, 1))
    geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1))
    const seed = new Float32Array(this.nRibbons * 4)
    for (let i = 0; i < this.nRibbons; i++) {
      const s = this.seeds[i]
      seed.set([s.a, s.b, s.c, s.d], i * 4)
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4))
    geo.instanceCount = this.nRibbons

    const mat = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERT,
      fragmentShader: RIBBON_FRAG,
      uniforms: { ...this.shared, uJag: { value: 0.01 }, uHalfW: { value: 0.0016 }, uSat: { value: 1 }, uFade: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      ...premult,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.renderOrder = 1
    this.scene.add(mesh)
    this.disposables.push(geo, mat)
    return mat
  }

  private buildSprites(): THREE.ShaderMaterial {
    const shards = this.lite ? 50 : 150
    const words = this.lite ? 6 : 22
    const n = shards + words
    const quad = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    const seed = new Float32Array(n * 4)
    const kind = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const s = this.seeds[this.nRibbons + i]
      seed.set([s.a, s.b, s.c, s.d], i * 4)
      kind[i] = i < shards ? -1 : (i - shards) % WORDS.length
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4))
    geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1))
    geo.instanceCount = n

    const tex = new THREE.Texture()
    const mat = new THREE.ShaderMaterial({
      vertexShader: SPRITE_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms: {
        ...this.shared,
        uWords: { value: tex },
        uWordsReady: { value: 0 },
        uClock: { value: 0 },
        uSat: { value: 1 },
        uFade: { value: 1 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      ...premult,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.renderOrder = 2
    this.scene.add(mesh)
    this.disposables.push(geo, mat, tex)
    void buildWordAtlas().then((canvas) => {
      const t = new THREE.CanvasTexture(canvas)
      t.flipY = false
      t.colorSpace = THREE.NoColorSpace
      t.minFilter = THREE.LinearMipmapLinearFilter
      mat.uniforms.uWords.value = t
      mat.uniforms.uWordsReady.value = 1
      this.disposables.push(t)
    })
    return mat
  }

  private buildWaves(): THREE.ShaderMaterial {
    const per = (WAVE_SEGS + 1) * 2
    const aT = new Float32Array(WAVE_LINES * per)
    const aSide = new Float32Array(WAVE_LINES * per)
    const aLine = new Float32Array(WAVE_LINES * per)
    const index: number[] = []
    for (let l = 0; l < WAVE_LINES; l++) {
      for (let s = 0; s <= WAVE_SEGS; s++) {
        const v = l * per + s * 2
        aT[v] = aT[v + 1] = s / WAVE_SEGS
        aSide[v] = -1
        aSide[v + 1] = 1
        aLine[v] = aLine[v + 1] = l
        if (s < WAVE_SEGS) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setIndex(index)
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WAVE_LINES * per * 3), 3))
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1))
    geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1))
    geo.setAttribute('aLine', new THREE.BufferAttribute(aLine, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: WAVE_VERT,
      fragmentShader: WAVE_FRAG,
      uniforms: {
        ...this.shared,
        uAspect: { value: this.aspect },
        uCorrupt: { value: 0 },
        uHalfW: { value: 0.0026 },
        uSat: { value: 1 },
        uAlpha: { value: 0 },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      ...premult,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.renderOrder = 0
    this.scene.add(mesh)
    this.disposables.push(geo, mat)
    return mat
  }

  private buildComposite() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: COMP_VERT,
      fragmentShader: COMP_FRAG,
      uniforms: {
        uTex: { value: this.rt.texture },
        uCenter: this.shared.uCenter,
        uR: this.shared.uR,
        uAspect: { value: this.aspect },
        uTime: { value: 0 },
        uEngaged: { value: 0 },
        uSat: { value: 1 },
        uFade: { value: 1 },
        uRing: { value: 1 },
        uLite: { value: this.lite ? 1 : 0 },
        uImp: { value: this.uImp },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      ...premult,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    mesh.scale.set(this.aspect, 1, 1)
    mesh.frustumCulled = false
    this.compScene.add(mesh)
    this.disposables.push(mesh.geometry, mat)
    return { mesh, mat }
  }

  // ───────────────────────── per-frame ─────────────────────────

  private applyLayout() {
    const { cx, cy, head } = this.layout
    this.figure.position.set(cx, cy, 0)
    this.figure.scale.setScalar(head)
    this.shared.uCenter.value.set(cx, cy)
    this.shared.uBMax.value = 1.6 * this.layout.rMax
    this.shared.uRs.value = this.layout.rs
  }

  resize(renderer: THREE.WebGLRenderer, aspect: number) {
    this.aspect = aspect
    this.layout = ancLayout(aspect)
    const s = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.rt.setSize(s.x, s.y)
    this.compMesh.scale.set(aspect, 1, 1)
    this.compMat.uniforms.uAspect.value = aspect
    this.waveMat.uniforms.uAspect.value = aspect
    this.applyLayout()
  }

  private uni(): ProjUniforms {
    return {
      cx: this.layout.cx,
      cy: this.layout.cy,
      R: this.shared.uR.value as number,
      bMax: this.shared.uBMax.value as number,
      rs: this.shared.uRs.value as number,
    }
  }

  /** Advance the ambient clock and push `st` into every uniform and transform. `vis` = scene visibility 0..1. */
  update(dt: number, st: AncState, vis: number, wallTime: number) {
    this.noiseTime = (this.noiseTime + dt * st.timeScale) % 1000
    const R = this.layout.rMax * st.radius
    this.shared.uR.value = R
    this.shared.uTime.value = this.noiseTime

    const fade = st.fade * vis
    this.ribbonMat.uniforms.uSat.value = st.sat
    this.ribbonMat.uniforms.uFade.value = fade
    this.ribbonMat.uniforms.uJag.value = 0.011 * (1 - 0.45 * st.engaged)
    this.spriteMat.uniforms.uSat.value = st.sat
    this.spriteMat.uniforms.uFade.value = fade
    this.spriteMat.uniforms.uClock.value = wallTime
    this.waveMat.uniforms.uSat.value = st.sat
    this.waveMat.uniforms.uAlpha.value = st.waves * vis
    this.waveMat.uniforms.uCorrupt.value = st.corrupt

    // Figure: the headphones descend and seat; the click presses them in.
    const fit = st.fit
    this.hp.position.y = (1 - fit) * 7.6
    this.hp.rotation.z = (1 - fit) * 0.16
    this.hp.scale.setScalar(1 + 0.03 * st.click)
    this.cup.position.z = 0.45 + Math.max(0, 1 - fit) * 0.6
    this.band.scale.x = 1 + 0.05 * Math.max(0, 1 - fit)
    const ringOn = st.clickRing > 0 && st.clickRing < 1
    const rm = this.clickRing.material as THREE.MeshBasicMaterial
    rm.opacity = ringOn ? (1 - st.clickRing) * 0.85 : 0
    this.clickRing.scale.setScalar(1 + st.clickRing * 1.6)

    const c = this.compMat.uniforms
    c.uTime.value = wallTime
    c.uEngaged.value = st.engaged
    c.uSat.value = st.sat
    c.uFade.value = fade
    c.uRing.value = st.ring

    this.computeImpacts()
  }

  /** Tracers: evaluate the same closed-form flow on the CPU to find where the shell is being struck. */
  private computeImpacts() {
    const U = this.uni()
    const hits: { a: number; s: number }[] = []
    if (U.R > 0.02) {
      for (let i = 0; i < TRACERS; i++) {
        const s = this.seeds[i]
        const p = projectedPos(s, phase(s, this.noiseTime), U)
        if (p.pen > 0.04) hits.push({ a: Math.atan2(p.ry - U.cy, p.rx - U.cx), s: Math.min(1, p.pen * 2.2) })
      }
      hits.sort((x, y) => y.s - x.s)
    }
    for (let i = 0; i < N_IMPACTS; i++) {
      const h = hits[i]
      this.uImp[i].set(h ? h.a : 0, h ? h.s : 0)
    }
  }

  /** Render the scene into the target, then composite onto the screen (premultiplied over transparent). */
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    renderer.setRenderTarget(this.rt)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(this.scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(this.compScene, camera)
  }

  /**
   * GPU↔CPU parity: run the GLSL projection for N particles on the GPU into a float target and compare
   * with `projectedPos`. Returns the worst positional error in world units.
   */
  parity(renderer: THREE.WebGLRenderer, R: number, u = 0.55): { maxError: number; n: number } {
    const n = 64
    const aIdx = new Float32Array(n)
    const seeds = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
      aIdx[i] = i
      const s = this.seeds[i]
      seeds.set([s.a, s.b, s.c, s.d], i * 4)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    geo.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uCenter: { value: new THREE.Vector2(this.layout.cx, this.layout.cy) },
        uR: { value: R },
        uBMax: this.shared.uBMax,
        uRs: this.shared.uRs,
        uTime: { value: 0 },
        uU: { value: u },
      },
      vertexShader: /* glsl */ `
        attribute float aIdx;
        attribute vec4 aSeed;
        ${SHARED_UNIFORMS}
        uniform float uU;
        varying vec3 vOut;
        ${PROJECTION_GLSL}
        void main() {
          float pen; vec2 raw;
          vec2 p = ancPos(aSeed, uU, pen, raw);
          vOut = vec3(p, pen);
          gl_Position = vec4((aIdx + 0.5) / ${n}.0 * 2.0 - 1.0, 0.0, 0.0, 1.0);
          gl_PointSize = 1.0;
        }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vOut;
        void main() { gl_FragColor = vec4(vOut, 1.0); }`,
      blending: THREE.NoBlending,
      depthTest: false,
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    const scene = new THREE.Scene()
    scene.add(pts)
    const target = new THREE.WebGLRenderTarget(n, 1, { type: THREE.FloatType, depthBuffer: false })
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const prevTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(scene, cam)
    const buf = new Float32Array(n * 4)
    renderer.readRenderTargetPixels(target, 0, 0, n, 1, buf)
    renderer.setRenderTarget(prevTarget)

    const U: ProjUniforms = { ...this.uni(), R }
    let maxError = 0
    for (let i = 0; i < n; i++) {
      const p = projectedPos(this.seeds[i], u, U)
      maxError = Math.max(maxError, Math.hypot(buf[i * 4] - p.x, buf[i * 4 + 1] - p.y))
    }
    geo.dispose()
    mat.dispose()
    target.dispose()
    return { maxError, n }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
  }
}
