import { type MouseEvent, type RefObject, useEffect, useRef, useState } from 'react'
import type { MenuSection } from '../../content/menu.ts'
import { MenuItemList } from './MenuItemList.tsx'
import styles from './MobileDrawer.module.css'

export interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  sections: readonly MenuSection[]
  /** Focus returns here when the drawer closes (the hamburger). */
  returnFocusRef: RefObject<HTMLElement | null>
}

/**
 * Native modal <dialog>: showModal() gives the focus trap, Esc to close and
 * an inert background. Categories are an accordion; page scroll is locked.
 */
export function MobileDrawer({ open, onClose, sections, returnFocusRef }: MobileDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.dataset.scrollLocked = ''
    return () => {
      delete root.dataset.scrollLocked
    }
  }, [open])

  const handleClose = () => {
    onClose()
    returnFocusRef.current?.focus()
  }

  const closeDialog = () => dialogRef.current?.close()

  // A click whose target is the <dialog> itself landed on the backdrop.
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) closeDialog()
  }

  return (
    <dialog ref={dialogRef} aria-label="site menu" className={styles.drawer} onClose={handleClose} onClick={onDialogClick}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <p className={styles.title}>menu</p>
          <button type="button" className={styles.close} onClick={closeDialog}>
            close <span aria-hidden="true">x</span>
          </button>
        </div>
        <nav aria-label="Mobile">
          <ul className={styles.sections}>
            {sections.map((section) => {
              const isOpen = expanded === section.slug
              const panelId = `drawer-${section.slug}`
              return (
                <li key={section.slug} className={styles.section}>
                  <h2 className={styles.heading}>
                    <button
                      type="button"
                      className={styles.toggle}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setExpanded(isOpen ? null : section.slug)}
                    >
                      <span className={styles.label}>{section.label}</span>
                      <span aria-hidden="true">{isOpen ? '-' : '+'}</span>
                    </button>
                  </h2>
                  <div id={panelId} hidden={!isOpen} className={styles.body}>
                    {section.intro && <p className={styles.intro}>{section.intro}</p>}
                    <MenuItemList section={section} />
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </dialog>
  )
}
