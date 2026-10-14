import { site } from './config/site.ts'
import { PixelDivider } from './components/divider/PixelDivider.tsx'
import { Footer } from './components/footer/Footer.tsx'
import { WindowFrame } from './components/frame/WindowFrame.tsx'
import { Hero } from './components/hero/Hero.tsx'
import { NavBar } from './components/nav/NavBar.tsx'
import type { MenuSection } from './content/menu.ts'

export function App({ sections }: { sections: readonly MenuSection[] }) {
  return (
    <>
      <a href="#main" className="skip-link">
        skip to content
      </a>
      <WindowFrame title={site.windowTitle}>
        <header>
          <NavBar sections={sections} />
        </header>
        <main id="main" tabIndex={-1}>
          <Hero />
        </main>
        <PixelDivider />
        <Footer />
      </WindowFrame>
    </>
  )
}
