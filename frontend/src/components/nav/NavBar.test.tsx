import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATEGORIES } from '../../content/categories.ts'
import { axe } from '../../test/axe.ts'
import { setMediaQueries } from '../../test/media.ts'
import { testSections } from '../../test/navFixtures.ts'
import { NavBar } from './NavBar.tsx'
import { HOVER_CLOSE_DELAY_MS, HOVER_OPEN_DELAY_MS, HOVER_QUERY } from './useMenuKeyboard.ts'

function setup() {
  const user = userEvent.setup()
  render(
    <>
      <button type="button">outside before</button>
      <NavBar sections={testSections()} />
      <button type="button">outside after</button>
      <p>outside text</p>
    </>,
  )
  return { user }
}

const mainNav = () => screen.getByRole('navigation', { name: 'Main' })
const trigger = (name: string) => within(mainNav()).getByRole('button', { name })
const panel = (slug: string) => document.getElementById(`${slug}-panel`) as HTMLElement

function expectOpen(slug: string | null) {
  for (const { slug: s, label } of CATEGORIES) {
    const open = s === slug
    expect(trigger(label)).toHaveAttribute('aria-expanded', String(open))
    if (open) expect(panel(s)).toBeVisible()
    else expect(panel(s)).not.toBeVisible()
  }
}

describe('NavBar structure', () => {
  it('renders the brand link home, a Main nav with one trigger per category, and the hamburger', () => {
    setup()
    expect(screen.getByRole('link', { name: 'mihir kalyan, home' })).toHaveAttribute('href', '/')
    const triggers = within(mainNav()).getAllByRole('button')
    expect(triggers.map((t) => t.textContent)).toEqual(CATEGORIES.map((c) => c.label))
    expect(screen.getByRole('button', { name: 'menu' })).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('is a disclosure nav, not an ARIA menu', () => {
    setup()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('menubar')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('wires each trigger to its panel with aria-controls', () => {
    setup()
    for (const { slug, label } of CATEGORIES) {
      const t = trigger(label)
      expect(t).toHaveAttribute('type', 'button')
      expect(t).toHaveAttribute('aria-controls', `${slug}-panel`)
      expect(panel(slug)).not.toBeNull()
    }
  })

  it('starts with every panel closed', () => {
    setup()
    expectOpen(null)
  })

  it('shows the intro and items inside the panel', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    const cloud = within(panel('cloud'))
    expect(cloud.getByRole('heading', { level: 2, name: 'Cloud' })).toBeInTheDocument()
    expect(cloud.getByText('cloud intro text')).toBeInTheDocument()
    expect(cloud.getByRole('link', { name: 'live repo (opens in a new tab)' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows "nothing here yet" in an empty category', async () => {
    const { user } = setup()
    await user.click(trigger('IAM'))
    expect(within(panel('iam')).getByText('nothing here yet')).toBeInTheDocument()
  })
})

describe('NavBar mouse clicks', () => {
  it('toggles a panel on click', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    expectOpen('cloud')
    await user.click(trigger('Cloud'))
    expectOpen(null)
  })

  it('keeps only one panel open at a time', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    await user.click(trigger('App Sec'))
    expectOpen('app-sec')
  })

  it('closes on a pointerdown outside the nav', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    await user.click(screen.getByText('outside text'))
    expectOpen(null)
  })

  it('stays open on a pointerdown on non-focusable panel content', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    await user.click(within(panel('cloud')).getByText('cloud intro text'))
    expectOpen('cloud')
  })
})

describe('NavBar keyboard', () => {
  it('focus alone does not open a panel', async () => {
    const { user } = setup()
    screen.getByRole('button', { name: 'outside before' }).focus()
    await user.tab()
    await user.tab()
    expect(trigger('Cloud')).toHaveFocus()
    expectOpen(null)
  })

  it.each(['{Enter}', ' '])('%s toggles the focused panel', async (key) => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard(key)
    expectOpen('cloud')
    await user.keyboard(key)
    expectOpen(null)
  })

  it('ArrowDown opens the panel and focuses its first item', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}')
    expectOpen('cloud')
    expect(within(panel('cloud')).getByRole('link', { name: /live repo/ })).toHaveFocus()
  })

  it('ArrowDown on an already-open trigger focuses the first item', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    await user.keyboard('{ArrowDown}')
    expect(within(panel('cloud')).getByRole('link', { name: /live repo/ })).toHaveFocus()
  })

  it('ArrowDown on another trigger switches panels and focuses its first item', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    trigger('App Sec').focus()
    await user.keyboard('{ArrowDown}')
    expectOpen('app-sec')
    expect(within(panel('app-sec')).getByRole('link', { name: /burp suite/ })).toHaveFocus()
  })

  it('ArrowDown on an empty category opens it and keeps focus on the trigger', async () => {
    const { user } = setup()
    trigger('IAM').focus()
    await user.keyboard('{ArrowDown}')
    expectOpen('iam')
    expect(trigger('IAM')).toHaveFocus()
  })

  it('ArrowRight / ArrowLeft move between triggers and wrap', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowRight}')
    expect(trigger('App Sec')).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(trigger('About')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(trigger('Cloud')).toHaveFocus()
    expectOpen(null)
  })

  it('Home / End jump to the first and last trigger', async () => {
    const { user } = setup()
    trigger('IAM').focus()
    await user.keyboard('{End}')
    expect(trigger('About')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(trigger('Cloud')).toHaveFocus()
  })

  it('Escape on a trigger closes the open panel and keeps focus there', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    await user.keyboard('{Escape}')
    expectOpen(null)
    expect(trigger('Cloud')).toHaveFocus()
  })

  it('Escape on a trigger with nothing open is a no-op', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{Escape}')
    expectOpen(null)
    expect(trigger('Cloud')).toHaveFocus()
  })

  it('ArrowDown / ArrowUp move between panel items and wrap', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}')
    const [live, soon] = within(panel('cloud')).getAllByRole('link')
    expect(live).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(soon).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(live).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(soon).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(live).toHaveFocus()
  })

  it('Home / End inside a panel jump to the first and last item', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}')
    const [live, soon] = within(panel('cloud')).getAllByRole('link')
    await user.keyboard('{End}')
    expect(soon).toHaveFocus()
    await user.keyboard('{Home}')
    expect(live).toHaveFocus()
  })

  it('other keys inside a panel do nothing', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}')
    const [live] = within(panel('cloud')).getAllByRole('link')
    await user.keyboard('x')
    expect(live).toHaveFocus()
    expectOpen('cloud')
  })

  it('Escape inside a panel closes it and returns focus to its trigger', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}')
    expectOpen(null)
    expect(trigger('Cloud')).toHaveFocus()
  })

  it('soon items are reachable with Tab inside the open panel', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}')
    await user.tab()
    expect(within(panel('cloud')).getByRole('link', { name: 'aws notes soon' })).toHaveFocus()
  })

  it('closes when focus leaves the nav', async () => {
    const { user } = setup()
    trigger('Cloud').focus()
    await user.keyboard('{ArrowDown}')
    act(() => screen.getByRole('button', { name: 'outside after' }).focus())
    expectOpen(null)
  })

  it('stays open while focus moves within the nav', async () => {
    const { user } = setup()
    await user.click(trigger('Cloud'))
    await user.keyboard('{ArrowRight}')
    expect(trigger('App Sec')).toHaveFocus()
    expectOpen('cloud')
  })
})

