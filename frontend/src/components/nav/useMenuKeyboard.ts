import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'

/** Hover intent: wait before opening a panel on pointer enter. */
export const HOVER_OPEN_DELAY_MS = 120
/** Grace period before closing after the pointer leaves trigger and panel. */
export const HOVER_CLOSE_DELAY_MS = 250
export const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

/** Focusable items inside a panel are marked with this attribute. */
export const MENU_ITEM_ATTR = 'data-menu-item'

type PendingFocus = 'first' | 'last' | null

function panelItems(panel: HTMLElement | null | undefined): HTMLElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLElement>(`[${MENU_ITEM_ATTR}]`)) : []
}

/**
 * Keyboard + hover model for a WAI-ARIA disclosure nav (not role="menu").
 * One panel open at a time. See docs/design-brief.md section 6.
 */
export function useMenuKeyboard(ids: readonly string[]) {
  const [openId, setOpenId] = useState<string | null>(null)
  const canHover = useMediaQuery(HOVER_QUERY)
  const navRef = useRef<HTMLElement>(null)
  const triggers = useRef(new Map<string, HTMLButtonElement>())
  const panels = useRef(new Map<string, HTMLElement>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingFocus = useRef<PendingFocus>(null)
  const openedByHover = useRef(false)

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  const close = useCallback(() => {
    clearTimer()
    openedByHover.current = false
    setOpenId(null)
  }, [clearTimer])

  // Move focus into a panel once it has rendered visible.
  useEffect(() => {
    if (openId === null || pendingFocus.current === null) return
    const items = panelItems(panels.current.get(openId))
    const target = pendingFocus.current === 'first' ? items[0] : items[items.length - 1]
    pendingFocus.current = null
    target?.focus()
  }, [openId])

  // Close on pointerdown outside the nav.
  useEffect(() => {
    if (openId === null) return
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openId, close])

  useEffect(() => clearTimer, [clearTimer])

  const focusTrigger = (id: string | undefined) => {
    if (id !== undefined) triggers.current.get(id)?.focus()
  }

  const isHoverPointer = (event: PointerEvent) => canHover && event.pointerType === 'mouse'

  const scheduleClose = (event: PointerEvent) => {
    if (!isHoverPointer(event)) return
    clearTimer()
    timer.current = setTimeout(close, HOVER_CLOSE_DELAY_MS)
  }

  const getTriggerProps = (id: string) => ({
    ref: (el: HTMLButtonElement | null) => {
      if (el) triggers.current.set(id, el)
      else triggers.current.delete(id)
    },
    type: 'button' as const,
    'aria-expanded': openId === id,
    'aria-controls': `${id}-panel`,
    onClick: () => {
      clearTimer()
      if (openId === id && openedByHover.current) {
        // A click right after hover-open keeps the panel open instead of toggling it shut.
        openedByHover.current = false
        return
      }
      openedByHover.current = false
      setOpenId(openId === id ? null : id)
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const index = ids.indexOf(id)
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          clearTimer()
          openedByHover.current = false
          if (openId === id) {
            panelItems(panels.current.get(id))[0]?.focus()
          } else {
            pendingFocus.current = 'first'
            setOpenId(id)
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          focusTrigger(ids[(index + 1) % ids.length])
          break
        case 'ArrowLeft':
          event.preventDefault()
          focusTrigger(ids[(index - 1 + ids.length) % ids.length])
          break
        case 'Home':
          event.preventDefault()
          focusTrigger(ids[0])
          break
        case 'End':
          event.preventDefault()
          focusTrigger(ids[ids.length - 1])
          break
        case 'Escape':
          if (openId !== null) {
            event.preventDefault()
            close()
          }
          break
      }
    },
    onPointerEnter: (event: PointerEvent) => {
      if (!isHoverPointer(event)) return
      clearTimer()
      timer.current = setTimeout(() => {
        openedByHover.current = true
        setOpenId(id)
      }, HOVER_OPEN_DELAY_MS)
    },
    onPointerLeave: scheduleClose,
  })

  const getPanelProps = (id: string) => ({
    ref: (el: HTMLElement | null) => {
      if (el) panels.current.set(id, el)
      else panels.current.delete(id)
    },
    id: `${id}-panel`,
    hidden: openId !== id,
    onPointerEnter: (event: PointerEvent) => {
      if (isHoverPointer(event)) clearTimer()
    },
    onPointerLeave: scheduleClose,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const items = panelItems(panels.current.get(id))
      const current = items.indexOf(document.activeElement as HTMLElement)
      let next: HTMLElement | undefined
      switch (event.key) {
        case 'ArrowDown':
          next = items[(current + 1) % items.length]
          break
        case 'ArrowUp':
          next = items[current <= 0 ? items.length - 1 : current - 1]
          break
        case 'Home':
          next = items[0]
          break
        case 'End':
          next = items[items.length - 1]
          break
        case 'Escape':
          event.preventDefault()
          close()
          focusTrigger(id)
          return
        default:
          return
      }
      event.preventDefault()
      next?.focus()
    },
  })

  const navProps = {
    ref: navRef,
    onBlur: (event: FocusEvent<HTMLElement>) => {
      // relatedTarget is null when clicking non-focusable content (e.g. panel text);
      // that case is handled by the outside-pointerdown listener instead.
      const next = event.relatedTarget as Node | null
      if (openId !== null && next !== null && !navRef.current?.contains(next)) close()
    },
  }

  return { openId, close, navProps, getTriggerProps, getPanelProps }
}
