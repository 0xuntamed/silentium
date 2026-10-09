/**
 * The Spatial scene's picture: one full-screen signed-distance-field pass in the shared canvas —
 * a top-down contour head with its headphone cups, a sound source, rings that pulse from it, a
 * wedge of rings that points from the head toward it, and L/R level arcs on the ears.
 * Drawn straight to the screen (premultiplied), analytic and antialiased.
 */
import * as THREE from 'three'
import { spatialLive } from './live'

const FRAG = /* glsl */ `
precision highp float;
uniform float uAspect;
uniform float uTime;
uniform vec2 uHead;
uniform float uHeadR;
uniform vec2 uSrc;
uniform float uVis;
uniform float uHeadIn;
uniform float uContract;
uniform float uL;
uniform float uR;
uniform vec3 uRing; // x, y, radius of the ring handed over from the ANC bubble
uniform float uRingAlpha;
varying vec2 vUv;
const float PI = 3.14159265359;
const vec3 BRASS = vec3(0.776, 0.631, 0.357);
const vec3 BONE = vec3(0.937, 0.914, 0.867);

float stroke(float d, float w) {
  float aa = fwidth(d) * 0.75 + 1e-5;
  return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// Ellipse distance, good enough for hairlines.
float sdEllipse(vec2 p, vec2 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-5);
}

void main() {
  vec2 w = (vUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
  vec2 p = w - uHead;
  float lw = 0.0011; // hairline half-width in world units (~1 px at 900 px tall)
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  float R = uHeadR;
  float k = 1.0 - uContract * 0.85;

  // — The head, from above: a skull ellipse, topographic contours, a nose, ears with cups, a band.
  float head = stroke(sdEllipse(p, vec2(R * 0.82, R)), lw);
  float cont = 0.0;
  for (int i = 1; i < 4; i++) {
    float s = 1.0 - float(i) * 0.22;
    cont += stroke(sdEllipse(p, vec2(R * 0.82 * s, R * s)), lw * 0.8) * (0.32 - float(i) * 0.06);
  }
  float nose = max(stroke(sdSeg(p, vec2(-R * 0.15, R * 0.97), vec2(0.0, R * 1.22)), lw), stroke(sdSeg(p, vec2(R * 0.15, R * 0.97), vec2(0.0, R * 1.22)), lw));
  vec2 pe = vec2(abs(p.x), p.y);
  float earD = sdEllipse(pe - vec2(R * 0.92, 0.0), vec2(R * 0.11, R * 0.24));
  float cup = (1.0 - smoothstep(-0.0015, 0.0015, earD));
  float earLine = stroke(earD, lw);
  float band = stroke(sdSeg(p, vec2(-R * 0.92, 0.0), vec2(R * 0.92, 0.0)), lw * 0.8) * 0.35;
  float headMask = uVis * uHeadIn * (1.0 - uContract);
  float a = (head * 0.8 + cont + nose * 0.8 + band + earLine * 0.9) * headMask;
  col += BONE * a;
  alpha += a;
  float ca = cup * 0.9 * headMask;
  col += BRASS * ca;
  alpha += ca;

  // — Level arcs hugging each ear: brighter on the side the sound favours.
  float r = length(p);
  float ang = atan(p.x, p.y); // 0 = ahead, +right
  float arcR = R * 1.34;
  float ringD = r - arcR;
  float rightMask = smoothstep(1.15, 0.7, abs(ang - PI * 0.5));
  float leftMask = smoothstep(1.15, 0.7, abs(ang + PI * 0.5));
  float lev = (stroke(ringD, lw * 2.4) * (rightMask * uR + leftMask * uL));
  float levA = lev * 0.95 * headMask;
  col += BRASS * levA;
  alpha += levA;

  // — Reference rings (distance), contracting at the end.
  float refA = 0.0;
  for (int i = 0; i < 3; i++) {
    float rr = R * (2.4 + float(i) * 1.3) * k;
    refA += stroke(r - rr, lw) * (0.2 - float(i) * 0.04);
  }
  refA *= uVis * uHeadIn * (1.0 - uContract);
  col += BONE * refA;
  alpha += refA;

  // — The ring handed over from the ANC bubble.
  float handed = stroke(length(w - uRing.xy) - uRing.z, lw * 2.2) * uRingAlpha * uVis * (1.0 - uContract);
  col += BRASS * handed;
  alpha += handed;

  // — The source and what it radiates.
  vec2 sd = w - uSrc;
  float sr = length(sd);
  float pulses = 0.0;
  for (int i = 0; i < 4; i++) {
    float ph = fract(uTime * 0.42 + float(i) * 0.25);
    pulses += stroke(sr - ph * 0.5, lw * 1.5) * pow(1.0 - ph, 1.6) * 0.7;
  }
  // A wedge of rings that leaves the head in the source's direction.
  vec2 toSrc = uSrc - uHead;
  float dirAng = atan(toSrc.x, toSrc.y);
  float dAng = abs(mod(ang - dirAng + PI, 2.0 * PI) - PI);
  float wedge = exp(-dAng * dAng * 7.0);
  float dist = length(toSrc);
  float wedgeA = 0.0;
  for (int i = 0; i < 3; i++) {
    float ph = fract(uTime * 0.55 - float(i) * 0.33);
    wedgeA += stroke(r - (R * 1.5 + ph * (dist - R * 1.5)), lw * 1.6) * (1.0 - ph) * wedge * 0.8 * step(R * 1.5, dist);
  }
  // A dotted line head → source.
  float line = stroke(sdSeg(w, uHead, uSrc), lw * 0.8);
  float dots = step(0.5, fract(length(w - uHead) * 55.0));
  float lineA = line * dots * 0.35 * step(R * 1.2, dist);
  float core = 1.0 - smoothstep(0.010, 0.016, sr);
  float glow = exp(-sr * 22.0) * 0.5;
  float sA = (pulses + wedgeA + lineA) * uVis * (1.0 - uContract) + (core + glow) * uVis * (1.0 - uContract * 0.8);
  col += mix(BRASS, BONE, core * 0.7) * sA;
  alpha += sA;

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`

