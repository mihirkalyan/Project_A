import { useEffect, useRef, useState } from 'react'
import styles from './CopyButton.module.css'

export const COPY_STATUS_RESET_MS = 2000
export const COPIED_MESSAGE = 'copied'
export const COPY_FAILED_MESSAGE = 'copy failed, press ctrl+c'

export interface CopyButtonProps {
  text: string
  /** On failure this element's text is selected so the user can copy by hand. */
  getSelectTarget?: () => HTMLElement | null
  label?: string
}

/** Copies `text` from a click only, announcing the result politely. */
export function CopyButton({ text, getSelectTarget, label = 'copy command' }: CopyButtonProps) {
  const [status, setStatus] = useState('')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const announce = (message: string) => {
    clearTimeout(resetTimer.current)
    setStatus(message)
    resetTimer.current = setTimeout(() => setStatus(''), COPY_STATUS_RESET_MS)
  }

  const onClick = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      announce(COPIED_MESSAGE)
    } catch {
      const target = getSelectTarget?.()
      if (target) window.getSelection()?.selectAllChildren(target)
      announce(COPY_FAILED_MESSAGE)
    }
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.button} onClick={onClick}>
        {label}
      </button>
      <span aria-live="polite" className={styles.status}>
        {status}
      </span>
    </span>
  )
}
