import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.ts'
import { GHOST_FRAMES, type PixelChar, SPRITE_SIZE, toRuns } from './ghostSprite.ts'
import styles from './PixelGhost.module.css'

const FILL: Record<PixelChar, string> = {
  B: styles.body,
  O: styles.outline,
  V: styles.visor,
  E: styles.eye,
  A: styles.antenna,
}

const FRAME_RUNS = GHOST_FRAMES.map(toRuns)

/** Decorative animated mascot. CSS-only animation; off with reduced motion. */
export function PixelGhost({ className }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      className={[styles.ghost, className].filter(Boolean).join(' ')}
      data-motion={reducedMotion ? 'off' : 'on'}
    >
      {FRAME_RUNS.map((runs, frame) => (
        <g key={frame} className={frame === 0 ? styles.frameA : styles.frameB}>
          {runs.map((run) => (
            <rect
              key={`${run.x}-${run.y}`}
              x={run.x}
              y={run.y}
              width={run.width}
              height={1}
              className={FILL[run.char]}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}
