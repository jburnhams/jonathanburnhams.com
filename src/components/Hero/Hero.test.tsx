import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Hero from './Hero'

/**
 * Test suite for the Hero component
 *
 * These tests verify that the Hero component renders correctly
 * and displays the expected content.
 */
describe('Hero', () => {
  it('renders the component', () => {
    render(<Hero />)
    const heroElement = screen.getByRole('banner')
    expect(heroElement).toBeInTheDocument()
  })

  it('displays the name "Jonathan Burnhams"', () => {
    render(<Hero />)
    const nameElement = screen.getByText('Jonathan Burnhams')
    expect(nameElement).toBeInTheDocument()
  })

  it('has the correct structure', () => {
    render(<Hero />)
    const heroSection = document.querySelector('.hero')
    expect(heroSection).toBeInTheDocument()

    const heroContent = document.querySelector('.hero-content')
    expect(heroContent).toBeInTheDocument()

    const heroTitle = document.querySelector('.hero-title')
    expect(heroTitle).toBeInTheDocument()
  })

  it('includes an underline decoration', () => {
    render(<Hero />)
    const underline = document.querySelector('.hero-underline')
    expect(underline).toBeInTheDocument()
  })

  it('uses semantic HTML with proper accessibility', () => {
    const { container } = render(<Hero />)
    const section = container.querySelector('section')
    expect(section).toHaveAttribute('role', 'banner')

    const underline = container.querySelector('.hero-underline')
    expect(underline).toHaveAttribute('aria-hidden', 'true')
  })
})
