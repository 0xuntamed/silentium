/**
 * "Type made of sound": each letter is a damped oscillator, like a speaker cone. Kicks (cursor pass,
 * scroll speed, the intro bloom, the 1 Hz heartbeat) add velocity; the letter rings and settles.
 * Pure maths — the Hero turns the outputs into transforms.
 */
export class ConeLetters {
  readonly pos: Float32Array
  readonly vel: Float32Array
  private acc = 0
  /** ~16 Hz ring, ζ ≈ 0.025 → rings for about a second. */
  readonly omega = 2 * Math.PI * 16
  readonly zeta = 0.025

  constructor(readonly n: number) {
    this.pos = new Float32Array(n)
    this.vel = new Float32Array(n)
  }

  kick(i: number, amount: number) {
    this.vel[i] += amount * this.omega
  }

  /** Fixed 1/240 s sub-steps keep the stiff oscillator stable at any frame rate. */
  step(dt: number) {
    const h = 1 / 240
    this.acc += Math.min(dt, 0.1)
    const w2 = this.omega * this.omega
    const c = 2 * this.zeta * this.omega
    while (this.acc >= h) {
      this.acc -= h
      for (let i = 0; i < this.n; i++) {
        const a = -w2 * this.pos[i] - c * this.vel[i]
        this.vel[i] += a * h
        this.pos[i] += this.vel[i] * h
      }
    }
  }

  energy() {
    let e = 0
    for (let i = 0; i < this.n; i++) e += this.pos[i] * this.pos[i] + (this.vel[i] / this.omega) ** 2
    return e
  }
}
