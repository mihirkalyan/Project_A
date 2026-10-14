import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATEGORIES } from '../../content/categories.ts'
import { axe } from '../../test/axe.ts'
import { testSections } from '../../test/navFixtures.ts'
import { MobileDrawer } from './MobileDrawer.tsx'
import { NavBar } from './NavBar.tsx'

const hamburger = () => screen.getByRole('button', { name: 'menu' })
const dialog = () => document.querySelector('dialog') as HTMLDialogElement
const drawerNav = () => screen.getByRole('navigation', { name: 'Mobile' })
const toggle = (name: string) => within(drawerNav()).getByRole('button', { name })
const scrollLocked = () => 'scrollLocked' in document.documentElement.dataset

async function openDrawer() {
  const user = userEvent.setup()
  const { container } = render(<NavBar sections={testSections()} />)
  await user.click(hamburger())
  return { user, container }
}

describe('MobileDrawer via the hamburger', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts closed', () => {
    render(<NavBar sections={testSections()} />)
    expect(hamburger()).toHaveAttribute('aria-expanded', 'false')
    expect(dialog()).not.toHaveAttribute('open')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(scrollLocked()).toBe(false)
  })

  it('opens as a modal dialog with showModal and locks page scroll', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    await openDrawer()
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'site menu' })).toBeVisible()
    expect(hamburger()).toHaveAttribute('aria-expanded', 'true')
    expect(scrollLocked()).toBe(true)
  })

  it('lists every category as a collapsed accordion toggle', async () => {
    await openDrawer()
    const toggles = within(drawerNav()).getAllByRole('button')
    expect(toggles.map((t) => t.textContent?.replace(/[+-]$/, ''))).toEqual(CATEGORIES.map((c) => c.label))
    for (const t of toggles) {
      expect(t).toHaveAttribute('aria-expanded', 'false')
      expect(document.getElementById(t.getAttribute('aria-controls') ?? '')).not.toBeVisible()
    }
  })

  it('the close button closes it, unlocks scroll and returns focus to the hamburger', async () => {
    const { user } = await openDrawer()
    await user.click(screen.getByRole('button', { name: 'close' }))
    expect(dialog()).not.toHaveAttribute('open')
    expect(hamburger()).toHaveAttribute('aria-expanded', 'false')
    expect(hamburger()).toHaveFocus()
    expect(scrollLocked()).toBe(false)
  })

  it('a native close (Esc) syncs state and returns focus to the hamburger', async () => {
    await openDrawer()
    act(() => dialog().close())
    expect(hamburger()).toHaveAttribute('aria-expanded', 'false')
    expect(hamburger()).toHaveFocus()
    expect(scrollLocked()).toBe(false)
  })

  it('a click on the backdrop (the dialog itself) closes it', async () => {
    await openDrawer()
    fireEvent.click(dialog())
    expect(dialog()).not.toHaveAttribute('open')
    expect(hamburger()).toHaveFocus()
  })

  it('a click inside the drawer content does not close it', async () => {
    const { user } = await openDrawer()
    await user.click(screen.getByText('menu', { selector: 'p' }))
    await user.click(toggle('Cloud'))
    expect(dialog()).toHaveAttribute('open')
  })

  it('can be reopened after closing', async () => {
    const { user } = await openDrawer()
    await user.click(screen.getByRole('button', { name: 'close' }))
    await user.click(hamburger())
    expect(dialog()).toHaveAttribute('open')
    expect(scrollLocked()).toBe(true)
  })
})

describe('MobileDrawer accordion', () => {
  it('expands a section to show its intro and items', async () => {
    const { user } = await openDrawer()
    await user.click(toggle('Cloud'))
    expect(toggle('Cloud')).toHaveAttribute('aria-expanded', 'true')
    const body = document.getElementById('drawer-cloud') as HTMLElement
    expect(toggle('Cloud')).toHaveAttribute('aria-controls', 'drawer-cloud')
    expect(body).toBeVisible()
    expect(within(body).getByText('cloud intro text')).toBeInTheDocument()
    const live = within(body).getByRole('link', { name: 'live repo (opens in a new tab)' })
    expect(live).toHaveAttribute('target', '_blank')
    expect(live).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(body).getByRole('link', { name: 'aws notes soon' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('keeps one section open at a time and collapses on a second click', async () => {
    const { user } = await openDrawer()
    await user.click(toggle('Cloud'))
    await user.click(toggle('App Sec'))
    expect(toggle('Cloud')).toHaveAttribute('aria-expanded', 'false')
    expect(toggle('App Sec')).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle('App Sec'))
    expect(toggle('App Sec')).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('drawer-app-sec')).not.toBeVisible()
  })

  it('shows the empty state and the About placeholder', async () => {
    const { user } = await openDrawer()
    await user.click(toggle('IAM'))
    expect(within(document.getElementById('drawer-iam') as HTMLElement).getByText('nothing here yet')).toBeVisible()
    await user.click(toggle('About'))
    expect(
      within(document.getElementById('drawer-about') as HTMLElement).getByRole('link', { name: 'about me soon' }),
    ).toBeInTheDocument()
  })

  it('toggles with the keyboard', async () => {
    const { user } = await openDrawer()
    toggle('Cloud').focus()
    await user.keyboard('{Enter}')
    expect(toggle('Cloud')).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(toggle('Cloud')).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('MobileDrawer standalone', () => {
  it('opens and closes from the open prop and copes with a null return target', () => {
    const onClose = vi.fn()
    const ref = createRef<HTMLElement>()
    const { rerender } = render(<MobileDrawer open sections={testSections()} onClose={onClose} returnFocusRef={ref} />)
    expect(dialog()).toHaveAttribute('open')
    rerender(<MobileDrawer open={false} sections={testSections()} onClose={onClose} returnFocusRef={ref} />)
    expect(dialog()).not.toHaveAttribute('open')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(scrollLocked()).toBe(false)
  })

  it('unlocks scroll when unmounted while open', () => {
    const { unmount } = render(
      <MobileDrawer open sections={testSections()} onClose={() => {}} returnFocusRef={createRef()} />,
    )
    expect(scrollLocked()).toBe(true)
    unmount()
    expect(scrollLocked()).toBe(false)
  })
})

describe('MobileDrawer a11y', () => {
  it('has no a11y violations when open with a section expanded', async () => {
    const { user, container } = await openDrawer()
    await user.click(toggle('Cloud'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
