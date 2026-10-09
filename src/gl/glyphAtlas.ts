/**
 * Runtime glyph atlas for the notes system. Original, hairline-engraved note shapes drawn with
 * Canvas 2D (no font files, no third-party artwork). 4 × 2 cells of 256 px:
 *   0 ♩ quarter · 1 ♪ eighth · 2 ♫ beamed eighths · 3 ♬ beamed sixteenths
 *   4 half note · 5 ♯ sharp · 6 ♭ flat · 7 dash (a soft pill the shader stretches)
 */
export const CELL = 256
export const COLS = 4
export const ROWS = 2

type Ctx = CanvasRenderingContext2D

function head(ctx: Ctx, x: number, y: number, filled = true) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.38)
  ctx.beginPath()
  ctx.ellipse(0, 0, 33, 23, 0, 0, Math.PI * 2)
  if (filled) ctx.fill()
  else {
    ctx.lineWidth = 7
    ctx.stroke()
  }
  ctx.restore()
}

function stem(ctx: Ctx, x: number, y0: number, y1: number) {
  ctx.beginPath()
  ctx.moveTo(x, y0)
  ctx.lineTo(x, y1)
  ctx.lineWidth = 7
  ctx.stroke()
}

function flag(ctx: Ctx, x: number, y: number, dy = 0) {
  ctx.beginPath()
  ctx.moveTo(x, y + dy)
  ctx.bezierCurveTo(x + 46, y + 22 + dy, x + 62, y + 62 + dy, x + 36, y + 98 + dy)
  ctx.lineWidth = 8
  ctx.stroke()
}

function beam(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.lineWidth = 17
  ctx.lineCap = 'butt'
  ctx.stroke()
}

const DRAW: ((ctx: Ctx) => void)[] = [
  // quarter
  (c) => {
    head(c, -28, 62)
    stem(c, 3, 56, -88)
  },
  // eighth
  (c) => {
    head(c, -28, 62)
    stem(c, 3, 56, -88)
    flag(c, 3, -88)
  },
  // beamed eighths
  (c) => {
    head(c, -62, 64)
    head(c, 44, 46)
    stem(c, -31, 58, -78)
    stem(c, 75, 40, -98)
    beam(c, -31, -76, 75, -96)
  },
  // beamed sixteenths
  (c) => {
    head(c, -62, 64)
    head(c, 44, 46)
    stem(c, -31, 58, -78)
    stem(c, 75, 40, -98)
    beam(c, -31, -76, 75, -96)
    beam(c, -31, -44, 75, -64)
  },
  // half note
  (c) => {
    head(c, -28, 62, false)
    stem(c, 3, 56, -88)
  },
  // sharp
  (c) => {
    c.lineWidth = 7
    for (const x of [-18, 22]) {
      c.beginPath()
      c.moveTo(x, -92)
      c.lineTo(x, 100)
      c.stroke()
    }
    for (const [y, dy] of [[-22, -16], [30, -16]]) {
      c.beginPath()
      c.moveTo(-52, y - dy)
      c.lineTo(56, y + dy)
      c.lineWidth = 14
      c.stroke()
    }
  },
  // flat
  (c) => {
    stem(c, -30, -96, 86)
    c.beginPath()
    c.moveTo(-30, 14)
    c.bezierCurveTo(44, -22, 70, 46, -30, 92)
    c.lineWidth = 9
    c.stroke()
  },
  // dash: a full-cell soft pill
  (c) => {
    c.beginPath()
    c.roundRect(-124, -124, 248, 248, 124)
    c.fill()
  },
]

/** White-on-transparent atlas (the shader tints it). Browser only. */
export function buildAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CELL * COLS
  canvas.height = CELL * ROWS
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  DRAW.forEach((draw, i) => {
    ctx.save()
    ctx.translate((i % COLS) * CELL + CELL / 2, Math.floor(i / COLS) * CELL + CELL / 2)
    draw(ctx)
    ctx.restore()
  })
  return canvas
}

/**
 * Brass-tinted, pre-blurred sprites for the near layer (drawn in the Canvas 2D overlay in front of
 * the page text). `ctx.filter` is missing in old Safari — we fall back to unblurred, dimmer sprites.
 */
export function buildNearSprites(atlas: HTMLCanvasElement, blurPx = 16): { sprites: HTMLCanvasElement; blurred: boolean } {
  const canvas = document.createElement('canvas')
  canvas.width = atlas.width
  canvas.height = atlas.height
  const ctx = canvas.getContext('2d')!
  const blurred = 'filter' in ctx
  for (let i = 0; i < 7; i++) {
    const cx = (i % COLS) * CELL
    const cy = Math.floor(i / COLS) * CELL
    ctx.save()
    ctx.beginPath()
    ctx.rect(cx, cy, CELL, CELL)
    ctx.clip()
    if (blurred) ctx.filter = `blur(${blurPx}px)`
    const k = 0.72
    ctx.drawImage(atlas, cx, cy, CELL, CELL, cx + (CELL * (1 - k)) / 2, cy + (CELL * (1 - k)) / 2, CELL * k, CELL * k)
    ctx.restore()
  }
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#C6A15B'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return { sprites: canvas, blurred }
}
