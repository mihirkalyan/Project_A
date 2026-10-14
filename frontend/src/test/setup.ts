import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'
import { installMatchMedia, resetMediaQueries } from './media.ts'

expect.extend(axeMatchers)

// --- matchMedia: jsdom has none. Tests flip queries with setMediaQueries(). ---
installMatchMedia()

// --- <dialog>: jsdom 30 lacks showModal/close. Minimal, spec-shaped stubs. ---
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute('open')) return
    if (returnValue !== undefined) this.returnValue = returnValue
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// --- clipboard: jsdom has none. Note userEvent.setup() installs its own stub. ---
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: { writeText: vi.fn(() => Promise.resolve()), readText: vi.fn(() => Promise.resolve('')) },
  })
})

afterEach(() => {
  cleanup()
  resetMediaQueries()
  delete document.documentElement.dataset.scrollLocked
})
