import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { site } from '../../config/site.ts'
import { axe } from '../../test/axe.ts'
import { Footer, footerLinks } from './Footer.tsx'

const original = { ...site.links }

describe('footerLinks', () => {
  it('returns nothing when no links are set', () => {
    expect(footerLinks({ github: '', email: '' })).toEqual([])
  })

  it('returns a safe github link and a mailto link', () => {
    expect(footerLinks({ github: 'https://github.com/someone', email: 'hi@example.com' })).toEqual([
      { label: 'github', href: 'https://github.com/someone', external: true },
      { label: 'email', href: 'mailto:hi@example.com', external: false },
    ])
  })

  it.each(['http://github.com/someone', 'javascript:alert(1)', 'https://u:p@github.com', '//github.com'])(
    'drops an unsafe github link: %s',
    (github) => {
      expect(footerLinks({ github, email: '' })).toEqual([])
    },
  )

  it.each(['not-an-email', 'a@example.com?bcc=x@y.com', 'javascript:alert(1)'])('drops an unsafe email: %s', (email) => {
    expect(footerLinks({ github: '', email })).toEqual([])
  })

  it('defaults to the site config', () => {
    expect(footerLinks()).toEqual(footerLinks(site.links))
  })
})

describe('Footer', () => {
  afterEach(() => Object.assign(site.links, original))

  it('renders a contentinfo landmark with the name and no list when links are unset', () => {
    site.links.github = ''
    site.links.email = ''
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(site.name.toLowerCase())
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders github as a new-tab link with noopener noreferrer and email as mailto', () => {
    site.links.github = 'https://github.com/someone'
    site.links.email = 'hi@example.com'
    render(<Footer />)
    const github = screen.getByRole('link', { name: 'github (opens in a new tab)' })
    expect(github).toHaveAttribute('href', 'https://github.com/someone')
    expect(github).toHaveAttribute('target', '_blank')
    expect(github).toHaveAttribute('rel', 'noopener noreferrer')
    const email = screen.getByRole('link', { name: 'email' })
    expect(email).toHaveAttribute('href', 'mailto:hi@example.com')
    expect(email).not.toHaveAttribute('target')
  })

  it('does not render an unsafe configured link', () => {
    site.links.github = 'javascript:alert(1)'
    site.links.email = ''
    render(<Footer />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('has no a11y violations with links set', async () => {
    site.links.github = 'https://github.com/someone'
    site.links.email = 'hi@example.com'
    const { container } = render(<Footer />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
