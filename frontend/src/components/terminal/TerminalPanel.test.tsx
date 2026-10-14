import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { site, type TerminalTab } from '../../config/site.ts'
import { axe } from '../../test/axe.ts'
import { TerminalPanel } from './TerminalPanel.tsx'

const TABS: TerminalTab[] = [
  { id: 'one', label: 'one', lines: [{ command: 'whoami', output: ['me'] }, { command: 'pwd', output: ['/home'] }] },
  { id: 'two', label: 'two', lines: [{ command: 'ls', output: ['a', 'b'] }] },
  { id: 'three', label: 'three', lines: [] },
]

function tabs() {
  return screen.getAllByRole('tab')
}

function expectActive(name: string) {
  for (const tab of tabs()) {
    const active = tab.textContent === name
    expect(tab).toHaveAttribute('aria-selected', String(active))
    expect(tab).toHaveAttribute('tabindex', active ? '0' : '-1')
  }
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName(name)
}

describe('TerminalPanel', () => {
  it('renders a labelled tablist with the first tab selected', () => {
    render(<TerminalPanel tabs={TABS} />)
    expect(screen.getByRole('tablist', { name: 'terminal' })).toBeInTheDocument()
    expect(tabs().map((t) => t.textContent)).toEqual(['one', 'two', 'three'])
    expectActive('one')
  })

  it('accepts a custom tablist label', () => {
    render(<TerminalPanel tabs={TABS} label="shell" />)
    expect(screen.getByRole('tablist', { name: 'shell' })).toBeInTheDocument()
  })

  it('wires tabs and panels with aria-controls / aria-labelledby', () => {
    render(<TerminalPanel tabs={TABS} />)
    for (const tab of tabs()) {
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '')
      expect(panel).toHaveAttribute('role', 'tabpanel')
      expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    }
  })

  it('shows only the active panel, with its commands and output', () => {
    render(<TerminalPanel tabs={TABS} />)
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('whoami')).toBeInTheDocument()
    expect(within(panel).getByText('pwd')).toBeInTheDocument()
    expect(within(panel).getByText('/home')).toBeInTheDocument()
    expect(document.getElementById('tabpanel-two')).not.toBeVisible()
  })

  it('activates a tab on click', async () => {
    const user = userEvent.setup()
    render(<TerminalPanel tabs={TABS} />)
    await user.click(screen.getByRole('tab', { name: 'two' }))
    expectActive('two')
    expect(within(screen.getByRole('tabpanel')).getByText('ls')).toBeInTheDocument()
  })

  it('moves and activates with ArrowRight / ArrowLeft, wrapping around', async () => {
    const user = userEvent.setup()
    render(<TerminalPanel tabs={TABS} />)
    screen.getByRole('tab', { name: 'one' }).focus()
    await user.keyboard('{ArrowRight}')
    expectActive('two')
    expect(screen.getByRole('tab', { name: 'two' })).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expectActive('one')
    await user.keyboard('{ArrowLeft}')
    expectActive('three')
    expect(screen.getByRole('tab', { name: 'three' })).toHaveFocus()
  })

  it('jumps with Home and End', async () => {
    const user = userEvent.setup()
    render(<TerminalPanel tabs={TABS} />)
    screen.getByRole('tab', { name: 'one' }).focus()
    await user.keyboard('{End}')
    expectActive('three')
    await user.keyboard('{Home}')
    expectActive('one')
    expect(screen.getByRole('tab', { name: 'one' })).toHaveFocus()
  })

  it('ignores other keys', async () => {
    const user = userEvent.setup()
    render(<TerminalPanel tabs={TABS} />)
    screen.getByRole('tab', { name: 'one' }).focus()
    await user.keyboard('{ArrowDown}a')
    expectActive('one')
  })

  it('Tab moves from the active tab into the panel (roving tabindex)', async () => {
    const user = userEvent.setup()
    render(<TerminalPanel tabs={TABS} />)
    screen.getByRole('tab', { name: 'one' }).focus()
    await user.tab()
    expect(screen.getByRole('tabpanel')).toHaveFocus()
  })

  it('copies the first command of the active tab', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<TerminalPanel tabs={TABS} />)
    await user.click(screen.getByRole('button', { name: 'copy whoami' }))
    expect(writeText).toHaveBeenCalledWith('whoami')
    await user.click(screen.getByRole('tab', { name: 'two' }))
    await user.click(screen.getByRole('button', { name: 'copy ls' }))
    expect(writeText).toHaveBeenLastCalledWith('ls')
  })

  it('on copy failure selects the command text of that tab', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    render(<TerminalPanel tabs={TABS} />)
    await user.click(screen.getByRole('button', { name: 'copy whoami' }))
    expect(window.getSelection()?.toString()).toBe('whoami')
    window.getSelection()?.removeAllRanges()
  })

  it('shows no copy button for a tab without lines', async () => {
    const user = userEvent.setup()
    render(<TerminalPanel tabs={TABS} />)
    await user.click(screen.getByRole('tab', { name: 'three' }))
    expect(within(screen.getByRole('tabpanel')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders an empty tablist for no tabs', () => {
    render(<TerminalPanel tabs={[]} />)
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('ships the brief tabs with placeholder commands and no hostnames beyond the prompt', () => {
    render(<TerminalPanel tabs={site.terminalTabs} />)
    expect(tabs().map((t) => t.textContent)).toEqual(['software', 'cybersecurity', 'blog'])
    const commands = site.terminalTabs.flatMap((t) => t.lines.map((l) => l.command))
    expect(commands).toEqual(expect.arrayContaining(['whoami', 'ls projects/', 'cat skills.txt']))
  })

  it('hides the prompt from assistive tech', () => {
    render(<TerminalPanel tabs={TABS} />)
    const prompt = within(screen.getByRole('tabpanel')).getAllByText(/guest@mihir\.os/)[0]
    expect(prompt).toHaveAttribute('aria-hidden', 'true')
  })

  it('has no a11y violations', async () => {
    const { container } = render(<TerminalPanel tabs={site.terminalTabs} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
