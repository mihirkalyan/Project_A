import { site } from '../../config/site.ts'
import { PixelGhost } from '../mascot/PixelGhost.tsx'
import { TerminalPanel } from '../terminal/TerminalPanel.tsx'
import styles from './Hero.module.css'

/** Hero: the page's only h1, the pitch, the mascot and the terminal on graph paper. */
export function Hero() {
  const { hero } = site
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className={styles.intro}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{site.tagline}</p>
          <h1 id="hero-title" className={styles.title}>
            {hero.before}
            <span className={styles.name}>{hero.name}</span>
            {hero.after}
          </h1>
          <p className={styles.pitch}>{hero.pitch}</p>
        </div>
        <PixelGhost className={styles.ghost} />
      </div>
      <div className={styles.paper}>
        <TerminalPanel tabs={site.terminalTabs} />
      </div>
    </section>
  )
}
