import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from '../../test/axe.ts'
import { COPIED_MESSAGE, COPY_FAILED_MESSAGE, COPY_STATUS_RESET_MS, CopyButton } from './CopyButton.tsx'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, writable: true, value })
}

/** Click without user-event so the setup.ts clipboard stub (or our override) stays in place. */
async function click(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button)
  })
}

const status = () => document.querySelector('[aria-live="polite"]') as HTMLElement

describe('CopyButton', () => {
  afterEach(() => {
    vi.useRealTimers()
    window.getSelection()?.removeAllRanges()
  })

  it('renders a button with the default label and an empty polite live region', () => {
    render(<CopyButton text="whoami" />)
    expect(screen.getByRole('button', { name: 'copy command' })).toBeInTheDocument()
    expect(status()).toHaveTextContent('')
  })

  it('uses a custom label', () => {
    render(<CopyButton text="whoami" label="copy whoami" />)
    expect(screen.getByRole('button', { name: 'copy whoami' })).toBeInTheDocument()
  })

  it('copies the text on click and announces success', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<CopyButton text="whoami" />)
    await user.click(screen.getByRole('button', { name: 'copy command' }))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('whoami')
    expect(await navigator.clipboard.readText()).toBe('whoami')
    expect(status()).toHaveTextContent(COPIED_MESSAGE)
  })

  it('copies from keyboard activation too (Enter is a click on a button)', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<CopyButton text="ls" />)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(writeText).toHaveBeenCalledWith('ls')
  })

  it('never touches the clipboard without a click', () => {
    render(<CopyButton text="whoami" />)
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('announces failure and selects the target text when writeText rejects', async () => {
    setClipboard({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) })
    const target = document.createElement('code')
    target.textContent = 'whoami'
    document.body.append(target)
    render(<CopyButton text="whoami" getSelectTarget={() => target} />)
    await click(screen.getByRole('button'))
    expect(status()).toHaveTextContent(COPY_FAILED_MESSAGE)
    expect(window.getSelection()?.toString()).toBe('whoami')
    target.remove()
  })

  it('announces failure when the clipboard API is unavailable', async () => {
    setClipboard(undefined)
    render(<CopyButton text="whoami" />)
    await click(screen.getByRole('button'))
    expect(status()).toHaveTextContent(COPY_FAILED_MESSAGE)
  })

  it('fails gracefully when the select target is missing', async () => {
    setClipboard({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) })
    render(<CopyButton text="whoami" getSelectTarget={() => null} />)
    await click(screen.getByRole('button'))
    expect(status()).toHaveTextContent(COPY_FAILED_MESSAGE)
    expect(window.getSelection()?.toString()).toBe('')
  })

  it('clears the status after the reset delay', async () => {
    vi.useFakeTimers()
    render(<CopyButton text="whoami" />)
    await click(screen.getByRole('button'))
    expect(status()).toHaveTextContent(COPIED_MESSAGE)
    act(() => vi.advanceTimersByTime(COPY_STATUS_RESET_MS - 1))
    expect(status()).toHaveTextContent(COPIED_MESSAGE)
    act(() => vi.advanceTimersByTime(1))
    expect(status()).toHaveTextContent('')
  })

  it('restarts the reset timer on a second click', async () => {
    vi.useFakeTimers()
    render(<CopyButton text="whoami" />)
    await click(screen.getByRole('button'))
    act(() => vi.advanceTimersByTime(COPY_STATUS_RESET_MS - 500))
    await click(screen.getByRole('button'))
    act(() => vi.advanceTimersByTime(1000))
    expect(status()).toHaveTextContent(COPIED_MESSAGE)
    act(() => vi.advanceTimersByTime(COPY_STATUS_RESET_MS))
    expect(status()).toHaveTextContent('')
  })

  it('clears its timer on unmount', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<CopyButton text="whoami" />)
    await click(screen.getByRole('button'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('has no a11y violations', async () => {
    const { container } = render(<CopyButton text="whoami" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
