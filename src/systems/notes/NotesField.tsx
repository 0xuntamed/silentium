import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { buildAtlas, COLS, ROWS } from '../../gl/glyphAtlas'
import { engine } from './engine'

const VERT = /* glsl */ `
attribute vec4 aA;   // x, y, rot, glyph
attribute vec4 aB;   // sizeX, sizeY, alpha, tint
attribute vec2 aV;   // apparent velocity (world units / s)
uniform float uStretchK;
varying vec2 vUv;
varying float vAlpha;
varying float vTint;
varying float vGlyph;
varying float vStretchDim;
varying float vAspect;
void main() {
  vStretchDim = 1.0;
  vAspect = aB.x / max(aB.y, 1e-5);
  vec2 q = position.xy;
  vec2 p = q * aB.xy;
  float c = cos(aA.z);
  float s = sin(aA.z);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  float sp = length(aV);
  if (sp > 1e-4) {
    vec2 d = aV / sp;
    vec2 n = vec2(-d.y, d.x);
    float st = 1.0 + min(sp * uStretchK, 4.0);
    vStretchDim = inversesqrt(st);
    p = d * dot(p, d) * st + n * dot(p, n) / sqrt(st);
  }
  gl_Position = projectionMatrix * viewMatrix * vec4(aA.xy + p, 0.0, 1.0);
  vUv = vec2(q.x + 0.5, 0.5 - q.y);
  vAlpha = aB.z * vStretchDim;
  vTint = aB.w;
  vGlyph = aA.w;
}
`

const FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D uMap;
varying vec2 vUv;
varying float vAlpha;
varying float vTint;
varying float vGlyph;
varying float vAspect;
const vec3 BRASS = vec3(0.776, 0.631, 0.357);
const vec3 BONE = vec3(0.937, 0.914, 0.867);
void main() {
  float col = mod(vGlyph + 0.5, ${COLS}.0);
  float row = floor((vGlyph + 0.5) / ${COLS}.0);
  vec2 uv = (vec2(floor(col), row) + vUv) / vec2(${COLS}.0, ${ROWS}.0);
  float a;
  if (vGlyph > 6.5) {
    // The dash is a crisp analytic capsule — mip-mapping a 256px pill down to 2px smears its edges.
    vec2 p = (vUv - 0.5) * vec2(vAspect, 1.0) * 2.0;
    float d = length(vec2(max(abs(p.x) - (vAspect - 1.0), 0.0), p.y));
    a = (1.0 - smoothstep(0.3, 1.0, d)) * vAlpha;
  } else {
    a = texture2D(uMap, uv).a * vAlpha;
  }
  if (a < 0.003) discard;
  vec3 rgb = mix(BRASS, BONE, vTint);
  gl_FragColor = vec4(rgb * a, a); // premultiplied
}
`

/** One instanced draw for far notes, mid notes and dashes. (Near notes live in the 2D overlay.) */
export function NotesField() {
  const object = useMemo(() => {
    const sim = engine.sim!
    const atlas = new THREE.CanvasTexture(buildAtlas())
    atlas.flipY = false
    atlas.generateMipmaps = true
    atlas.minFilter = THREE.LinearMipmapLinearFilter
    atlas.magFilter = THREE.LinearFilter
    atlas.anisotropy = 4
    atlas.colorSpace = THREE.NoColorSpace

    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    const mk = (arr: Float32Array, size: number) => {
      const a = new THREE.InstancedBufferAttribute(arr, size)
      a.setUsage(THREE.DynamicDrawUsage)
      return a
    }
    geo.setAttribute('aA', mk(sim.render.a, 4))
    geo.setAttribute('aB', mk(sim.render.b, 4))
    geo.setAttribute('aV', mk(sim.render.v, 2))
    geo.instanceCount = sim.nearStart

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: atlas }, uStretchK: { value: 0.42 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    return mesh
  }, [])

  useEffect(() => {
    const geo = object.geometry as THREE.InstancedBufferGeometry
    const off = engine.onFrame(() => {
      ;(geo.getAttribute('aA') as THREE.BufferAttribute).needsUpdate = true
      ;(geo.getAttribute('aB') as THREE.BufferAttribute).needsUpdate = true
      ;(geo.getAttribute('aV') as THREE.BufferAttribute).needsUpdate = true
    })
    return () => {
      off()
      geo.dispose()
      const m = object.material as THREE.ShaderMaterial
      ;(m.uniforms.uMap.value as THREE.Texture).dispose()
      m.dispose()
    }
  }, [object])

  return <primitive object={object} />
}
