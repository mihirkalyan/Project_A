import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { installMatchMedia, setMediaQueries } from '../test/media.ts'
import { useMediaQuery } from './useMediaQuery.ts'
import { REDUCED_MOTION_QUERY, usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

const QUERY = '(min-width: 48rem)'

describe('useMediaQuery', () => {
  afterEach(() => installMatchMedia())

  it('is false by default', () => {
    const { result } = renderHook(() => useMediaQuery(QUERY))
    expect(result.current).toBe(false)
  })

  it('reads the current value on mount', () => {
    setMediaQueries({ [QUERY]: true })
    const { result } = renderHook(() => useMediaQuery(QUERY))
    expect(result.current).toBe(true)
  })

  it('updates when the query changes', () => {
    const { result } = renderHook(() => useMediaQuery(QUERY))
    act(() => setMediaQueries({ [QUERY]: true }))
    expect(result.current).toBe(true)
    act(() => setMediaQueries({ [QUERY]: false }))
    expect(result.current).toBe(false)
  })

  it('ignores changes to other queries', () => {
    const { result } = renderHook(() => useMediaQuery(QUERY))
    act(() => setMediaQueries({ '(hover: hover)': true }))
    expect(result.current).toBe(false)
  })

  it('re-subscribes when the query argument changes', () => {
    setMediaQueries({ '(a)': true })
    const { result, rerender } = renderHook(({ q }) => useMediaQuery(q), { initialProps: { q: '(b)' } })
    expect(result.current).toBe(false)
    rerender({ q: '(a)' })
    expect(result.current).toBe(true)
    act(() => setMediaQueries({ '(a)': false }))
    expect(result.current).toBe(false)
  })

  it('stops listening after unmount', () => {
    let renders = 0
    const { unmount } = renderHook(() => {
      renders += 1
      return useMediaQuery(QUERY)
    })
    const before = renders
    unmount()
    act(() => setMediaQueries({ [QUERY]: true }))
    expect(renders).toBe(before)
  })

  it('is false when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined })
    const { result, unmount } = renderHook(() => useMediaQuery(QUERY))
    expect(result.current).toBe(false)
    expect(() => unmount()).not.toThrow()
  })

  it('is false during server rendering', () => {
    setMediaQueries({ [QUERY]: true })
    function Probe() {
      return <span>{String(useMediaQuery(QUERY))}</span>
    }
    expect(renderToString(<Probe />)).toContain('false')
  })
})

describe('usePrefersReducedMotion', () => {
  it('follows the reduced-motion query', () => {
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
    act(() => setMediaQueries({ [REDUCED_MOTION_QUERY]: true }))
    expect(result.current).toBe(true)
  })

  it('uses the standard query string', () => {
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)')
  })
})
