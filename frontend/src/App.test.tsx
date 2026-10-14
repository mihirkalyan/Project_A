import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App.tsx'
import { site } from './config/site.ts'
import { CATEGORIES } from './content/categories.ts'
import { intros, topics } from './content/loader.ts'
import { buildMenu } from './content/menu.ts'
import { axe } from './test/axe.ts'

const realSections = () => buildMenu(topics, intros)
const panel = (slug: string) => document.getElementById(`${slug}-panel`) as HTMLElement

describe('App', () => {
  it('renders the banner, Main nav, main, contentinfo and exactly one h1', () => {
    render(<App sections={buildMenu([], [])} />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('has a skip link to a focusable main', async () => {
    const user = userEvent.setup()
    render(<App sections={buildMenu([], [])} />)
    await user.tab()
    const skip = screen.getByRole('link', { name: 'skip to content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(main).toHaveAttribute('tabindex', '-1')
  })

  it('shows the hero copy, mascot and terminal', () => {
    render(<App sections={buildMenu([], [])} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(`${site.hero.before}${site.hero.name}${site.hero.after}`)
    expect(screen.getByText(site.hero.pitch)).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'terminal' })).toBeInTheDocument()
    expect(document.querySelector('main svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders every category trigger with no content at all', () => {
    render(<App sections={buildMenu([], [])} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(CATEGORIES.map((c) => c.label))
  })

  it('has no a11y violations with empty content', async () => {
    const { container } = render(<App sections={buildMenu([], [])} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('App with the real content/', () => {
  it('lists each real topic in its category panel', async () => {
    const user = userEvent.setup()
    render(<App sections={realSections()} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const section of realSections().filter((s) => s.kind === 'topics')) {
      await user.click(within(nav).getByRole('button', { name: section.label }))
      const p = within(panel(section.slug))
      if (section.topics.length === 0) {
        expect(p.getByText('nothing here yet')).toBeVisible()
      }
      for (const topic of section.topics) {
        const name = topic.url ? `${topic.title} (opens in a new tab)` : `${topic.title} soon`
        expect(p.getByRole('link', { name })).toBeVisible()
        expect(p.getByText(topic.summary)).toBeVisible()
      }
    }
  })

  it('shows the projects intro at the top of the Projects panel', async () => {
    const user = userEvent.setup()
    render(<App sections={realSections()} />)
    const intro = intros.find((i) => i.category === 'projects')
    expect(intro).toBeDefined()
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: 'Projects' }))
    expect(within(panel('projects')).getByText(intro?.summary ?? '')).toBeVisible()
  })

  it('has no a11y violations with real content and a panel open', async () => {
    const user = userEvent.setup()
    const { container } = render(<App sections={realSections()} />)
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: 'App Sec' }))
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no a11y violations with the mobile drawer open', async () => {
    const user = userEvent.setup()
    const { container } = render(<App sections={realSections()} />)
    await user.click(screen.getByRole('button', { name: 'menu' }))
    await user.click(within(screen.getByRole('navigation', { name: 'Mobile' })).getByRole('button', { name: 'Projects' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