export class SpatialPass {
  readonly scene = new THREE.Scene()
  private mat: THREE.ShaderMaterial
  private mesh: THREE.Mesh

  constructor(aspect: number) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }',
      fragmentShader: FRAG,
      uniforms: {
        uAspect: { value: aspect },
        uTime: { value: 0 },
        uHead: { value: new THREE.Vector2() },
        uHeadR: { value: 0.17 },
        uSrc: { value: new THREE.Vector2() },
        uVis: { value: 0 },
        uHeadIn: { value: 0 },
        uContract: { value: 0 },
        uL: { value: 0.5 },
        uR: { value: 0.5 },
        uRing: { value: new THREE.Vector3() },
        uRingAlpha: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat)
    this.mesh.scale.set(aspect, 1, 1)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
  }

  resize(aspect: number) {
    this.mat.uniforms.uAspect.value = aspect
    this.mesh.scale.set(aspect, 1, 1)
  }

  update(wallTime: number) {
    const L = spatialLive
    const u = this.mat.uniforms
    u.uTime.value = wallTime
    u.uHead.value.set(L.head.x, L.head.y)
    u.uHeadR.value = L.headR
    u.uSrc.value.set(L.src.x, L.src.y)
    u.uVis.value = L.vis
    u.uHeadIn.value = Math.min(1, Math.max(0, (L.p - 0.0) / 0.16))
    u.uContract.value = L.contract
    u.uL.value = Math.min(1, L.read.leftGain * 1.25)
    u.uR.value = Math.min(1, L.read.rightGain * 1.25)
    u.uRing.value.set(L.ring.x, L.ring.y, L.ring.r)
    u.uRingAlpha.value = L.ring.alpha
  }

  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    renderer.render(this.scene, camera)
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mat.dispose()
  }
}
