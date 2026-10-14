// vitest-axe 0.1.0 augments the legacy `Vi` namespace; current Vitest reads
// matchers from the 'vitest' module, so re-declare them there.
import 'vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match Vitest's generic signature
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
