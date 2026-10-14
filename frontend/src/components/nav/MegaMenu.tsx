import type { HTMLAttributes, Ref } from 'react'
import type { MenuSection } from '../../content/menu.ts'
import styles from './MegaMenu.module.css'
import { MenuItemList } from './MenuItemList.tsx'

export interface MegaMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  section: MenuSection
  ref?: Ref<HTMLDivElement>
}

/** Full-width disclosure panel for one category. Visibility is driven by `hidden`. */
export function MegaMenu({ section, ref, ...panelProps }: MegaMenuProps) {
  return (
    <div {...panelProps} ref={ref} className={styles.panel}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.heading}>{section.label}</h2>
          {section.intro && <p className={styles.intro}>{section.intro}</p>}
        </div>
        <MenuItemList section={section} />
      </div>
    </div>
  )
}
