import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Hero from './Hero'

/**
 * Test suite for the Hero component
 *
 * These tests verify that the Hero component renders correctly
 * and displays the expected content.
 */
describe('Hero', () => {
  it('renders the component', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const heroElement = screen.getByRole('banner')
    expect(heroElement).toBeInTheDocument()
  })

  it('displays the name "Jonathan Burnhams"', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const nameElement = screen.getByText('Jonathan Burnhams')
    expect(nameElement).toBeInTheDocument()
  })

  it('has the correct structure', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const heroSection = document.querySelector('.hero')
    expect(heroSection).toBeInTheDocument()

    const heroContent = document.querySelector('.hero-content')
    expect(heroContent).toBeInTheDocument()

    const heroTitle = document.querySelector('.hero-title')
    expect(heroTitle).toBeInTheDocument()
  })

  it('includes an underline decoration', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const underline = document.querySelector('.hero-underline')
    expect(underline).toBeInTheDocument()
  })

  it('uses semantic HTML with proper accessibility', () => {
    const { container } = render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const section = container.querySelector('section')
    expect(section).toHaveAttribute('role', 'banner')

    const underline = container.querySelector('.hero-underline')
    expect(underline).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders the Strava link correctly', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const stravaLink = screen.getByText('🔗 Strava Profile')
    expect(stravaLink).toBeInTheDocument()
    expect(stravaLink).toHaveAttribute('href', 'https://www.strava.com/athletes/jburnhams')
    expect(stravaLink).toHaveAttribute('target', '_blank')
    expect(stravaLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the Running link correctly', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const runningLink = screen.getByText(/Running/, { exact: false })
    expect(runningLink).toBeInTheDocument()
    expect(runningLink).toHaveAttribute('href', '/running')
  })

  it('renders the YouTube link correctly', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const youtubeLink = screen.getByText(/YouTube/, { exact: false })
    expect(youtubeLink).toBeInTheDocument()
    expect(youtubeLink).toHaveAttribute('href', 'https://www.youtube.com/@JonathanBurnhams')
    expect(youtubeLink).toHaveAttribute('target', '_blank')
    expect(youtubeLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('includes video emojis in the YouTube link', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const youtubeLink = screen.getByText(/📹.*YouTube.*🎬/)
    expect(youtubeLink).toBeInTheDocument()
  })

  it('renders the GitHub link correctly', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const githubLink = screen.getByText(/GitHub/, { exact: false })
    expect(githubLink).toBeInTheDocument()
    expect(githubLink).toHaveAttribute('href', 'https://github.com/jburnhams')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('includes developer and laptop emojis in the GitHub link', () => {
    render(
      <BrowserRouter>
        <Hero />
      </BrowserRouter>
    )
    const githubLink = screen.getByText(/👨‍💻.*GitHub.*💻/)
    expect(githubLink).toBeInTheDocument()
  })
})
