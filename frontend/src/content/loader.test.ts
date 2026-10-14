// Integration test over the real files in content/ (virtual:site-content is not mocked).
import { describe, expect, it } from 'vitest'
import { isCategorySlug } from './categories.ts'
import { intros, topics } from './loader.ts'
import { buildMenu } from './menu.ts'
import { compareTopics, isSafeMediaPath, SLUG_PATTERN, TOPIC_SUMMARY_MAX } from './parse.ts'

describe('loader (real content/)', () => {
  it('loads and validates the topic files', () => {
    expect(topics.length).toBeGreaterThan(0)
    for (const topic of topics) {
      expect(topic.slug).toMatch(SLUG_PATTERN)
      expect(isCategorySlug(topic.category)).toBe(true)
      expect(topic.title.length).toBeGreaterThan(0)
      expect(topic.summary.length).toBeLessThanOrEqual(TOPIC_SUMMARY_MAX)
      // body and source path are stripped in Node and never shipped
      expect(topic).not.toHaveProperty('file')
      expect(topic).not.toHaveProperty('body')
      for (const shot of topic.screenshots) {
        expect(isSafeMediaPath(shot.src)).toBe(true)
        expect(shot.alt.length).toBeGreaterThan(0)
      }
      if (topic.url !== undefined) expect(topic.url.startsWith('https://')).toBe(true)
    }
  })

  it('has unique slugs and returns topics sorted', () => {
    expect(new Set(topics.map((t) => t.slug)).size).toBe(topics.length)
    expect([...topics].sort(compareTopics)).toEqual(topics)
  })

  it('resolves every related entry', () => {
    const keys = new Set(topics.map((t) => `${t.category}/${t.slug}`))
    for (const ref of topics.flatMap((t) => t.related)) expect(keys.has(ref)).toBe(true)
  })

  it('loads the intro files, keyed by category', () => {
    for (const intro of intros) expect(isCategorySlug(intro.category)).toBe(true)
    expect(intros.map((i) => i.category)).toContain('projects')
  })

  it('places every topic in a menu section', () => {
    const sections = buildMenu(topics, intros)
    expect(sections.reduce((n, s) => n + s.topics.length, 0)).toBe(topics.length)
    expect(sections.find((s) => s.slug === 'projects')?.intro).toBeTruthy()
  })
})
