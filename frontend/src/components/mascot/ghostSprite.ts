/**
 * Original pixel robotic ghost: antenna, dome, visor with glowing eyes, wiggly skirt.
 * 16x16 string grids. Characters:
 *   .  transparent   B  body   O  outline   V  visor   E  eye glow   A  antenna
 */
export const SPRITE_SIZE = 16

export type PixelChar = 'B' | 'O' | 'V' | 'E' | 'A'

const HEAD = [
  '.......AA.......',
  '.......OO.......',
  '.....OOOOOO.....',
  '....OBBBBBBO....',
  '...OBBBBBBBBO...',
  '..OBBBBBBBBBBO..',
  '..OVVVVVVVVVVO..',
]
const EYES_OPEN = '..OVEEVVVVEEVO..'
const EYES_SHUT = '..OVVVVVVVVVVO..'
const TORSO = [
  '..OVVVVVVVVVVO..',
  '..OBBBBBBBBBBO..',
  '..OBBBBBBBBBBO..',
  '..OBBBBBBBBBBO..',
  '..OBBBBBBBBBBO..',
  '..OBBBBBBBBBBO..',
]

/** Frame 0: eyes open, skirt teeth left. Frame 1: blink, skirt teeth shifted. */
export const GHOST_FRAMES: readonly (readonly string[])[] = [
  [...HEAD, EYES_OPEN, ...TORSO, '..OBBOOBBOOBBO..', '...OO..OO..OO...'],
  [...HEAD, EYES_SHUT, ...TORSO, '..OBOOBBOOBBOO..', '...O..OO..OO....'],
]

export interface PixelRun {
  x: number
  y: number
  width: number
  char: PixelChar
}

/** Merges each row into horizontal runs of the same character (skipping '.'). */
export function toRuns(frame: readonly string[]): PixelRun[] {
  const runs: PixelRun[] = []
  frame.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const char = row[x]
      let end = x + 1
      while (end < row.length && row[end] === char) end += 1
      if (char !== '.') runs.push({ x, y, width: end - x, char: char as PixelChar })
      x = end
    }
  })
  return runs
}
