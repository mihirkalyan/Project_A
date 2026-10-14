import { useRef, useState } from 'react'
import { site } from '../../config/site.ts'
import type { MenuSection } from '../../content/menu.ts'
import { MegaMenu } from './MegaMenu.tsx'
import { MobileDrawer } from './MobileDrawer.tsx'
import styles from './NavBar.module.css'
import { useMenuKeyboard } from './useMenuKeyboard.ts'

/** Slim top bar: brand, desktop mega-menu triggers (>= 48rem) and the mobile hamburger. */
export function NavBar({ sections }: { sections: readonly MenuSection[] }) {
  const { navProps, getTriggerProps, getPanelProps } = useMenuKeyboard(sections.map((s) => s.slug))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className={styles.bar}>
      <a href="/" className={styles.brand}>
        {site.shortName}{' '}
        <span className="visually-hidden">kalyan, home</span>
        <span aria-hidden="true" className={styles.cursor}>
          _
        </span>
      </a>

      <nav aria-label="Main" className={styles.nav} {...navProps}>
        <ul className={styles.triggers}>
          {sections.map((section) => (
            <li key={section.slug}>
              <button className={styles.trigger} {...getTriggerProps(section.slug)}>
                {section.label}
              </button>
            </li>
          ))}
        </ul>
        {sections.map((section) => (
          <MegaMenu key={section.slug} section={section} {...getPanelProps(section.slug)} />
        ))}
      </nav>

      <button
        ref={hamburgerRef}
        type="button"
        className={styles.hamburger}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <span aria-hidden="true" className={styles.hamburgerIcon} />
        menu
      </button>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sections={sections}
        returnFocusRef={hamburgerRef}
      />
    </div>
  )
}
