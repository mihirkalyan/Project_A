import { describe, expect, it } from 'vitest'
import { ContentError } from './frontmatter.ts'
import {
  ALT_MAX,
  compareTopics,
  INTRO_SUMMARY_MAX,
  isSafeMediaPath,
  LIST_ENTRY_MAX,
  parseIntros,
  parseTopics,
  TITLE_MAX,
  TOPIC_SUMMARY_MAX,
  type Topic,
  VIDEO_TITLE_MAX,
} from './parse.ts'

const DEV = { production: false }
const PROD = { production: true }

const BASE: Record<string, string> = {
  title: 'burp suite',
  category: 'app-sec',
  summary: 'intercepting requests.',
  date: '"2026-10-13"',
}

/** Builds a raw topic file. `extra` lines are raw YAML; a key set to null is dropped. */
function topicMd(overrides: Record<string, string | null> = {}, body = 'body text\n'): string {
  const fields = { ...BASE, ...overrides }
  const yaml = Object.entries(fields)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  return `---\n${yaml}\n---\n${body}`
}

function path(slug: string): string {
  return `/content/topics/${slug}.md`
}

function one(overrides: Record<string, string | null> = {}, slug = 'burp-suite', options = DEV): Topic {
  const [topic] = parseTopics({ [path(slug)]: topicMd(overrides) }, options)
  return topic
}

function expectInvalid(overrides: Record<string, string | null>, message: RegExp, slug = 'burp-suite'): void {
  const file = path(slug)
  let error: unknown
  try {
    parseTopics({ [file]: topicMd(overrides) }, DEV)
  } catch (err) {
    error = err
  }
  expect(error).toBeInstanceOf(ContentError)
  expect((error as ContentError).file).toBe(file)
  expect((error as Error).message).toMatch(message)
}

describe('parseTopics: valid input', () => {
  it('returns [] for no files', () => {
    expect(parseTopics({}, DEV)).toEqual([])
    expect(parseTopics({}, PROD)).toEqual([])
  })

  it('parses a minimal topic with defaults', () => {
    const file = path('burp-suite')
    const [topic] = parseTopics({ [file]: topicMd() }, DEV)
    expect(topic).toEqual({
      slug: 'burp-suite',
      category: 'app-sec',
      title: 'burp suite',
      summary: 'intercepting requests.',
      date: '2026-10-13',
      tools: [],
      screenshots: [],
      related: [],
      draft: false,
      body: 'body text\n',
      file,
    })
    expect(topic).not.toHaveProperty('video')
    expect(topic).not.toHaveProperty('icon')
    expect(topic).not.toHaveProperty('order')
    expect(topic).not.toHaveProperty('url')
  })

  it('parses every optional field', () => {
    const topic = one({
      tools: '[burp, " zap "]',
      screenshots: '[{ src: media/burp-scan.png, alt: "scan results" }]',
      video: '{ src: media/demo.mp4, title: demo, poster: media/demo-poster.webp }',
      icon: 'icons/burp.svg',
      order: '2',
      url: 'https://github.com/someone/repo',
      draft: 'false',
    })
    expect(topic.tools).toEqual(['burp', 'zap'])
    expect(topic.screenshots).toEqual([{ src: 'media/burp-scan.png', alt: 'scan results' }])
    expect(topic.video).toEqual({ src: 'media/demo.mp4', title: 'demo', poster: 'media/demo-poster.webp' })
    expect(topic.icon).toBe('icons/burp.svg')
    expect(topic.order).toBe(2)
    expect(topic.url).toBe('https://github.com/someone/repo')
  })

  it('accepts a video without a poster', () => {
    expect(one({ video: '{ src: media/demo.webm, title: demo }' }).video).toEqual({
      src: 'media/demo.webm',
      title: 'demo',
    })
  })

  it('accepts order 0 and negative orders', () => {
    expect(one({ order: '0' }).order).toBe(0)
    expect(one({ order: '-1.5' }).order).toBe(-1.5)
  })

  it('trims title and summary', () => {
    const topic = one({ title: '"  spaced  "', summary: '"  short  "' })
    expect(topic.title).toBe('spaced')
    expect(topic.summary).toBe('short')
  })

  it('accepts a summary of exactly the max length', () => {
    expect(one({ summary: 'a'.repeat(TOPIC_SUMMARY_MAX) }).summary).toHaveLength(TOPIC_SUMMARY_MAX)
  })

  it('accepts an unquoted date (the core schema keeps it a string)', () => {
    expect(one({ date: '2026-10-13' }).date).toBe('2026-10-13')
  })

  it('accepts a leap day', () => {
    expect(one({ date: '"2024-02-29"' }).date).toBe('2024-02-29')
  })

  it('normalises the url', () => {
    expect(one({ url: 'https://Example.COM' }).url).toBe('https://example.com/')
  })

  it('reads the slug from a Windows-style path', () => {
    const [topic] = parseTopics({ 'C:\\content\\topics\\zero-trust.md': topicMd() }, DEV)
    expect(topic.slug).toBe('zero-trust')
  })

  it('is CRLF and BOM safe end to end', () => {
    const raw = `\uFEFF${topicMd()}`.replace(/\n/g, '\r\n')
    expect(parseTopics({ [path('crlf')]: raw }, DEV)[0].title).toBe('burp suite')
  })

  it('accepts every category slug', () => {
    for (const category of ['cloud', 'app-sec', 'network-sec', 'iam', 'secops', 'ai-automation', 'documentation', 'projects', 'about']) {
      expect(one({ category }).category).toBe(category)
    }
  })
})

