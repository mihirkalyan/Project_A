import { describe, expect, it } from 'vitest'
import { BLOCKED_HOST_SUFFIXES, MAX_URL_LENGTH, safeHttpsUrl, safeMailto } from './safeUrl.ts'

describe('safeHttpsUrl', () => {
  it.each([
    ['https://github.com/someone', 'https://github.com/someone'],
    ['https://example.com', 'https://example.com/'],
    ['https://EXAMPLE.com/Path?q=1#x', 'https://example.com/Path?q=1#x'],
    ['https://example.com:8443/a', 'https://example.com:8443/a'],
  ])('accepts %s', (value, expected) => {
    expect(safeHttpsUrl(value)).toBe(expected)
  })

  it.each([
    ['http', 'http://example.com'],
    ['javascript', 'javascript:alert(1)'],
    ['JavaScript mixed case', 'JaVaScRiPt:alert(1)'],
    ['data', 'data:text/html,<b>x</b>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
    ['ftp', 'ftp://example.com'],
    ['protocol-relative', '//example.com'],
    ['relative', '/about'],
    ['user and password', 'https://user:pass@example.com'],
    ['user only', 'https://user@example.com'],
    ['password only', 'https://:pass@example.com'],
    ['leading space', ' https://example.com'],
    ['trailing space', 'https://example.com '],
    ['trailing newline', 'https://example.com\n'],
    ['empty', ''],
    ['garbage', 'not a url'],
  ])('rejects %s', (_label, value) => {
    expect(safeHttpsUrl(value)).toBeNull()
  })

  it('rejects non-strings', () => {
    expect(safeHttpsUrl(undefined)).toBeNull()
    expect(safeHttpsUrl(null)).toBeNull()
    expect(safeHttpsUrl(42)).toBeNull()
    expect(safeHttpsUrl(new URL('https://example.com'))).toBeNull()
  })
})

describe('safeMailto', () => {
  it.each(['hello@example.com', 'first.last+tag@sub.example.co.uk', 'a_b-c.d@x-y.io'])('accepts %s', (value) => {
    expect(safeMailto(value)).toBe(`mailto:${value}`)
  })

  it.each([
    ['empty', ''],
    ['no at', 'example.com'],
    ['no domain dot', 'a@localhost'],
    ['query injection', 'a@example.com?subject=hi'],
    ['cc injection', 'a@example.com&cc=b@example.com'],
    ['header newline', 'a@example.com\nbcc: b@example.com'],
    ['space', 'a b@example.com'],
    ['scheme already', 'mailto:a@example.com'],
    ['javascript', 'javascript:alert(1)//@example.com'],
    ['two ats', 'a@b@example.com'],
    ['trailing dot', 'a@example.'],
  ])('rejects %s', (_label, value) => {
    expect(safeMailto(value)).toBeNull()
  })

  it('rejects non-strings', () => {
    expect(safeMailto(undefined)).toBeNull()
    expect(safeMailto(1)).toBeNull()
  })
})

describe('safeHttpsUrl: length cap', () => {
  const base = 'https://example.com/'
  const ofLength = (n: number) => base + 'a'.repeat(n - base.length)

  it('accepts an input of exactly MAX_URL_LENGTH and rejects one more', () => {
    expect(safeHttpsUrl(ofLength(MAX_URL_LENGTH))).toHaveLength(MAX_URL_LENGTH)
    expect(safeHttpsUrl(ofLength(MAX_URL_LENGTH + 1))).toBeNull()
  })

  it('caps the normalised href too (an inner space grows to %20)', () => {
    // input length n, href length n + 2
    const withSpace = (n: number) => base + 'b c' + 'a'.repeat(n - base.length - 3)
    expect(withSpace(MAX_URL_LENGTH - 2)).toHaveLength(MAX_URL_LENGTH - 2)
    expect(safeHttpsUrl(withSpace(MAX_URL_LENGTH - 2))).toHaveLength(MAX_URL_LENGTH)
    expect(safeHttpsUrl(withSpace(MAX_URL_LENGTH - 1))).toBeNull()
  })

  it('caps the normalised href when a trailing slash is added', () => {
    const noPath = (n: number) => 'https://example.com?' + 'a'.repeat(n - 'https://example.com?'.length)
    expect(safeHttpsUrl(noPath(MAX_URL_LENGTH - 1))).toHaveLength(MAX_URL_LENGTH)
    expect(safeHttpsUrl(noPath(MAX_URL_LENGTH))).toBeNull()
  })
})

describe('safeHttpsUrl: hosts', () => {
  it.each([
    ['a public host', 'https://docs.example.org/a/b', 'https://docs.example.org/a/b'],
    ['an IDN host (punycoded)', 'https://münchen.de/', 'https://xn--mnchen-3ya.de/'],
    ['a host that merely contains a blocked word', 'https://local.example.com/', 'https://local.example.com/'],
    ['a fully qualified public host', 'https://example.com./', 'https://example.com./'],
  ])('accepts %s', (_label, value, expected) => {
    expect(safeHttpsUrl(value)).toBe(expected)
  })

  it.each([
    ['localhost', 'https://localhost/'],
    ['LOCALHOST uppercase', 'https://LOCALHOST/'],
    ['localhost trailing dot', 'https://localhost./'],
    ['127.0.0.1', 'https://127.0.0.1/'],
    ['public IPv4 literal', 'https://8.8.8.8/'],
    ['hex shorthand IPv4 0x7f.1', 'https://0x7f.1/'],
    ['decimal IPv4 2130706433', 'https://2130706433/'],
    ['octal IPv4', 'https://0177.0.0.1/'],
    ['IPv6 loopback', 'https://[::1]/'],
    ['IPv6 literal', 'https://[2001:db8::1]/'],
    ['single-label host', 'https://intranet/'],
    ['single-label host with trailing dot', 'https://intranet./'],
    ['.local', 'https://printer.local/'],
    ['.local trailing dot', 'https://printer.local./'],
    ['.internal', 'https://api.internal/'],
    ['.internal trailing dot', 'https://api.internal./'],
    ['.lan', 'https://nas.lan/'],
    ['.lan trailing dot', 'https://nas.lan./'],
    ['.corp', 'https://wiki.corp/'],
    ['.corp trailing dot', 'https://wiki.corp./'],
    ['.home.arpa', 'https://router.home.arpa/'],
    ['.home.arpa trailing dot', 'https://router.home.arpa./'],
    ['.localhost', 'https://app.localhost/'],
    ['.localhost trailing dot', 'https://app.localhost./'],
    ['uppercase blocked suffix', 'https://Printer.LOCAL/'],
    ['inner tab (the URL parser would strip it)', 'https://exa\tmple.com/'],
    ['inner newline (the URL parser would strip it)', 'https://exa\nmple.com/'],
    ['inner carriage return', 'https://example.com/a\rb'],
    ['NUL', 'https://example.com/\0'],
    ['bidi override U+202E', 'https://example.com/\u202Egpj.exe'],
    ['bidi isolate U+2066', 'https://example.com/\u2066x'],
  ])('rejects %s', (_label, value) => {
    expect(safeHttpsUrl(value)).toBeNull()
  })

  it('blocks every listed suffix', () => {
    for (const suffix of BLOCKED_HOST_SUFFIXES) {
      expect(safeHttpsUrl(`https://host${suffix}/`)).toBeNull()
      expect(safeHttpsUrl(`https://host${suffix}./`)).toBeNull()
    }
  })
})

describe('safeMailto: extra rejections', () => {
  it.each([
    ['percent in local part', 'a%b@example.com'],
    ['percent-encoded newline', 'a@example.com%0Abcc:b@example.com'],
    ['percent in domain', 'a@exa%41mple.com'],
  ])('rejects %s', (_label, value) => {
    expect(safeMailto(value)).toBeNull()
  })
})
