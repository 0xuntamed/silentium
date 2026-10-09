import { useEffect, useRef } from 'react'
import { buildAtlas, buildNearSprites, CELL, COLS } from '../../gl/glyphAtlas'
import { engine } from './engine'

const STRETCH_K = 0.42

/**
 * The near layer: big, blurred brass notes drawn in a Canvas 2D overlay *in front of* the page
 * copy (a WebGL canvas behind the DOM can't interleave). Fed by the same sim buffers.
 */
export function NearLayer2D() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const { sprites, blurred } = buildNearSprites(buildAtlas())
    const dprMax = engine.tier?.dpr ?? 1
    let W = 0
    let H = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, dprMax)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const sim = engine.sim
      if (!sim) return
      const { a, b, v } = sim.render
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const nearAlpha = blurred ? 1 : 0.6
      const halfAspect = sim.aspect
      for (let i = sim.nearStart; i < sim.n; i++) {
        const alpha = b[i * 4 + 2] * nearAlpha
        if (alpha < 0.01) continue
        const x = (a[i * 4] / halfAspect * 0.5 + 0.5) * W
        const y = (0.5 - a[i * 4 + 1] / 2) * H
        const size = b[i * 4] * (H / 2) * 1.05
        if (x < -size || x > W + size || y < -size || y > H + size) continue
        const glyph = a[i * 4 + 3]
        const sx = (glyph % COLS) * CELL
        const sy = Math.floor(glyph / COLS) * CELL
        const vx = v[i * 2]
        const vy = -v[i * 2 + 1]
        const sp = Math.hypot(vx, vy)
        const st = 1 + Math.min(sp * STRETCH_K, 2.2)

        ctx.globalAlpha = alpha / Math.sqrt(st)
        ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr)
        if (st > 1.06) {
          const ang = Math.atan2(vy, vx)
          ctx.rotate(ang)
          ctx.scale(st, 1 / Math.sqrt(st))
          ctx.rotate(-ang)
        }
        ctx.rotate(-a[i * 4 + 2])
        ctx.drawImage(sprites, sx, sy, CELL, CELL, -size / 2, -size / 2, size, size)
      }
      ctx.globalAlpha = 1
    }
    const off = engine.onFrame(draw)
    draw()
    return () => {
      off()
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />
}
