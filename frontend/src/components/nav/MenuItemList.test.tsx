import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from '../../test/axe.ts'
import { MegaMenu } from './MegaMenu.tsx'
import { MenuItemList } from './MenuItemList.tsx'
import { testSections } from '../../test/navFixtures.ts'
import { MENU_ITEM_ATTR } from './useMenuKeyboard.ts'

const section = (slug: string) => {
  const found = testSections().find((s) => s.slug === slug)
  if (!found) throw new Error(slug)
  return found
}

describe('MenuItemList', () => {
  it('renders a topic with a url as a safe new-tab link', () => {
    render(<MenuItemList section={section('cloud')} />)
    const link = screen.getByRole('link', { name: 'live repo (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://github.com/someone/repo')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).not.toHaveAttribute('aria-disabled')
    expect(link).toHaveAttribute(MENU_ITEM_ATTR)
  })

  it('renders a topic without a url as a focusable, disabled "soon" link without href', () => {
    render(<MenuItemList section={section('cloud')} />)
    const soon = screen.getByRole('link', { name: 'aws notes soon' })
    expect(soon).toHaveAttribute('aria-disabled', 'true')
    expect(soon).toHaveAttribute('tabindex', '0')
    expect(soon).not.toHaveAttribute('href')
    expect(soon).toHaveAttribute(MENU_ITEM_ATTR)
  })

  it('shows each topic summary', () => {
    render(<MenuItemList section={section('cloud')} />)
    expect(screen.getByText('live-repo summary')).toBeInTheDocument()
    expect(screen.getByText('aws-notes summary')).toBeInTheDocument()
  })

  it('keeps topic order', () => {
    render(<MenuItemList section={section('cloud')} />)
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('live repo'),
      expect.stringContaining('aws notes'),
    ])
  })

  it('shows "nothing here yet" for an empty category', () => {
    render(<MenuItemList section={section('iam')} />)
    expect(screen.getByText('nothing here yet')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders About as a single "about me" soon item, ignoring topics', () => {
    const about = { ...section('about'), topics: section('cloud').topics }
    render(<MenuItemList section={about} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'about me soon' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('has no a11y violations with live, soon and empty states', async () => {
    const { container } = render(
      <>
        <MenuItemList section={section('cloud')} />
        <MenuItemList section={section('iam')} />
        <MenuItemList section={section('about')} />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('MegaMenu', () => {
  it('renders the category heading, intro and items, forwarding panel props', () => {
    render(<MegaMenu section={section('cloud')} id="cloud-panel" data-testid="panel" />)
    const panel = screen.getByTestId('panel')
    expect(panel).toHaveAttribute('id', 'cloud-panel')
    expect(screen.getByRole('heading', { level: 2, name: 'Cloud' })).toBeInTheDocument()
    expect(screen.getByText('cloud intro text')).toBeInTheDocument()
  })

  it('omits the intro paragraph when there is none', () => {
    const { container } = render(<MegaMenu section={section('iam')} />)
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(screen.getByText('nothing here yet')).toBeInTheDocument()
  })

  it('is hidden when the hidden prop is set', () => {
    render(<MegaMenu section={section('cloud')} hidden data-testid="panel" />)
    expect(screen.getByTestId('panel')).not.toBeVisible()
  })
})