describe('parseTopics: drafts', () => {
  const files = {
    [path('live')]: topicMd({ title: 'live' }),
    [path('wip')]: topicMd({ title: 'wip', draft: 'true' }),
  }

  it('keeps drafts outside production', () => {
    const topics = parseTopics(files, DEV)
    expect(topics.map((t) => t.slug).sort()).toEqual(['live', 'wip'])
    expect(topics.find((t) => t.slug === 'wip')?.draft).toBe(true)
  })

  it('excludes drafts in production', () => {
    expect(parseTopics(files, PROD).map((t) => t.slug)).toEqual(['live'])
  })

  it('still validates drafts in production', () => {
    const bad = { ...files, [path('broken')]: topicMd({ draft: 'true', title: null }) }
    expect(() => parseTopics(bad, PROD)).toThrow(ContentError)
  })
})

describe('parseTopics: related', () => {
  it('accepts related entries that exist', () => {
    const topics = parseTopics(
      {
        [path('a')]: topicMd({ related: '[app-sec/b]' }),
        [path('b')]: topicMd(),
      },
      DEV,
    )
    expect(topics.find((t) => t.slug === 'a')?.related).toEqual(['app-sec/b'])
  })

  it('rejects a dangling related entry, naming the referring file', () => {
    expect(() => parseTopics({ [path('a')]: topicMd({ related: '[app-sec/missing]' }) }, DEV)).toThrow(
      new RegExp(`^${path('a')}: "related" entry "app-sec/missing"`),
    )
  })

  it('rejects a related entry with the right slug but the wrong category', () => {
    expect(() =>
      parseTopics({ [path('a')]: topicMd({ related: '[cloud/b]' }), [path('b')]: topicMd() }, DEV),
    ).toThrow(/"related" entry "cloud\/b"/)
  })

  it('rejects a related entry pointing at a draft in production', () => {
    const files = {
      [path('a')]: topicMd({ related: '[app-sec/b]' }),
      [path('b')]: topicMd({ draft: 'true' }),
    }
    expect(parseTopics(files, DEV)).toHaveLength(2)
    expect(() => parseTopics(files, PROD)).toThrow(/"related" entry "app-sec\/b"/)
  })
})

