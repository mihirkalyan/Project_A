import styles from './PixelDivider.module.css'

/** Decorative jagged, stepped divider between sections. */
export function PixelDivider() {
  return <div aria-hidden="true" className={styles.divider} />
}
