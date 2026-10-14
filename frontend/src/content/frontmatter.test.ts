import { describe, expect, it } from 'vitest'
import { ContentError, parseYaml, splitFrontmatter } from './frontmatter.ts'

const FILE = 'content/topics/example.md'

describe('splitFrontmatter', () => {
  it('splits the YAML block from the body', () => {
    const { data, body } = splitFrontmatter(FILE, '---\ntitle: hello\n---\n# body\n\ntext\n')
    expect(data).toEqual({ title: 'hello' })
    expect(body).toBe('# body\n\ntext\n')
  })

  it('handles CRLF line endings', () => {
    const { data, body } = splitFrontmatter(FILE, '---\r\ntitle: hello\r\n---\r\nline one\r\nline two\r\n')
    expect(data).toEqual({ title: 'hello' })
    expect(body).toBe('line one\nline two\n')
  })

  it('handles lone CR line endings', () => {
    const { data } = splitFrontmatter(FILE, '---\rtitle: hello\r---\rbody')
    expect(data).toEqual({ title: 'hello' })
  })

  it('strips a leading BOM', () => {
    const { data } = splitFrontmatter(FILE, '﻿---\ntitle: hello\n---\n')
    expect(data).toEqual({ title: 'hello' })
  })

  it('tolerates trailing spaces on the fence lines', () => {
    const { data, body } = splitFrontmatter(FILE, '--- \t\ntitle: hello\n---  \nbody')
    expect(data).toEqual({ title: 'hello' })
    expect(body).toBe('body')
  })

  it('returns an empty body when the file ends at the closing fence', () => {
    expect(splitFrontmatter(FILE, '---\ntitle: hello\n---').body).toBe('')
  })

  it('returns null data for an empty frontmatter block', () => {
    expect(splitFrontmatter(FILE, '---\n---\nbody').data).toBeNull()
  })

  it('does not treat a longer dash run inside the YAML as the closing fence', () => {
    const { data } = splitFrontmatter(FILE, '---\ntitle: "a ---- b"\n---\n')
    expect(data).toEqual({ title: 'a ---- b' })
  })

  it.each([
    ['no fence at all', 'title: hello\n'],
    ['a fence that is not on the first line', '\n---\ntitle: hello\n---\n'],
    ['four dashes', '----\ntitle: hello\n---\n'],
    ['an empty file', ''],
  ])('rejects %s (missing opening fence)', (_label, raw) => {
    expect(() => splitFrontmatter(FILE, raw)).toThrow(/missing opening ---/)
  })

  it('rejects a block with no closing fence', () => {
    expect(() => splitFrontmatter(FILE, '---\ntitle: hello\n')).toThrow(/missing closing ---/)
  })

  it('includes the file path in the error', () => {
    try {
      splitFrontmatter(FILE, 'nope')
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ContentError)
      expect((err as ContentError).file).toBe(FILE)
      expect((err as Error).message.startsWith(`${FILE}: `)).toBe(true)
      expect((err as Error).name).toBe('ContentError')
    }
  })
})

describe('parseYaml', () => {
  it('parses plain mappings, lists and scalars', () => {
    expect(parseYaml(FILE, 'a: 1\nb: [x, y]\nc: true\nd: "2026-01-02"')).toEqual({
      a: 1,
      b: ['x', 'y'],
      c: true,
      d: '2026-01-02',
    })
  })

  it('uses the core schema: unquoted dates stay strings, no timestamp conversion', () => {
    expect(parseYaml(FILE, 'date: 2026-10-13')).toEqual({ date: '2026-10-13' })
  })

  it('rejects syntax errors with the file path', () => {
    expect(() => parseYaml(FILE, 'a: [1, 2')).toThrow(new RegExp(`^${FILE}: invalid YAML`))
  })

  it('rejects duplicate keys', () => {
    expect(() => parseYaml(FILE, 'a: 1\na: 2')).toThrow(/invalid YAML/)
  })

  it('rejects custom tags', () => {
    expect(() => parseYaml(FILE, 'a: !!js/function "function () {}"')).toThrow(/invalid YAML/)
  })

  it('rejects unknown local tags', () => {
    expect(() => parseYaml(FILE, 'a: !evil thing')).toThrow(/invalid YAML/)
  })

  it('allows a few aliases', () => {
    expect(parseYaml(FILE, 'a: &x [1]\nb: *x')).toEqual({ a: [1], b: [1] })
  })

  it('caps alias expansion (billion laughs)', () => {
    const lines = ['l0: &l0 [x, x, x, x, x, x, x, x, x, x]']
    for (let i = 1; i <= 8; i += 1) {
      const refs = Array.from({ length: 10 }, () => `*l${i - 1}`).join(', ')
      lines.push(`l${i}: &l${i} [${refs}]`)
    }
    expect(() => parseYaml(FILE, lines.join('\n'))).toThrow(/invalid YAML/)
  })
})