describe('parseTopics: invalid input', () => {
  it.each([
    ['uppercase', 'Burp'],
    ['underscore', 'burp_suite'],
    ['leading dash', '-burp'],
    ['double dash', 'burp--suite'],
    ['trailing dash', 'burp-'],
    ['dot', 'burp.suite'],
  ])('rejects a filename slug with %s', (_label, slug) => {
    expectInvalid({}, /filename slug/, slug)
  })

  it('rejects a non-.md path', () => {
    expect(() => parseTopics({ '/content/topics/x.txt': topicMd() }, DEV)).toThrow(/filename slug ""/)
  })

  it('rejects a file without frontmatter', () => {
    expect(() => parseTopics({ [path('a')]: 'just text' }, DEV)).toThrow(/missing opening ---/)
  })

  it.each([
    ['a list', '---\n- a\n- b\n---\n'],
    ['a scalar', '---\nhello\n---\n'],
    ['empty', '---\n---\n'],
  ])('rejects frontmatter that is %s', (_label, raw) => {
    expect(() => parseTopics({ [path('a')]: raw }, DEV)).toThrow(/frontmatter must be a mapping/)
  })

  it('rejects unknown keys and lists them', () => {
    expectInvalid({ author: 'me', layout: 'x' }, /unknown frontmatter key\(s\): author, layout/)
  })

  it.each([
    ['missing', null],
    ['unknown', 'web'],
    ['a label instead of a slug', '"App Sec"'],
    ['a number', '3'],
  ])('rejects a category that is %s', (_label, value) => {
    expectInvalid({ category: value }, /"category" must be one of the category slugs/)
  })

  it.each([
    ['missing', null],
    ['empty', '""'],
    ['whitespace', '"   "'],
    ['a number', '42'],
    ['a list', '[a]'],
  ])('rejects a title that is %s', (_label, value) => {
    expectInvalid({ title: value }, /"title" is required/)
  })

  it('rejects a missing summary', () => {
    expectInvalid({ summary: null }, /"summary" is required/)
  })

  it('rejects a summary over the max length', () => {
    expectInvalid({ summary: 'a'.repeat(TOPIC_SUMMARY_MAX + 1) }, /"summary" must be at most 140 characters \(got 141\)/)
  })

  it.each([
    ['missing', null],
    ['wrong format', '"13-10-2026"'],
    ['no padding', '"2026-1-3"'],
    ['with time', '"2026-10-13T00:00:00Z"'],
    ['a number', '20261013'],
  ])('rejects a date that is %s', (_label, value) => {
    expectInvalid({ date: value }, /"date" must be a YYYY-MM-DD date/)
  })

  it.each([
    ['month 13', '"2026-13-01"'],
    ['Feb 30', '"2026-02-30"'],
    ['Feb 29 in a non-leap year', '"2025-02-29"'],
    ['day 00', '"2026-10-00"'],
  ])('rejects an impossible date: %s', (_label, value) => {
    expectInvalid({ date: value }, /"date" is not a real calendar date/)
  })

  it.each([
    ['a string', 'burp'],
    ['a list with a number', '[burp, 3]'],
    ['a list with an empty string', '[burp, ""]'],
  ])('rejects tools that is %s', (_label, value) => {
    expectInvalid({ tools: value }, /"tools" must be a list of non-empty strings/)
  })

  it('rejects related that is not a list', () => {
    expectInvalid({ related: 'app-sec/b' }, /"related" must be a list of non-empty strings/)
  })

  it.each([
    ['a string', '"1"'],
    ['infinite', '.inf'],
    ['NaN', '.nan'],
  ])('rejects an order that is %s', (_label, value) => {
    expectInvalid({ order: value }, /"order" must be a number/)
  })

  it.each([
    ['a string', '"true"'],
    ['yes (YAML 1.1 boolean)', 'yes'],
    ['a number', '1'],
  ])('rejects a draft that is %s', (_label, value) => {
    expectInvalid({ draft: value }, /"draft" must be true or false/)
  })

  it.each([
    ['http', 'http://example.com'],
    ['javascript', '"javascript:alert(1)"'],
    ['data', '"data:text/html,hi"'],
    ['relative', '/projects/x'],
    ['credentials', 'https://user:pass@example.com'],
    ['a username only', 'https://user@example.com'],
    ['not a URL', 'nope'],
    ['a number', '5'],
    ['empty', '""'],
    ['leading space', '" https://example.com"'],
  ])('rejects a url that is %s', (_label, value) => {
    expectInvalid({ url: value }, /"url" must be an absolute https:\/\/ URL without credentials/)
  })

  it('rejects screenshots that is not a list', () => {
    expectInvalid({ screenshots: '{ src: a.png, alt: x }' }, /"screenshots" must be a list/)
  })

  it('rejects a screenshot that is not a mapping', () => {
    expectInvalid({ screenshots: '[a.png]' }, /screenshots\[0\] must be a mapping/)
  })

  it('rejects a screenshot without alt text', () => {
    expectInvalid({ screenshots: '[{ src: media/a.png }]' }, /"alt" is required/)
  })

  it('rejects a screenshot with empty alt text', () => {
    expectInvalid({ screenshots: '[{ src: media/a.png, alt: "" }]' }, /"alt" is required/)
  })

  it('rejects unknown screenshot keys', () => {
    expectInvalid(
      { screenshots: '[{ src: media/a.png, alt: x, href: y }]' },
      /unknown screenshots\[0\] key\(s\): href/,
    )
  })

  it('rejects an unsafe screenshot src, naming the index', () => {
    expectInvalid(
      { screenshots: '[{ src: media/a.png, alt: ok }, { src: "../secret.png", alt: x }]' },
      /"screenshots\[1\]\.src" must be a lowercase relative media path/,
    )
  })

  it('rejects a video that is not a mapping', () => {
    expectInvalid({ video: 'media/demo.mp4' }, /video must be a mapping/)
  })

  it('rejects unknown video keys', () => {
    expectInvalid({ video: '{ src: media/demo.mp4, title: demo, autoplay: true }' }, /unknown video key\(s\): autoplay/)
  })

  it('rejects a video without a title', () => {
    expectInvalid({ video: '{ src: media/demo.mp4 }' }, /"title" is required/)
  })

  it('rejects an unsafe video src and poster', () => {
    expectInvalid({ video: '{ src: "https://evil.example/x.mp4", title: d }' }, /"video\.src" must be/)
    expectInvalid({ video: '{ src: media/d.mp4, title: d, poster: /etc/p.png }' }, /"video\.poster" must be/)
  })

  it('rejects an unsafe icon', () => {
    expectInvalid({ icon: 'Icons/Burp.svg' }, /"icon" must be a lowercase relative media path/)
  })

  it('rejects duplicate slugs across directories', () => {
    const files = { '/a/topics/same.md': topicMd(), '/b/topics/same.md': topicMd() }
    expect(() => parseTopics(files, DEV)).toThrow(/^\/b\/topics\/same\.md: duplicate slug "same" \(also in \/a\/topics\/same\.md\)/)
  })

  it('reports the first invalid file even when others are valid', () => {
    const files = { [path('good')]: topicMd(), [path('bad')]: topicMd({ title: null }) }
    expect(() => parseTopics(files, DEV)).toThrow(new RegExp(`^${path('bad')}:`))
  })
})

