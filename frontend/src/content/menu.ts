import { CATEGORIES, type CategorySlug } from './categories.ts'
import type { PublishedIntro, PublishedTopic } from './publish.ts'

export interface MenuSection {
  slug: CategorySlug
  label: string
  /** Intro summary from content/intros/<slug>.md, if present. */
  intro?: string
  topics: PublishedTopic[]
  /** The About column links to /about (phase 2) instead of listing topics. */
  kind: 'topics' | 'about'
}

/** Pure: groups parsed topics and intros into nav sections in category order. */
export function buildMenu(topics: readonly PublishedTopic[], intros: readonly PublishedIntro[]): MenuSection[] {
  const introBySlug = new Map(intros.map((intro) => [intro.category, intro.summary]))
  return CATEGORIES.map(({ slug, label }) => {
    const section: MenuSection = {
      slug,
      label,
      topics: topics.filter((topic) => topic.category === slug),
      kind: slug === 'about' ? 'about' : 'topics',
    }
    const intro = introBySlug.get(slug)
    if (intro !== undefined) section.intro = intro
    return section
  })
}
