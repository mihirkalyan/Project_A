import { type Intro, type ParseOptions, parseIntros, parseTopics, type Topic } from './parse.ts'

/** A topic as shipped to the browser: no body, no source file path. */
export type PublishedTopic = Omit<Topic, 'body' | 'file'>

/** An intro as shipped to the browser: no body, no source file path. */
export type PublishedIntro = Omit<Intro, 'body' | 'file'>

export interface SiteContent {
  topics: PublishedTopic[]
  intros: PublishedIntro[]
}

/** Allowlist copy: only fields phase 1 renders, so nothing else can leak into the bundle. */
function publishTopic(topic: Topic): PublishedTopic {
  const out: PublishedTopic = {
    slug: topic.slug,
    category: topic.category,
    title: topic.title,
    summary: topic.summary,
    date: topic.date,
    tools: [...topic.tools],
    screenshots: topic.screenshots.map(({ src, alt }) => ({ src, alt })),
    related: [...topic.related],
    draft: topic.draft,
  }
  if (topic.video) {
    const { src, title, poster } = topic.video
    out.video = poster === undefined ? { src, title } : { src, title, poster }
  }
  if (topic.icon !== undefined) out.icon = topic.icon
  if (topic.order !== undefined) out.order = topic.order
  if (topic.url !== undefined) out.url = topic.url
  return out
}

function publishIntro(intro: Intro): PublishedIntro {
  return { category: intro.category, title: intro.title, summary: intro.summary }
}

/**
 * Pure, runs in Node at build/dev time (vite.config.ts). Validates every file
 * (throws ContentError with the path) and returns only published, render-ready
 * data. With `production`, drafts are excluded before anything is returned.
 */
export function publishContent(
  topicFiles: Record<string, string>,
  introFiles: Record<string, string>,
  options: ParseOptions,
): SiteContent {
  return {
    topics: parseTopics(topicFiles, options).map(publishTopic),
    intros: parseIntros(introFiles).map(publishIntro),
  }
}

/** Serialises site content as an ES module for the virtual:site-content id. */
export function toModuleSource(content: SiteContent): string {
  return [
    `export const topics = ${JSON.stringify(content.topics)}`,
    `export const intros = ${JSON.stringify(content.intros)}`,
    '',
  ].join('\n')
}