describe('isSafeMediaPath', () => {
  it.each([
    'a.png',
    'media/burp-scan.png',
    'media/sub_dir/x-1.jpeg',
    'a/b/c.webp',
    'logo.svg',
    'clip.mp4',
    'clip.webm',
    'shot.jpg',
  ])('accepts %s', (value) => {
    expect(isSafeMediaPath(value)).toBe(true)
  })

  it.each([
    ['traversal', '../a.png'],
    ['inner traversal', 'media/../a.png'],
    ['leading slash', '/media/a.png'],
    ['leading backslash', '\\media\\a.png'],
    ['inner backslash', 'media\\a.png'],
    ['double slash', 'media//a.png'],
    ['trailing slash segment', 'media/'],
    ['percent encoding', 'media/%2e%2e/a.png'],
    ['scheme', 'https://x.com/a.png'],
    ['colon', 'c:a.png'],
    ['whitespace', 'media/a b.png'],
    ['newline', 'media/a.png\n'],
    ['NUL', 'media/a\0.png'],
    ['uppercase', 'Media/a.png'],
    ['bad extension', 'media/a.gif'],
    ['html', 'media/a.html'],
    ['no extension', 'media/a'],
    ['double extension', 'a.png.exe'],
    ['empty', ''],
    ['leading dot', '.hidden.png'],
  ])('rejects %s', (_label, value) => {
    expect(isSafeMediaPath(value)).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isSafeMediaPath(undefined)).toBe(false)
    expect(isSafeMediaPath(null)).toBe(false)
    expect(isSafeMediaPath(1)).toBe(false)
    expect(isSafeMediaPath(['a.png'])).toBe(false)
  })
})

