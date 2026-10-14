import { describe, expect, it } from 'vitest'
import { ContentError } from './frontmatter.ts'
import { publishContent, toModuleSource } from './publish.ts'

const DEV = { production: false }
const PROD = { production: true }

const TOPIC_FIELDS = ['category', 'date', 'draft', 'related', 'screenshots', 'slug', 'summary', 'title', 'tools']
const OPTIONAL_FIELDS = ['icon', 'order', 'url', 'video']

const BODY_CANARY = 'BODY-CANARY-7f3a do not ship'
const DRAFT_CANARY = 'draft-canary-91c2'
const INTRO_BODY_CANARY = 'INTRO-BODY-CANARY-44de'

function topicMd(fields: string, body = `${BODY_CANARY}\n`): string {
  return `---\ntitle: burp suite\ncategory: app-sec\nsummary: intercepting requests.\ndate: "2026-10-13"\n${fields}\n---\n${body}`
}

const FULL = topicMd(
  [
    'tools: [burp, zap]',
    'screenshots: [{ src: media/burp-scan.png, alt: "scan results" }]',
    'video: { src: media/demo.mp4, title: demo, poster: media/demo-poster.webp }',
    'related: [app-sec/plain]',
    'icon: icons/burp.svg',
    'order: 2',
    'url: https://github.com/someone/repo',
  ].join('\n'),
)

const FILES = {
  '/content/topics/full.md': FULL,
  '/content/topics/plain.md': topicMd('draft: false'),
  [`/content/topics/${DRAFT_CANARY}.md`]: topicMd(`draft: true\ntools: [${DRAFT_CANARY}]`),
}
const INTROS = { '/content/intros/projects.md': `---\ntitle: projects\nsummary: things i built\n---\n${INTRO_BODY_CANARY}\n` }

describe('publishContent: allowlist', () => {
  const { topics, intros } = publishContent(FILES, INTROS, DEV)

  it('copies only allowlisted topic fields (no body, no file)', () => {
    for (const topic of topics) {
      expect(topic).not.toHaveProperty('body')
      expect(topic).not.toHaveProperty('file')
      for (const key of Object.keys(topic)) expect([...TOPIC_FIELDS, ...OPTIONAL_FIELDS]).toContain(key)
    }
  })

  it('publishes every optional field when set', () => {
    const full = topics.find((t) => t.slug === 'full')
    expect(full).toEqual({
      slug: 'full',
      category: 'app-sec',
      title: 'burp suite',
      summary: 'intercepting requests.',
      date: '2026-10-13',
      tools: ['burp', 'zap'],
      screenshots: [{ src: 'media/burp-scan.png', alt: 'scan results' }],
      video: { src: 'media/demo.mp4', title: 'demo', poster: 'media/demo-poster.webp' },
      related: ['app-sec/plain'],
      icon: 'icons/burp.svg',
      order: 2,
      url: 'https://github.com/someone/repo',
      draft: false,
    })
  })

  it('omits optional fields that are not set (no undefined keys)', () => {
    const plain = topics.find((t) => t.slug === 'plain')
    expect(Object.keys(plain ?? {}).sort()).toEqual(TOPIC_FIELDS)
  })

  it('omits video.poster when the video has none', () => {
    const [topic] = publishContent(
      { '/content/topics/v.md': topicMd('video: { src: media/demo.webm, title: demo }') },
      {},
      DEV,
    ).topics
    expect(topic.video).toEqual({ src: 'media/demo.webm', title: 'demo' })
    expect(Object.keys(topic.video ?? {})).toEqual(['src', 'title'])
  })

  it('copies only category, title and summary for intros', () => {
    expect(intros).toEqual([{ category: 'projects', title: 'projects', summary: 'things i built' }])
  })

  it('returns copies, not shared references to parsed arrays', () => {
    const again = publishContent(FILES, INTROS, DEV).topics.find((t) => t.slug === 'full')
    const full = topics.find((t) => t.slug === 'full')
    expect(again?.tools).not.toBe(full?.tools)
    expect(again).toEqual(full)
  })

  it('returns empty lists for no files', () => {
    expect(publishContent({}, {}, PROD)).toEqual({ topics: [], intros: [] })
  })
})

describe('publishContent: drafts', () => {
  it('excludes drafts in production', () => {
    expect(publishContent(FILES, INTROS, PROD).topics.map((t) => t.slug).sort()).toEqual(['full', 'plain'])
  })

  it('keeps drafts outside production', () => {
    const topics = publishContent(FILES, INTROS, DEV).topics
    expect(topics.map((t) => t.slug).sort()).toEqual([DRAFT_CANARY, 'full', 'plain'])
    expect(topics.find((t) => t.slug === DRAFT_CANARY)?.draft).toBe(true)
  })
})

describe('publishContent: invalid content', () => {
  function errorOf(fn: () => unknown): ContentError {
    try {
      fn()
    } catch (err) {
      expect(err).toBeInstanceOf(ContentError)
      return err as ContentError
    }
    throw new Error('expected a ContentError')
  }

  it('throws with the topic file path', () => {
    const file = '/content/topics/broken.md'
    const error = errorOf(() => publishContent({ ...FILES, [file]: topicMd('url: http://example.com') }, INTROS, PROD))
    expect(error.file).toBe(file)
    expect(error.message).toMatch(new RegExp(`^${file}: "url"`))
  })

  it('still validates drafts in production', () => {
    const file = '/content/topics/wip.md'
    const error = errorOf(() => publishContent({ [file]: topicMd('draft: true\nicon: ../x.svg') }, {}, PROD))
    expect(error.file).toBe(file)
  })

  it('throws with the intro file path', () => {
    const file = '/content/intros/cloud.md'
    const error = errorOf(() => publishContent({}, { [file]: '---\ntitle: t\n---\n' }, DEV))
    expect(error.file).toBe(file)
    expect(error.message).toMatch(/"summary" is required/)
  })
})

// Build-level guard without a full vite build: the plugin's load() returns
// exactly toModuleSource(publishContent(..., { production })), so the shipped
// module text is checked here. (siteContent() is not exported from vite.config.ts.)
describe('virtual:site-content module source', () => {
  it('never contains bodies, file paths or drafts in production', () => {
    const source = toModuleSource(publishContent(FILES, INTROS, PROD))
    expect(source).not.toContain(BODY_CANARY)
    expect(source).not.toContain(INTRO_BODY_CANARY)
    expect(source).not.toContain(DRAFT_CANARY)
    expect(source).not.toContain('/content/')
    expect(source).not.toMatch(/"(body|file)"\s*:/)
    expect(source).toContain('"slug":"full"')
  })

  it('contains drafts outside production but still no bodies or paths', () => {
    const source = toModuleSource(publishContent(FILES, INTROS, DEV))
    expect(source).toContain(DRAFT_CANARY)
    expect(source).not.toContain(BODY_CANARY)
    expect(source).not.toContain(INTRO_BODY_CANARY)
    expect(source).not.toContain('/content/')
  })

  it('is two named exports of JSON data', () => {
    const content = publishContent(FILES, INTROS, PROD)
    const [topicsLine, introsLine, end] = toModuleSource(content).split('\n')
    expect(topicsLine).toBe(`export const topics = ${JSON.stringify(content.topics)}`)
    expect(introsLine).toBe(`export const intros = ${JSON.stringify(content.intros)}`)
    expect(end).toBe('')
  })
})
