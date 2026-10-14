import { safeHttpsUrl } from '../lib/safeUrl.ts'
import { type CategorySlug, isCategorySlug } from './categories.ts'
import { ContentError, splitFrontmatter } from './frontmatter.ts'

export interface Screenshot {
  src: string
  alt: string
}

export interface Video {
  src: string
  title: string
  poster?: string
}

export interface Topic {
  slug: string
  category: CategorySlug
  title: string
  summary: string
  date: string
  tools: string[]
  screenshots: Screenshot[]
  video?: Video
  related: string[]
  icon?: string
  order?: number
  url?: string
  draft: boolean
  body: string
  file: string
}

export interface Intro {
  category: CategorySlug
  title: string
  summary: string
  body: string
  file: string
}

export interface ParseOptions {
  /** When true, drafts are excluded. */
  production: boolean
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const MEDIA_PATTERN = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(png|jpg|jpeg|webp|svg|mp4|webm)$/
export const TITLE_MAX = 80
export const TOPIC_SUMMARY_MAX = 140
export const INTRO_SUMMARY_MAX = 200
export const ALT_MAX = 200
export const VIDEO_TITLE_MAX = 200
export const LIST_ENTRY_MAX = 64
/** C0 controls except tab and LF, DEL, and bidi embedding/override/isolate characters. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
export const FORBIDDEN_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F\u202A-\u202E\u2066-\u2069]/

const TOPIC_KEYS = new Set([
  'title', 'category', 'summary', 'date', 'tools', 'screenshots',
  'video', 'related', 'icon', 'order', 'url', 'draft',
])
const INTRO_KEYS = new Set(['title', 'summary'])
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

type Fields = Record<string, unknown>
type SortKeys = Pick<Topic, 'order' | 'date' | 'title'>

/**
 * Media path relative to content/. The pattern alone rules out traversal,
 * absolute paths, schemes, %-encoding, backslashes and whitespace: every
 * segment starts with [a-z0-9], then only [a-z0-9_-], joined by single "/".
 */
export function isSafeMediaPath(value: unknown): value is string {
  return typeof value === 'string' && MEDIA_PATTERN.test(value)
}

/** Rejects control and bidi characters in every frontmatter string (keys included), naming the field. */
function rejectForbiddenChars(file: string, value: unknown, where: string): void {
  if (typeof value === 'string') {
    if (FORBIDDEN_CHARS.test(value)) {
      throw new ContentError(file, `"${where}" contains a control or bidirectional-override character`)
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => rejectForbiddenChars(file, item, `${where}[${index}]`))
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      const path = where === '' ? key : `${where}.${key}`
      rejectForbiddenChars(file, key, path)
      rejectForbiddenChars(file, item, path)
    }
  }
}

function slugFromPath(file: string): string {
  const match = /([^/\\]+)\.md$/.exec(file)
  return match ? match[1] : ''
}

function asRecord(file: string, value: unknown, what: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentError(file, `${what} must be a mapping`)
  }
  return value as Fields
}

function rejectUnknownKeys(file: string, fields: Fields, allowed: ReadonlySet<string>, what: string): void {
  const unknown = Object.keys(fields).filter((key) => !allowed.has(key))
  if (unknown.length > 0) throw new ContentError(file, `unknown ${what} key(s): ${unknown.join(', ')}`)
}

function requireString(file: string, fields: Fields, key: string, max?: number): string {
  const value = fields[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ContentError(file, `"${key}" is required and must be a non-empty string`)
  }
  if (max !== undefined && value.length > max) {
    throw new ContentError(file, `"${key}" must be at most ${max} characters (got ${value.length})`)
  }
  return value.trim()
}

function requireMediaPath(file: string, value: unknown, key: string): string {
  if (!isSafeMediaPath(value)) {
    throw new ContentError(file, `"${key}" must be a lowercase relative media path inside content/`)
  }
  return value
}

function parseDate(file: string, value: unknown): string {
  const match = typeof value === 'string' ? DATE_PATTERN.exec(value) : null
  if (!match) throw new ContentError(file, '"date" must be a YYYY-MM-DD date')
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new ContentError(file, `"date" is not a real calendar date: ${String(value)}`)
  }
  return value as string
}

function parseStringList(file: string, value: unknown, key: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim() !== '')) {
    throw new ContentError(file, `"${key}" must be a list of non-empty strings`)
  }
  const tooLong = (value as string[]).find((item) => item.length > LIST_ENTRY_MAX)
  if (tooLong !== undefined) {
    throw new ContentError(file, `"${key}" entries must be at most ${LIST_ENTRY_MAX} characters (got ${tooLong.length})`)
  }
  return value.map((item: string) => item.trim())
}

function parseScreenshots(file: string, value: unknown): Screenshot[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new ContentError(file, '"screenshots" must be a list')
  return value.map((item, index) => {
    const what = `screenshots[${index}]`
    const fields = asRecord(file, item, what)
    rejectUnknownKeys(file, fields, new Set(['src', 'alt']), what)
    return {
      src: requireMediaPath(file, fields.src, `${what}.src`),
      alt: requireString(file, fields, 'alt', ALT_MAX),
    }
  })
}