describe('compareTopics / sort order', () => {
  it('sorts explicit order ascending, then unordered by newest date, then title', () => {
    const files = {
      [path('old')]: topicMd({ title: 'old', date: '"2024-01-01"' }),
      [path('new-b')]: topicMd({ title: 'b new', date: '"2026-01-01"' }),
      [path('new-a')]: topicMd({ title: 'a new', date: '"2026-01-01"' }),
      [path('second')]: topicMd({ title: 'second', order: '2', date: '"2020-01-01"' }),
      [path('first')]: topicMd({ title: 'first', order: '1', date: '"2019-01-01"' }),
    }
    expect(parseTopics(files, DEV).map((t) => t.slug)).toEqual(['first', 'second', 'new-a', 'new-b', 'old'])
  })

  it('breaks an order tie by date then title', () => {
    const a = one({ title: 'a', order: '1', date: '"2025-01-01"' }, 'a')
    const b = one({ title: 'b', order: '1', date: '"2026-01-01"' }, 'b')
    const c = one({ title: 'c', order: '1', date: '"2026-01-01"' }, 'c')
    expect([a, c, b].sort(compareTopics).map((t) => t.slug)).toEqual(['b', 'c', 'a'])
  })

  it('returns 0 for equal topics', () => {
    const a = one()
    expect(compareTopics(a, { ...a })).toBe(0)
  })
})

describe('parseIntros', () => {
  const intro = (fields: string, body = 'intro body') => `---\n${fields}\n---\n${body}`

  it('returns [] for no files', () => {
    expect(parseIntros({})).toEqual([])
  })

  it('parses a valid intro keyed by category filename', () => {
    const file = '/content/intros/projects.md'
    expect(parseIntros({ [file]: intro('title: projects\nsummary: " things i built "') })).toEqual([
      { category: 'projects', title: 'projects', summary: 'things i built', body: 'intro body', file },
    ])
  })

  it('accepts a summary of exactly the max length', () => {
    const [parsed] = parseIntros({ '/i/cloud.md': intro(`title: t\nsummary: ${'a'.repeat(INTRO_SUMMARY_MAX)}`) })
    expect(parsed.summary).toHaveLength(INTRO_SUMMARY_MAX)
  })

  it('rejects a filename that is not a category slug', () => {
    expect(() => parseIntros({ '/i/web.md': intro('title: t\nsummary: s') })).toThrow(
      /^\/i\/web\.md: intro filename must be a category slug \(got "web"\)/,
    )
  })

  it('rejects a summary over the max length', () => {
    expect(() => parseIntros({ '/i/cloud.md': intro(`title: t\nsummary: ${'a'.repeat(INTRO_SUMMARY_MAX + 1)}`) })).toThrow(
      /"summary" must be at most 200 characters/,
    )
  })

  it('rejects missing title or summary', () => {
    expect(() => parseIntros({ '/i/cloud.md': intro('summary: s') })).toThrow(/"title" is required/)
    expect(() => parseIntros({ '/i/cloud.md': intro('title: t') })).toThrow(/"summary" is required/)
  })

  it('rejects unknown keys (topic-only keys included)', () => {
    expect(() => parseIntros({ '/i/cloud.md': intro('title: t\nsummary: s\ndate: "2026-01-01"') })).toThrow(
      /unknown frontmatter key\(s\): date/,
    )
  })

  it('rejects missing or non-mapping frontmatter', () => {
    expect(() => parseIntros({ '/i/cloud.md': 'no frontmatter' })).toThrow(/missing opening ---/)
    expect(() => parseIntros({ '/i/cloud.md': '---\n- a\n---\n' })).toThrow(/frontmatter must be a mapping/)
  })
})

