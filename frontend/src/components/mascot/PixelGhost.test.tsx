import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { REDUCED_MOTION_QUERY } from '../../hooks/usePrefersReducedMotion.ts'
import { axe } from '../../test/axe.ts'
import { setMediaQueries } from '../../test/media.ts'
import { GHOST_FRAMES, SPRITE_SIZE, toRuns } from './ghostSprite.ts'
import { PixelGhost } from './PixelGhost.tsx'

describe('ghostSprite', () => {
  it('has two 16x16 frames using only the documented characters', () => {
    expect(SPRITE_SIZE).toBe(16)
    expect(GHOST_FRAMES).toHaveLength(2)
    for (const frame of GHOST_FRAMES) {
      expect(frame).toHaveLength(SPRITE_SIZE)
      for (const row of frame) {
        expect(row).toHaveLength(SPRITE_SIZE)
        expect(row).toMatch(/^[.BOVEA]+$/)
      }
    }
  })

  it('has an antenna and a visor; eyes glow in frame 0 and blink shut in frame 1', () => {
    const [open, shut] = GHOST_FRAMES.map((frame) => frame.join(''))
    expect(open).toContain('A')
    expect(open).toContain('V')
    expect(open).toContain('E')
    expect(shut).not.toContain('E')
  })

  it('wiggles the skirt between frames', () => {
    expect(GHOST_FRAMES[0].slice(-2)).not.toEqual(GHOST_FRAMES[1].slice(-2))
  })

  it('merges horizontal runs and skips transparent pixels', () => {
    expect(toRuns(['.BB.OOO', 'E..'])).toEqual([
      { x: 1, y: 0, width: 2, char: 'B' },
      { x: 4, y: 0, width: 3, char: 'O' },
      { x: 0, y: 1, width: 1, char: 'E' },
    ])
  })

  it('returns no runs for an empty or transparent frame', () => {
    expect(toRuns([])).toEqual([])
    expect(toRuns(['....', ''])).toEqual([])
  })

  it('covers exactly the non-transparent pixels of each frame', () => {
    for (const frame of GHOST_FRAMES) {
      const painted = frame.join('').replace(/\./g, '').length
      expect(toRuns(frame).reduce((sum, run) => sum + run.width, 0)).toBe(painted)
    }
  })
})

describe('PixelGhost', () => {
  it('renders a decorative 16x16 SVG with both frames', () => {
    const { container } = render(<PixelGhost className="extra" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16')
    expect(svg).toHaveClass('extra')
    const groups = container.querySelectorAll('svg > g')
    expect(groups).toHaveLength(2)
    expect(groups[0].querySelectorAll('rect')).toHaveLength(toRuns(GHOST_FRAMES[0]).length)
    expect(groups[1].querySelectorAll('rect')).toHaveLength(toRuns(GHOST_FRAMES[1]).length)
  })

  it('works without a className', () => {
    const { container } = render(<PixelGhost />)
    expect(container.querySelector('svg')?.getAttribute('class')).not.toMatch(/undefined/)
  })

  it('animates by default and turns motion off with reduced motion', () => {
    const { container } = render(<PixelGhost />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-motion', 'on')
    act(() => setMediaQueries({ [REDUCED_MOTION_QUERY]: true }))
    expect(svg).toHaveAttribute('data-motion', 'off')
  })

  it('has no a11y violations', async () => {
    const { container } = render(<PixelGhost />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
