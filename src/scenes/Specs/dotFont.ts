/**
 * A 5×7 dot-matrix font for the Specs readout (the "Nothing" voice). Each glyph is 7 rows of 5 cells.
 * Original pixel shapes, drawn here by hand.
 */
export const GLYPH_W = 5
export const GLYPH_H = 7

const G = (...rows: string[]) => rows
export const GLYPHS: Record<string, string[]> = {
  '0': G('.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'),
  '1': G('..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'),
  '2': G('.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'),
  '3': G('.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'),
  '4': G('...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'),
  '5': G('#####', '#....', '####.', '....#', '....#', '#...#', '.###.'),
  '6': G('..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'),
  '7': G('#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'),
  '8': G('.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'),
  '9': G('.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'),
  H: G('#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'),
  h: G('#....', '#....', '#.##.', '##..#', '#...#', '#...#', '#...#'),
  '%': G('##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'),
  '-': G('.....', '.....', '.....', '#####', '.....', '.....', '.....'),
  ' ': G('.....', '.....', '.....', '.....', '.....', '.....', '.....'),
}

/** Lay a string out as rows of booleans (1 column of space between glyphs). Unknown characters become spaces. */
export function textToDots(text: string): boolean[][] {
  const rows: boolean[][] = Array.from({ length: GLYPH_H }, () => [])
  const chars = [...text]
  chars.forEach((ch, ci) => {
    const g = GLYPHS[ch] ?? GLYPHS[' ']
    for (let r = 0; r < GLYPH_H; r++) {
      for (let c = 0; c < GLYPH_W; c++) rows[r].push(g[r][c] === '#')
      if (ci < chars.length - 1) rows[r].push(false)
    }
  })
  return rows
}

export const textWidth = (text: string) => Math.max(0, [...text].length * (GLYPH_W + 1) - 1)