describe('parseTopics: length caps at the boundary', () => {
  it('accepts a title of exactly TITLE_MAX and rejects one more', () => {
    expect(one({ title: 'a'.repeat(TITLE_MAX) }).title).toHaveLength(TITLE_MAX)
    expectInvalid({ title: 'a'.repeat(TITLE_MAX + 1) }, /"title" must be at most 80 characters \(got 81\)/)
  })

  it('accepts screenshot alt of exactly ALT_MAX and rejects one more', () => {
    const shot = (alt: string) => `[{ src: media/a.png, alt: ${alt} }]`
    expect(one({ screenshots: shot('a'.repeat(ALT_MAX)) }).screenshots[0].alt).toHaveLength(ALT_MAX)
    expectInvalid({ screenshots: shot('a'.repeat(ALT_MAX + 1)) }, /"alt" must be at most 200 characters \(got 201\)/)
  })

  it('accepts video.title of exactly VIDEO_TITLE_MAX and rejects one more', () => {
    const video = (title: string) => `{ src: media/d.mp4, title: ${title} }`
    expect(one({ video: video('a'.repeat(VIDEO_TITLE_MAX)) }).video?.title).toHaveLength(VIDEO_TITLE_MAX)
    expectInvalid({ video: video('a'.repeat(VIDEO_TITLE_MAX + 1)) }, /"title" must be at most 200 characters \(got 201\)/)
  })

  it('accepts a tools entry of exactly LIST_ENTRY_MAX and rejects one more', () => {
    expect(one({ tools: `[${'a'.repeat(LIST_ENTRY_MAX)}]` }).tools[0]).toHaveLength(LIST_ENTRY_MAX)
    expectInvalid({ tools: `[ok, ${'a'.repeat(LIST_ENTRY_MAX + 1)}]` }, /"tools" entries must be at most 64 characters \(got 65\)/)
  })

  it('accepts a related entry of exactly LIST_ENTRY_MAX and rejects one more', () => {
    const slug = 'a'.repeat(LIST_ENTRY_MAX - 'app-sec/'.length)
    const topics = parseTopics({ [path('x')]: topicMd({ related: `[app-sec/${slug}]` }), [path(slug)]: topicMd() }, DEV)
    expect(topics.find((t) => t.slug === 'x')?.related[0]).toHaveLength(LIST_ENTRY_MAX)
    expectInvalid({ related: `[app-sec/${slug}a]` }, /"related" entries must be at most 64 characters \(got 65\)/)
  })
})

