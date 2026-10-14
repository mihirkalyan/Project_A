import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PixelDivider } from '../divider/PixelDivider.tsx'
import { WindowFrame } from './WindowFrame.tsx'

describe('WindowFrame', () => {
  it('renders its children and a decorative, hidden title bar', () => {
    render(
      <WindowFrame title="mihir.os">
        <p>inside</p>
      </WindowFrame>,
    )
    expect(screen.getByText('inside')).toBeInTheDocument()
    const title = screen.getByText('mihir.os')
    expect(title.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})

describe('PixelDivider', () => {
  it('is decorative', () => {
    const { container } = render(<PixelDivider />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toBeEmptyDOMElement()
  })
})
