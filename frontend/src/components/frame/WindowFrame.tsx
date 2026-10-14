import type { ReactNode } from 'react'
import styles from './WindowFrame.module.css'

/** Bordered retro "window" around the whole page. The title bar is decorative. */
export function WindowFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <div aria-hidden="true" className={styles.titleBar}>
        <span className={styles.title}>{title}</span>
        <span className={styles.buttons}>
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  )
}