function parseVideo(file: string, value: unknown): Video | undefined {
  if (value === undefined) return undefined
  const fields = asRecord(file, value, 'video')
  rejectUnknownKeys(file, fields, new Set(['src', 'title', 'poster']), 'video')
  const video: Video = {
    src: requireMediaPath(file, fields.src, 'video.src'),
    title: requireString(file, fields, 'title', VIDEO_TITLE_MAX),
  }
  if (fields.poster !== undefined) video.poster = requireMediaPath(file, fields.poster, 'video.poster')
  return video
}

function parseTopic(file: string, raw: string): Topic {
  const slug = slugFromPath(file)
  if (!SLUG_PATTERN.test(slug)) {
    throw new ContentError(file, `filename slug "${slug}" must match ${SLUG_PATTERN.source}`)
  }
  const { data, body } = splitFrontmatter(file, raw)
  const fields = asRecord(file, data, 'frontmatter')
  rejectUnknownKeys(file, fields, TOPIC_KEYS, 'frontmatter')

  if (!isCategorySlug(fields.category)) {
    throw new ContentError(file, `"category" must be one of the category slugs (got ${String(fields.category)})`)
  }
  if (fields.order !== undefined && (typeof fields.order !== 'number' || !Number.isFinite(fields.order))) {
    throw new ContentError(file, '"order" must be a number')
  }
  if (fields.draft !== undefined && typeof fields.draft !== 'boolean') {
    throw new ContentError(file, '"draft" must be true or false')
  }
  let url: string | undefined
  if (fields.url !== undefined) {
    url = safeHttpsUrl(fields.url) ?? undefined
    if (url === undefined) {
      throw new ContentError(file, '"url" must be an absolute https:// URL without credentials, to a public host')
    }
  }

  const topic: Topic = {
    slug,
    category: fields.category,
    title: requireString(file, fields, 'title', TITLE_MAX),
    summary: requireString(file, fields, 'summary', TOPIC_SUMMARY_MAX),
    date: parseDate(file, fields.date),
    tools: parseStringList(file, fields.tools, 'tools'),
    screenshots: parseScreenshots(file, fields.screenshots),
    related: parseStringList(file, fields.related, 'related'),
    draft: fields.draft === true,
    body,
    file,
  }
  const video = parseVideo(file, fields.video)
  if (video) topic.video = video
  if (fields.icon !== undefined) topic.icon = requireMediaPath(file, fields.icon, 'icon')
  if (fields.order !== undefined) topic.order = fields.order as number
  if (url !== undefined) topic.url = url
  rejectForbiddenChars(file, fields, '')
  return topic
}

/** Sort: explicit order first (ascending), then newest date, then title. */
export function compareTopics(a: SortKeys, b: SortKeys): number {
  const orderA = a.order ?? Number.POSITIVE_INFINITY
  const orderB = b.order ?? Number.POSITIVE_INFINITY
  if (orderA !== orderB) return orderA < orderB ? -1 : 1
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return a.title.localeCompare(b.title)
}

/**
 * Pure: parses raw topic files keyed by path. Throws ContentError (with the
 * file path) for any invalid file, duplicate slug or dangling `related`.
 */
export function parseTopics(files: Record<string, string>, options: ParseOptions): Topic[] {
  const seen = new Map<string, string>()
  const all = Object.entries(files).map(([file, raw]) => {
    const topic = parseTopic(file, raw)
    const previous = seen.get(topic.slug)
    if (previous !== undefined) throw new ContentError(file, `duplicate slug "${topic.slug}" (also in ${previous})`)
    seen.set(topic.slug, file)
    return topic
  })
  const published = options.production ? all.filter((topic) => !topic.draft) : all
  const keys = new Set(published.map((topic) => `${topic.category}/${topic.slug}`))
  for (const topic of published) {
    const missing = topic.related.find((ref) => !keys.has(ref))
    if (missing !== undefined) {
      throw new ContentError(topic.file, `"related" entry "${missing}" does not match an existing <category>/<slug>`)
    }
  }
  return published.sort(compareTopics)
}

/** Pure: parses raw category intro files keyed by path (filename = category slug). */
export function parseIntros(files: Record<string, string>): Intro[] {
  return Object.entries(files).map(([file, raw]) => {
    const category = slugFromPath(file)
    if (!isCategorySlug(category)) {
      throw new ContentError(file, `intro filename must be a category slug (got "${category}")`)
    }
    const { data, body } = splitFrontmatter(file, raw)
    const fields = asRecord(file, data, 'frontmatter')
    rejectUnknownKeys(file, fields, INTRO_KEYS, 'frontmatter')
    const intro: Intro = {
      category,
      title: requireString(file, fields, 'title', TITLE_MAX),
      summary: requireString(file, fields, 'summary', INTRO_SUMMARY_MAX),
      body,
      file,
    }
    rejectForbiddenChars(file, fields, '')
    return intro
  })
}
