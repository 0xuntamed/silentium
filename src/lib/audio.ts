import { useSyncExternalStore } from 'react'

/**
 * All sound is synthesized with Web Audio — there are no audio files. It is muted by default and only
 * wakes up after the visitor turns it on (that click is also the user gesture the browser requires).
 */
let on = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
const listeners = new Set<() => void>()

export const isSoundOn = () => on

function context(): AudioContext | null {
  if (!on || typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.9
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 4
    master.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function toggleSound() {
  on = !on
  if (on) {
    const c = context()
    c && pluck(c, 880, c.currentTime + 0.02, 0.05, 0.5) // a soft "on" tick
  } else {
    spatialStop()
    if (ctx) void ctx.suspend()
  }
  listeners.forEach((l) => l())
}

export function useSoundOn() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
    () => false,
  )
}

/** A short plucked note: a sine and a quieter octave-up triangle with a fast attack and long tail. */
function pluck(c: AudioContext, freq: number, t: number, gain: number, tail: number, dest?: AudioNode) {
  const out = c.createGain()
  out.gain.setValueAtTime(0, t)
  out.gain.linearRampToValueAtTime(gain, t + 0.006)
  out.gain.exponentialRampToValueAtTime(0.0001, t + tail)
  out.connect(dest ?? master!)
  const a = c.createOscillator()
  a.type = 'sine'
  a.frequency.value = freq
  const b = c.createOscillator()
  b.type = 'triangle'
  b.frequency.value = freq * 2
  const bg = c.createGain()
  bg.gain.value = 0.28
  a.connect(out)
  b.connect(bg).connect(out)
  a.start(t)
  b.start(t)
  a.stop(t + tail + 0.05)
  b.stop(t + tail + 0.05)
}

/** The intro bloom: a pad swells open (a filtered chord) and the four-note "Silentium motif" lands on top. */
export function playBloom() {
  const c = context()
  if (!c) return
  const t = c.currentTime + 0.03
  const env = c.createGain()
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(0.2, t + 1.5)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 5.2)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 3
  lp.frequency.setValueAtTime(160, t)
  lp.frequency.exponentialRampToValueAtTime(2600, t + 2.2)
  lp.connect(env).connect(master!)
  for (const [f, det] of [[146.83, -6], [220, 4], [369.99, -3], [293.66, 7]] as const) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = det
    o.connect(lp)
    o.start(t)
    o.stop(t + 5.4)
  }
  // E5, B5, F#5, D6 — the notes that land on the staff in the hero.
  ;[659.25, 987.77, 739.99, 1174.66].forEach((f, i) => pluck(c, f, t + 1.15 + i * 0.5, 0.1, 2.4))
}

// — Spatial audio: a pentatonic pluck loop through an HRTF panner that follows the on-screen source.
let spatial: { panner: PannerNode; timer: number; step: number } | null = null
const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25]
const PATTERN = [0, 2, 4, 2, 5, 4, 2, 1, 0, 3, 4, 6, 5, 3, 2, 4]

function spatialStart() {
  const c = context()
  if (!c || spatial) return
  const panner = new PannerNode(c, {
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    refDistance: 1,
    rolloffFactor: 1.1,
    positionY: 0,
  })
  panner.connect(master!)
  const s = { panner, timer: 0, step: 0 }
  s.timer = window.setInterval(() => {
    const now = context()
    if (!now) return
    const f = PENTA[PATTERN[s.step++ % PATTERN.length]] * (s.step % 8 === 0 ? 2 : 1)
    pluck(now, f, now.currentTime + 0.02, 0.22, 1.3, panner)
  }, 360)
  spatial = s
}

export function spatialStop() {
  if (!spatial) return
  window.clearInterval(spatial.timer)
  spatial.panner.disconnect()
  spatial = null
}

/**
 * Called every frame by the Spatial scene. `dx`, `dy` are the source's offset from the head in world units
 * (y up = in front of the listener). Starts/stops itself as the scene becomes active and sound is toggled.
 */
export function spatialFrame(active: boolean, dx: number, dy: number) {
  if (!active || !on) {
    spatialStop()
    return
  }
  spatialStart()
  if (!spatial || !ctx) return
  const t = ctx.currentTime
  const p = spatial.panner
  // Listener faces −z; "ahead" on screen (up) is −z.
  p.positionX.setTargetAtTime(dx * 2.2, t, 0.05)
  p.positionZ.setTargetAtTime(-dy * 2.2, t, 0.05)
}
