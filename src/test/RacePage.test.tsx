import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderRoutes } from 'strata-react/testing'
import { routes } from '../routes'
import { clearRacePagesCache } from '../utils/racePages'
import { tor } from './fixtures'

beforeEach(() => clearRacePagesCache())
afterEach(() => { delete window.__RACE__ })

describe('Race page', () => {
  it('shows the race embedded in its static page: figures, description, photos and route', async () => {
    window.__RACE__ = { slug: '2026-tor-des-geants', activity: tor }
    renderRoutes(routes, { route: '/running/2026-tor-des-geants/' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Tor Des Geants' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tor Des Geants in figures')).toHaveTextContent('358.70')
    expect(screen.getByText('178/1118')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Col Malatrà' })).toBeInTheDocument()
    expect(screen.getByText(/^Map with one route\. Tor Des Geants/)).toBeInTheDocument()
    expect(document.title).toBe('Tor Des Geants (2026) | Jonathan Burnhams')
  })

  it('looks the race up by its slug when nothing is embedded', async () => {
    renderRoutes(routes, { route: '/running/2022-cape-wrath-ultra-2022/' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Cape Wrath Ultra 2022' })).toBeInTheDocument()
  })

  it('says so for an address with no race', async () => {
    renderRoutes(routes, { route: '/running/1999-nothing/' })
    expect(await screen.findByText('No race at this address')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Every race' })).toHaveAttribute('href', '/running')
  })
})
