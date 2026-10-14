/** Category enum: label to slug. Order here is the nav order. */
export const CATEGORIES = [
  { slug: 'cloud', label: 'Cloud' },
  { slug: 'app-sec', label: 'App Sec' },
  { slug: 'network-sec', label: 'Network Sec' },
  { slug: 'iam', label: 'IAM' },
  { slug: 'secops', label: 'SecOps' },
  { slug: 'ai-automation', label: 'AI & Automation' },
  { slug: 'documentation', label: 'Documentation' },
  { slug: 'projects', label: 'Projects' },
  { slug: 'about', label: 'About' },
] as const

export type Category = (typeof CATEGORIES)[number]
export type CategorySlug = Category['slug']

const SLUGS: ReadonlySet<string> = new Set(CATEGORIES.map((c) => c.slug))

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === 'string' && SLUGS.has(value)
}
