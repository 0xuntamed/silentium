import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { GLYPH_H, textToDots, textWidth } from './dotFont'

const PITCH = 5 // css px between dots
const BATTERY_COLS = 30
const GAP = 4
const SCALE = 2 // text pixels are 2×2 dots
const TEXT = '60h'
const COLS = BATTERY_COLS + GAP + textWidth(TEXT) * SCALE
const ROWS = 14

const BRASS = '#C6A15B'
const BONE = '#EFE9DD'
const FAINT = 'rgba(239, 233, 221, 0.1)'

export const dotMatrixSize = { w: COLS * PITCH, h: ROWS * PITCH }

/**
 * Draw the battery readout: a battery outline whose cells charge up in brass, and "60h" in 5×7 dot type.
 * `charge` is 0..1. Pure canvas — nothing in the DOM moves.
 */
export function drawDotMatrix(ctx: CanvasRenderingContext2D, dpr: number, charge: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, dotMatrixSize.w, dotMatrixSize.h)
  const r = 1.35
  const dot = (col: number, row: number, fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(col * PITCH + PITCH / 2, row * PITCH + PITCH / 2, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Battery: body 0..27, terminal 28..29, with a 24 × 10 fill area inside.
  const inner = 24
  const lit = Math.round(charge * inner)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < BATTERY_COLS; col++) {
      const body = col <= 27
      const edge = body && (row === 0 || row === ROWS - 1 || col === 0 || col === 27)
      const terminal = col >= 28 && row >= 4 && row <= 9
      if (edge || terminal) {
        dot(col, row, BONE)
        continue
      }
      const inFill = col >= 2 && col < 2 + inner && row >= 2 && row <= ROWS - 3
      if (inFill) dot(col, row, col - 2 < lit ? BRASS : FAINT)
    }
  }

  // "60h": each glyph lights up as the charge passes it.
  const rows = textToDots(TEXT)
  const c0 = BATTERY_COLS + GAP
  const width = rows[0].length
  const topRow = Math.floor((ROWS - GLYPH_H * SCALE) / 2)
  for (let gr = 0; gr < GLYPH_H; gr++) {
    for (let gc = 0; gc < width; gc++) {
      const reveal = charge > 0.12 + (gc / width) * 0.7
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const on = rows[gr][gc]
          dot(c0 + gc * SCALE + sx, topRow + gr * SCALE + sy, on && reveal ? BONE : FAINT)
        }
      }
    }
  }
}

/** A canvas dot-matrix battery readout, driven by `value.current` (0..1) from the Specs timeline. */
export function DotMatrix({ value, className = '' }: { value: { current: number }; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(dotMatrixSize.w * dpr)
    canvas.height = Math.round(dotMatrixSize.h * dpr)
    if (prefersReducedMotion()) {
      drawDotMatrix(ctx, dpr, 1)
      return
    }
    let last = -1
    const tick = () => {
      const v = value.current
      if (Math.abs(v - last) < 0.004) return
      last = v
      drawDotMatrix(ctx, dpr, v)
    }
    drawDotMatrix(ctx, dpr, value.current)
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [value])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Battery readout: 60 hours of playback"
      className={className}
      style={{ width: dotMatrixSize.w, height: dotMatrixSize.h, maxWidth: '100%' }}
    />
  )
}
