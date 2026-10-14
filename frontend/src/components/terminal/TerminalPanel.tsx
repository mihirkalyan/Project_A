import { type KeyboardEvent, useRef, useState } from 'react'
import type { TerminalTab } from '../../config/site.ts'
import { CopyButton } from './CopyButton.tsx'
import styles from './TerminalPanel.module.css'

const PROMPT = 'guest@mihir.os:~$'

/** WAI-ARIA tabs, roving tabindex, automatic activation. */
export function TerminalPanel({ tabs, label = 'terminal' }: { tabs: readonly TerminalTab[]; label?: string }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const commandRefs = useRef(new Map<string, HTMLElement>())

  const activate = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length]
    setActiveId(tab.id)
    tabRefs.current.get(tab.id)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    activate(next)
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.chrome}>
        <span aria-hidden="true" className={styles.dots}>
          <span />
          <span />
          <span />
        </span>
        <div role="tablist" aria-label={label} className={styles.tablist}>
          {tabs.map((tab, index) => {
            const selected = tab.id === activeId
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el)
                  else tabRefs.current.delete(tab.id)
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={styles.tab}
                onClick={() => setActiveId(tab.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      {tabs.map((tab) => {
        const first = tab.lines[0]
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={tab.id !== activeId}
            tabIndex={0}
            className={styles.panel}
          >
            {tab.lines.map((line, lineIndex) => (
              <div key={line.command} className={styles.block}>
                <p className={styles.line}>
                  <span aria-hidden="true" className={styles.prompt}>
                    {PROMPT}{' '}
                  </span>
                  <code
                    ref={
                      lineIndex === 0
                        ? (el) => {
                            if (el) commandRefs.current.set(tab.id, el)
                            else commandRefs.current.delete(tab.id)
                          }
                        : undefined
                    }
                    className={styles.command}
                  >
                    {line.command}
                  </code>
                </p>
                {line.output.map((out) => (
                  <p key={out} className={styles.output}>
                    {out}
                  </p>
                ))}
              </div>
            ))}
            {first && (
              <div className={styles.actions}>
                <CopyButton
                  text={first.command}
                  label={`copy ${first.command}`}
                  getSelectTarget={() => commandRefs.current.get(tab.id) ?? null}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
