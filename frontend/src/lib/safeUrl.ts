export const MAX_URL_LENGTH = 2048

/** Hosts ending in these suffixes are private or non-public and never linked. */
export const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.lan', '.corp', '.home.arpa', '.localhost'] as const

const IPV4_HOST = /^\d+\.\d+\.\d+\.\d+$/
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_OR_BIDI = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/

/** True for hosts that are IP literals, localhost, single-label or on a private suffix. */
function isBlockedHost(hostname: string): boolean {
  // The URL parser lowercases, punycodes and canonicalises IPv4 (0x7f.1 -> 127.0.0.1).
  const host = hostname.replace(/\.+$/, '')
  return (
    host.startsWith('[') ||
    IPV4_HOST.test(host) ||
    host === 'localhost' ||
    !host.includes('.') ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  )
}

/**
 * Returns the normalised URL if `value` is an absolute https URL without
 * embedded credentials, to a public-looking DNS host (no IP literals,
 * localhost, single-label or private-suffix hosts), at most 2048 characters.
 * Otherwise null. Used for every outbound link.
 */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() !== value || value === '') return null
  if (value.length > MAX_URL_LENGTH || CONTROL_OR_BIDI.test(value)) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return null
  if (isBlockedHost(url.hostname) || url.href.length > MAX_URL_LENGTH) return null
  return url.href
}

const EMAIL = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

/** Returns a mailto: href for a plain email address, otherwise null. */
export function safeMailto(value: unknown): string | null {
  return typeof value === 'string' && EMAIL.test(value) ? `mailto:${value}` : null
}
