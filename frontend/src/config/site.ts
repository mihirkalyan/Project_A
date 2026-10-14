export interface TerminalLine {
  command: string
  output: readonly string[]
}

export interface TerminalTab {
  id: string
  label: string
  lines: readonly TerminalLine[]
}

export interface SiteLinks {
  /**
   * TODO(mihir): set to your GitHub profile, e.g. "https://github.com/<username>".
   * Must be https. Rendered in the footer only when set.
   */
  github: string
  /**
   * TODO(mihir): set to a public contact address, e.g. "hello@example.com".
   * Rendered as a mailto: link only when set.
   */
  email: string
}

const links: SiteLinks = {
  github: '',
  email: '',
}

export const site: {
  name: string
  shortName: string
  windowTitle: string
  tagline: string
  hero: { before: string; name: string; after: string; pitch: string }
  links: SiteLinks
  terminalTabs: readonly TerminalTab[]
} = {
  name: 'Mihir Kalyan',
  shortName: 'mihir',
  windowTitle: 'mihir.os',
  /** TODO(mihir): placeholder tagline, replace with your own. */
  tagline: 'software + security. tagline loading...',
  hero: {
    before: "hi, i'm ",
    name: 'mihir',
    after: '. i break things to secure them.',
    pitch:
      'i build software and poke at it until it gets stronger. cloud, app sec, networks, identity and a bit of automation. this site is my lab notebook.',
  },
  links,
  terminalTabs: [
    {
      id: 'software',
      label: 'software',
      lines: [
        { command: 'whoami', output: ['mihir: builder, breaker, fixer'] },
        { command: 'ls projects/', output: ['nothing here yet. check back soon.'] },
      ],
    },
    {
      id: 'cybersecurity',
      label: 'cybersecurity',
      lines: [
        {
          command: 'cat skills.txt',
          output: ['cloud  app-sec  network-sec  iam  secops', 'ai + automation  documentation'],
        },
      ],
    },
    {
      id: 'blog',
      label: 'blog',
      lines: [{ command: 'ls posts/', output: ['nothing here yet. first post is brewing.'] }],
    },
  ],
}
