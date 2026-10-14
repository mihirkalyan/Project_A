import { site } from '../../config/site.ts'
import { safeHttpsUrl, safeMailto } from '../../lib/safeUrl.ts'
import styles from './Footer.module.css'

interface FooterLink {
  label: string
  href: string
  external: boolean
}

/** Only links that are set and pass the safety checks are rendered. */
export function footerLinks(links = site.links): FooterLink[] {
  const result: FooterLink[] = []
  const github = safeHttpsUrl(links.github)
  if (github) result.push({ label: 'github', href: github, external: true })
  const email = safeMailto(links.email)
  if (email) result.push({ label: 'email', href: email, external: false })
  return result
}

export function Footer() {
  const links = footerLinks()
  return (
    <footer className={styles.footer}>
      <p className={styles.name}>{site.name.toLowerCase()}</p>
      {links.length > 0 && (
        <ul className={styles.links}>
          {links.map((link) => (
            <li key={link.label}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}{' '}
                  <span className="visually-hidden">(opens in a new tab)</span>
                </a>
              ) : (
                <a href={link.href}>{link.label}</a>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>made of pixels and stubbornness. no trackers, no cookies.</p>
    </footer>
  )
}
