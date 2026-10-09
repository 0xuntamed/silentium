/**
 * The noise "projection flow" — a closed-form, stateless way to make particles slide around the
 * bubble like water round a stone. TS mirror of PROJECTION_GLSL; parity is checked on the GPU in
 * the Playwright harness (`__sil.anc.parity()`).
 *
 *  1. Each particle flies a straight line from an edge spawn point, through c + perp·b, and on.
 *  2. Project out of the disk with a smooth radial max:  z = c + n̂ · smax(|raw − c|, R, κ).
 *     A line that enters the disk now rides the shell and leaves tangentially.
 *  3. A head-on particle would flip n̂ 180° in one frame; bias n̂ by perp·ε·R near the bubble so it
 *     picks a side and sweeps smoothly round.
 */

export interface Seed {
  a: number
  b: number
  c: number
  d: number
}

export interface ProjUniforms {
  cx: number
  cy: number
  /** Bubble radius (0 = no bubble). */
  R: number
  /** Max impact parameter (|b| up to this). */
  bMax: number
  /** Spawn radius. */
  rs: number
}

export const EPS = 0.2

export const fract = (x: number) => x - Math.floor(x)

/** Progress along the particle's line, 0..1, looping. */
export function phase(s: Seed, time: number): number {
  const rate = 0.14 + 0.26 * s.c
  return fract(time * rate + s.d)
}

export const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.max(a, b) + h * h * k * 0.25
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export interface Pos {
  x: number
  y: number
  /** Raw (unprojected) position, for impact detection. */
  rx: number
  ry: number
  /** How deep the raw line sits inside the bubble, as a fraction of R (0 outside). */
  pen: number
}

export function projectedPos(s: Seed, u: number, U: ProjUniforms, out: Pos = { x: 0, y: 0, rx: 0, ry: 0, pen: 0 }): Pos {
  const alpha = s.a * Math.PI * 2
  const dx = Math.cos(alpha)
  const dy = Math.sin(alpha)
  const px = -dy
  const py = dx
  const b = (s.b * 2 - 1) * U.bMax
  // Straight line S → E through c + perp·b at u = 0.5.
  const sx = U.cx + dx * U.rs + px * b
  const sy = U.cy + dy * U.rs + py * b
  const ex = U.cx - dx * U.rs + px * b
  const ey = U.cy - dy * U.rs + py * b
  const rx = sx + (ex - sx) * u
  const ry = sy + (ey - sy) * u
  out.rx = rx
  out.ry = ry

  const ddx = rx - U.cx
  const ddy = ry - U.cy
  const r = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-6
  const R = U.R
  const near = 1 - smoothstep(R, 2.5 * R, r)
  const bias = EPS * R * near
  // The bias side follows the sign of b so a head-on particle commits to one side.
  const sign = b >= 0 ? 1 : -1
  let nx = ddx + px * bias * sign
  let ny = ddy + py * bias * sign
  const nl = Math.sqrt(nx * nx + ny * ny) + 1e-6
  nx /= nl
  ny /= nl
  const k = Math.max(0.12 * R, 1e-4)
  const rEff = R > 1e-4 ? smax(r, R, k) : r
  out.x = U.cx + nx * rEff
  out.y = U.cy + ny * rEff
  out.pen = R > 1e-4 ? Math.max(0, R - r) / R : 0
  return out
}

/** GLSL twin. Expects uniforms: uCenter (vec2), uR, uBMax, uRs. */
export const PROJECTION_GLSL = /* glsl */ `
float ancPhase(vec4 s, float time) {
  float rate = 0.14 + 0.26 * s.z;
  return fract(time * rate + s.w);
}
float ancSmax(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return max(a, b) + h * h * k * 0.25;
}
// Projected position; pen = penetration of the raw line (0..1 of R); raw returns the unprojected point.
vec2 ancPos(vec4 s, float u, out float pen, out vec2 raw) {
  float alpha = s.x * 6.28318530718;
  vec2 dir = vec2(cos(alpha), sin(alpha));
  vec2 prp = vec2(-dir.y, dir.x);
  float b = (s.y * 2.0 - 1.0) * uBMax;
  vec2 S = uCenter + dir * uRs + prp * b;
  vec2 E = uCenter - dir * uRs + prp * b;
  raw = mix(S, E, u);
  vec2 d = raw - uCenter;
  float r = length(d) + 1e-6;
  float near = 1.0 - smoothstep(uR, 2.5 * uR, r);
  float sgn = b >= 0.0 ? 1.0 : -1.0;
  vec2 nv = d + prp * (0.2 * uR * near * sgn);
  nv = nv / (length(nv) + 1e-6);
  float k = max(0.12 * uR, 1e-4);
  float rEff = uR > 1e-4 ? ancSmax(r, uR, k) : r;
  pen = uR > 1e-4 ? max(0.0, uR - r) / uR : 0.0;
  return uCenter + nv * rEff;
}
`

export function makeSeeds(n: number, seed = 11): Seed[] {
  let a = seed >>> 0
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: n }, () => ({ a: rnd(), b: rnd(), c: rnd(), d: rnd() }))
}
