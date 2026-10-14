// Controllable matchMedia stub for jsdom. All queries are false unless set.
type Listener = (event: MediaQueryListEvent) => void

const state = new Map<string, boolean>()
const listeners = new Map<string, Set<Listener>>()

function listFor(query: string): MediaQueryList {
  return {
    get matches() {
      return state.get(query) ?? false
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => {
      if (!listeners.has(query)) listeners.set(query, new Set())
      listeners.get(query)?.add(listener)
    },
    removeEventListener: (_type: string, listener: Listener) => {
      listeners.get(query)?.delete(listener)
    },
    addListener: (listener: Listener) => listFor(query).addEventListener('change', listener),
    removeListener: (listener: Listener) => listFor(query).removeEventListener('change', listener),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList
}

export function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => listFor(query),
  })
}

/** Set query results, e.g. { '(prefers-reduced-motion: reduce)': true }, and notify subscribers. */
export function setMediaQueries(values: Record<string, boolean>): void {
  for (const [query, matches] of Object.entries(values)) {
    state.set(query, matches)
    for (const listener of listeners.get(query) ?? []) {
      listener({ matches, media: query } as MediaQueryListEvent)
    }
  }
}

export function resetMediaQueries(): void {
  state.clear()
  listeners.clear()
}
