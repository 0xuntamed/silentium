/**
 * Atlas for the city-noise words (HONK, CHATTER, …). Drawn at runtime with Geist so the glyphs
 * match the site. Decorative only — all scene copy lives in HTML. 2 columns × 4 rows of 512×128.
 */
export const WORDS = ['HONK', 'CHATTER', 'ENGINE', 'SIREN', 'BEEP', 'DRILL', 'SHOUT', 'ROAR'] as const
export const WORD_COLS = 2
export const WORD_ROWS = 4
export const WORD_CELL_W = 512
export const WORD_CELL_H = 128

export async function buildWordAtlas(): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.load('800 96px Geist')
  } catch {
    /* falls back to system sans */
  }
  const canvas = document.createElement('canvas')
  canvas.width = WORD_CELL_W * WORD_COLS
  canvas.height = WORD_CELL_H * WORD_ROWS
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  WORDS.forEach((w, i) => {
    const x = (i % WORD_COLS) * WORD_CELL_W + WORD_CELL_W / 2
    const y = Math.floor(i / WORD_COLS) * WORD_CELL_H + WORD_CELL_H / 2
    let size = 104
    ctx.font = `800 ${size}px Geist, 'Geist Fallback', system-ui, sans-serif`
    while (ctx.measureText(w).width > WORD_CELL_W - 36 && size > 40) {
      size -= 4
      ctx.font = `800 ${size}px Geist, 'Geist Fallback', system-ui, sans-serif`
    }
    ctx.fillText(w, x, y + 4)
  })
  return canvas
}