describe('NavBar hover', () => {
  afterEach(() => vi.useRealTimers())

  const over = (el: HTMLElement) => fireEvent.pointerOver(el, { pointerType: 'mouse' })
  const out = (el: HTMLElement) => fireEvent.pointerOut(el, { pointerType: 'mouse', relatedTarget: document.body })
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

  function hoverSetup() {
    vi.useFakeTimers()
    act(() => setMediaQueries({ [HOVER_QUERY]: true }))
    return render(<NavBar sections={testSections()} />)
  }

  it('opens after the hover delay, not before', () => {
    hoverSetup()
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS - 1)
    expectOpen(null)
    advance(1)
    expectOpen('cloud')
  })

  it('does not open if the pointer leaves before the delay', () => {
    hoverSetup()
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS / 2)
    out(trigger('Cloud'))
    advance(HOVER_CLOSE_DELAY_MS + HOVER_OPEN_DELAY_MS)
    expectOpen(null)
  })

  it('closes after the grace period once the pointer leaves', () => {
    hoverSetup()
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS)
    out(trigger('Cloud'))
    advance(HOVER_CLOSE_DELAY_MS - 1)
    expectOpen('cloud')
    advance(1)
    expectOpen(null)
  })

  it('stays open when the pointer moves from the trigger into the panel', () => {
    hoverSetup()
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS)
    out(trigger('Cloud'))
    over(panel('cloud'))
    advance(HOVER_CLOSE_DELAY_MS * 4)
    expectOpen('cloud')
    out(panel('cloud'))
    advance(HOVER_CLOSE_DELAY_MS)
    expectOpen(null)
  })

  it('switches panels when hovering another trigger', () => {
    hoverSetup()
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS)
    out(trigger('Cloud'))
    over(trigger('App Sec'))
    advance(HOVER_OPEN_DELAY_MS)
    expectOpen('app-sec')
  })

  it('a click right after hover-open keeps the panel open; a second click closes it', () => {
    hoverSetup()
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS)
    fireEvent.click(trigger('Cloud'))
    expectOpen('cloud')
    fireEvent.click(trigger('Cloud'))
    expectOpen(null)
  })

  it('ignores hover on devices without fine hover', () => {
    vi.useFakeTimers()
    render(<NavBar sections={testSections()} />)
    over(trigger('Cloud'))
    advance(HOVER_OPEN_DELAY_MS * 2)
    expectOpen(null)
  })

  it('ignores touch and pen pointers even when hover is available', () => {
    hoverSetup()
    fireEvent.pointerOver(trigger('Cloud'), { pointerType: 'touch' })
    fireEvent.pointerOver(trigger('IAM'), { pointerType: 'pen' })
    advance(HOVER_OPEN_DELAY_MS * 2)
    expectOpen(null)
  })

  it('does not close a click-opened panel on touch pointer leave', () => {
    hoverSetup()
    fireEvent.click(trigger('Cloud'))
    fireEvent.pointerOut(trigger('Cloud'), { pointerType: 'touch', relatedTarget: document.body })
    advance(HOVER_CLOSE_DELAY_MS * 2)
    expectOpen('cloud')
  })

  it('clears pending timers on unmount', () => {
    const { unmount } = hoverSetup()
    over(trigger('Cloud'))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('NavBar a11y', () => {
  it('has no a11y violations with everything closed', async () => {
    const { container } = render(<NavBar sections={testSections()} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no a11y violations with a panel open', async () => {
    const user = userEvent.setup()
    const { container } = render(<NavBar sections={testSections()} />)
    await user.click(trigger('Cloud'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
