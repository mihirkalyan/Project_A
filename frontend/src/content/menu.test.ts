import { describe, expect, it } from 'vitest'
import { CATEGORIES, isCategorySlug } from './categories.ts'
import { buildMenu } from './menu.ts'
import type { Intro, Topic } from './parse.ts'

function topic(slug: string, category: Topic['category']): Topic {
  return {
    slug,
    category,
    title: slug,
    summary: `${slug} summary`,
    date: '2026-01-01',
    tools: [],
    screenshots: [],
    related: [],
    draft: false,
    body: '',
    file: `/t/${slug}.md`,
  }
}

const intro = (category: Intro['category'], summary: string): Intro => ({
  category,
  title: category,
  summary,
  body: '',
  file: `/i/${category}.md`,
})

describe('categories', () => {
  it('lists the nine nav categories in order', () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual([
      'cloud',
      'app-sec',
      'network-sec',
      'iam',
      'secops',
      'ai-automation',
      'documentation',
      'projects',
      'about',
    ])
    expect(CATEGORIES.find((c) => c.slug === 'ai-automation')?.label).toBe('AI & Automation')
  })

  it('recognises only category slugs', () => {
    expect(isCategorySlug('cloud')).toBe(true)
    expect(isCategorySlug('Cloud')).toBe(false)
    expect(isCategorySlug('App Sec')).toBe(false)
    expect(isCategorySlug('')).toBe(false)
    expect(isCategorySlug(undefined)).toBe(false)
    expect(isCategorySlug(1)).toBe(false)
  })
})

describe('buildMenu', () => {
  it('returns every category, in nav order, even with no content', () => {
    const sections = buildMenu([], [])
    expect(sections.map((s) => s.slug)).toEqual(CATEGORIES.map((c) => c.slug))
    expect(sections.map((s) => s.label)).toEqual(CATEGORIES.map((c) => c.label))
    for (const section of sections) {
      expect(section.topics).toEqual([])
      expect(section).not.toHaveProperty('intro')
    }
  })

  it('marks About as the about kind and the rest as topics', () => {
    const sections = buildMenu([], [])
    expect(sections.filter((s) => s.kind === 'about').map((s) => s.slug)).toEqual(['about'])
    expect(sections.filter((s) => s.kind === 'topics')).toHaveLength(CATEGORIES.length - 1)
  })

  it('groups topics by category and keeps their given order', () => {
    const topics = [topic('b', 'app-sec'), topic('x', 'cloud'), topic('a', 'app-sec')]
    const sections = buildMenu(topics, [])
    expect(sections.find((s) => s.slug === 'app-sec')?.topics.map((t) => t.slug)).toEqual(['b', 'a'])
    expect(sections.find((s) => s.slug === 'cloud')?.topics.map((t) => t.slug)).toEqual(['x'])
    expect(sections.find((s) => s.slug === 'iam')?.topics).toEqual([])
  })

  it('attaches intro summaries to their section only', () => {
    const sections = buildMenu([], [intro('projects', 'things i built')])
    expect(sections.find((s) => s.slug === 'projects')?.intro).toBe('things i built')
    expect(sections.filter((s) => s.intro !== undefined)).toHaveLength(1)
  })
})
