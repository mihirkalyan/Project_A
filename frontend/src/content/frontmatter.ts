import { parseDocument } from 'yaml'

export class ContentError extends Error {
  readonly file: string

  constructor(file: string, message: string) {
    super(`${file}: ${message}`)
    this.name = 'ContentError'
    this.file = file
  }
}

export interface SplitFile {
  data: unknown
  body: string
}

const BOM = String.fromCharCode(0xfeff)
const OPEN = /^---[ \t]*\n/
const CLOSE = /^---[ \t]*$/m

/**
 * Splits a Markdown file into its `---` frontmatter block and body, then
 * parses the block as YAML. BOM and CRLF safe. Throws ContentError on any
 * problem so the build fails with the file path.
 */
export function splitFrontmatter(file: string, raw: string): SplitFile {
  const text = (raw.startsWith(BOM) ? raw.slice(1) : raw).replace(/\r\n?/g, '\n')
  if (!OPEN.test(text)) throw new ContentError(file, 'missing opening --- frontmatter line')
  const rest = text.replace(OPEN, '')
  const close = CLOSE.exec(rest)
  if (!close) throw new ContentError(file, 'missing closing --- frontmatter line')
  const yamlSource = rest.slice(0, close.index)
  const body = rest.slice(close.index + close[0].length).replace(/^\n/, '')
  return { data: parseYaml(file, yamlSource), body }
}

/** YAML 1.2 core schema, no custom tags, alias expansion capped. */
export function parseYaml(file: string, source: string): unknown {
  const doc = parseDocument(source, { schema: 'core', uniqueKeys: true, prettyErrors: false })
  const problems = [...doc.errors, ...doc.warnings]
  if (problems.length > 0) throw new ContentError(file, `invalid YAML: ${problems[0].message}`)
  try {
    return doc.toJS({ maxAliasCount: 100 })
  } catch (err) {
    throw new ContentError(file, `invalid YAML: ${(err as Error).message}`)
  }
}
