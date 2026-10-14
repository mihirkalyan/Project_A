import type { MenuSection } from '../../content/menu.ts'
import styles from './MenuItemList.module.css'
import { MENU_ITEM_ATTR } from './useMenuKeyboard.ts'

const itemAttr = { [MENU_ITEM_ATTR]: '' }

function Soon({ children }: { children: string }) {
  return (
    // Not focusable as a real link yet: the route ships in phase 2.
    <a {...itemAttr} role="link" aria-disabled="true" tabIndex={0} className={`${styles.item} ${styles.disabled}`}>
      <span className={styles.title}>{children}</span> <span className={styles.badge}>soon</span>
    </a>
  )
}

/** Items of one category: live external links, "soon" placeholders or the empty state. */
export function MenuItemList({ section }: { section: MenuSection }) {
  if (section.kind === 'about') {
    return (
      <ul className={styles.list}>
        <li>
          <Soon>about me</Soon>
        </li>
      </ul>
    )
  }
  if (section.topics.length === 0) {
    return <p className={styles.empty}>nothing here yet</p>
  }
  return (
    <ul className={styles.list}>
      {section.topics.map((topic) => (
        <li key={topic.slug} className={styles.entry}>
          {topic.url ? (
            <a {...itemAttr} href={topic.url} target="_blank" rel="noopener noreferrer" className={styles.item}>
              <span className={styles.title}>{topic.title}</span>{' '}
              <span className="visually-hidden">(opens in a new tab)</span>
              <span aria-hidden="true" className={styles.external}>
                {' '}
                ↗
              </span>
            </a>
          ) : (
            <Soon>{topic.title}</Soon>
          )}
          <p className={styles.summary}>{topic.summary}</p>
        </li>
      ))}
    </ul>
  )
}