describe('parseTopics: control and bidi characters', () => {
  const CONTROL = /contains a control or bidirectional-override character/

  const escapeRegExp = (value: string) => value.replace(/[.[\]]/g, '\\$&')

  // Values are YAML double-quoted escapes (e.g. "\u202E"), so the parsed string holds the real character.
  it.each([
    ['U+202E in title', { title: '"a\\u202Eb"' }, 'title'],
    ['U+2066 in summary', { summary: '"a\\u2066b"' }, 'summary'],
    ['U+202E in a tools entry', { tools: '[ok, "a\\u202Eb"]' }, 'tools[1]'],
    ['U+2066 in a tools entry', { tools: '["a\\u2066b"]' }, 'tools[0]'],
    ['U+202E in a related entry', { related: '["app-sec/a\\u202Eb"]' }, 'related[0]'],
    ['U+202E in screenshot alt', { screenshots: '[{ src: media/a.png, alt: "a\\u202Eb" }]' }, 'screenshots[0].alt'],
    ['U+2066 in screenshot alt', { screenshots: '[{ src: media/a.png, alt: "a\\u2066b" }]' }, 'screenshots[0].alt'],
    ['U+202E in video.title', { video: '{ src: media/d.mp4, title: "a\\u202Eb" }' }, 'video.title'],
    ['U+2066 in video.title', { video: '{ src: media/d.mp4, title: "a\\u2066b" }' }, 'video.title'],
    ['U+2069 in title', { title: '"a\\u2069b"' }, 'title'],
    ['NUL in title', { title: '"a\\0b"' }, 'title'],
    ['ESC in summary', { summary: '"a\\eb"' }, 'summary'],
    ['CR in title', { title: '"a\\rb"' }, 'title'],
    ['vertical tab in title', { title: '"a\\vb"' }, 'title'],
    ['DEL in title', { title: '"a\\x7Fb"' }, 'title'],
  ])('rejects %s, naming the field', (_label, overrides, where) => {
    expectInvalid(overrides, new RegExp(`"${escapeRegExp(where)}" ${CONTROL.source}`))
  })

  it('rejects a raw (unescaped) bidi character too', () => {
    expectInvalid({ title: 'a\u202Eb' }, new RegExp(`"title" ${CONTROL.source}`))
  })

  it.each([
    ['top level', { '"ti\\u202Etle"': 'x' }],
    ['top level, C0 control', { '"ti\\x01tle"': 'x' }],
    ['inside screenshots', { screenshots: '[{ src: media/a.png, alt: x, "a\\u2066lt": y }]' }],
    ['inside video', { video: '{ src: media/d.mp4, title: d, "po\\x01ster": z }' }],
  ])('rejects a forbidden character inside a key (%s)', (_label, overrides) => {
    // Every mapping is checked against a key allowlist before the character
    // scan, so such keys fail as unknown keys; either way the file is rejected.
    expectInvalid(overrides, /unknown .*key\(s\)|control or bidirectional-override/)
  })

  it('allows tab and LF in strings', () => {
    const topic = one({ title: '"a\\tb"', summary: '"line one\\nline two"', tools: '["x\\ty"]' })
    expect(topic.title).toBe('a\tb')
    expect(topic.summary).toBe('line one\nline two')
    expect(topic.tools).toEqual(['x\ty'])
  })

  it('rejects bidi characters in intros', () => {
    expect(() => parseIntros({ '/i/cloud.md': '---\ntitle: "a\\u202Eb"\nsummary: s\n---\n' })).toThrow(
      /^\/i\/cloud\.md: "title" contains a control or bidirectional-override character/,
    )
  })
})

describe('isSafeMediaPath: segment starts', () => {
  it.each([
    ['dot-start segment', 'a/.png'],
    ['dash-start segment', 'a/-b.png'],
    ['underscore-start segment', 'a/_.png'],
    ['dash-start first segment', '-a.png'],
    ['underscore-start first segment', '_a/b.png'],
    ['dot segment', 'a/./b.png'],
  ])('rejects a %s', (_label, value) => {
    expect(isSafeMediaPath(value)).toBe(false)
  })

  it('accepts dashes and underscores after the first character of each segment', () => {
    expect(isSafeMediaPath('a/b-c/d_e.png')).toBe(true)
  })
})
