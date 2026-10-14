// Shared nav fixtures for tests.
import { buildMenu, type MenuSection } from '../content/menu.ts'
import type { Intro, Topic } from '../content/parse.ts'

export function makeTopic(slug: string, category: Topic['category'], extra: Partial<Topic> = {}): Topic {
  return {
    slug,
    category,
    title: slug.replace(/-/g, ' '),
    summary: `${slug} summary`,
    date: '2026-01-01',
    tools: [],
    screenshots: [],
    related: [],
    draft: false,
    body: '',
    file: `/content/topics/${slug}.md`,
    ...extra,
  }
}

const intros: Intro[] = [
  { category: 'cloud', title: 'cloud', summary: 'cloud intro text', body: '', file: '/content/intros/cloud.md' },
]

/** cloud: a live link + a soon item + intro; app-sec: one soon item; everything else empty; about. */
export function testSections(): MenuSection[] {
  return buildMenu(
    [
      makeTopic('live-repo', 'cloud', { url: 'https://github.com/someone/repo' }),
      makeTopic('aws-notes', 'cloud'),
      makeTopic('burp-suite', 'app-sec'),
    ],
    intros,
  )
}
