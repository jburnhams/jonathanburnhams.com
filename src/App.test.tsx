import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

/**
 * Test suite for the main App component
 */
describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.querySelector('.app')).toBeInTheDocument()
  })

  it('renders the Hero component', () => {
    render(<App />)
    const heroElement = screen.getByRole('banner')
    expect(heroElement).toBeInTheDocument()
  })
})
