import { configureAxe } from 'vitest-axe'

/** axe for jsdom: color-contrast cannot be computed without layout, so it is off. */
export const axe = configureAxe({
  rules: { 'color-contrast': { enabled: false } },
})
