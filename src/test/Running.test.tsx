import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderRoutes } from 'strata-react/testing'
import { routes } from '../routes'
import { ACTIVITIES_API } from '../data/activities'
import { clearRacePagesCache } from '../utils/racePages'
import { server } from './server'

beforeEach(() => clearRacePagesCache())

describe('Running', () => {
  it('opens with the finding: how many races, how far, and the longest', async () => {
    renderRoutes(routes, { route: '/running' })
    expect(await screen.findByText(/2\sraces over 20\skm since 2022/)).toBeInTheDocument()
    expect(screen.getByText(/The longest was Cape Wrath Ultra 2022/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Running' })).toBeInTheDocument()
  })

  it('lists races over 20 km, newest first, each linked to its race page', async () => {
    renderRoutes(routes, { route: '/running' })
    const table = await screen.findByRole('grid', { name: 'Races over 20 km' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2) // the 5 km parkrun is not a race
    expect(within(rows[0]).getByRole('link', { name: 'Tor Des Geants' })).toHaveAttribute('href', '/running/2026-tor-des-geants/')
    expect(within(rows[1]).getByText('Cape Wrath Ultra 2022')).toBeInTheDocument()
  })

  it('switches units, and keeps the choice in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, { route: '/running' })
    const table = await screen.findByRole('grid', { name: 'Races over 20 km' })
    expect(within(table).getByText('358.70 km')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Miles' }))
    expect(await within(table).findByText('222.89 mi')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?units=imperial')
  })

  it('draws every race route on the map', async () => {
    renderRoutes(routes, { route: '/running' })
    expect(await screen.findByText(/^Map with 2 routes\. Tor Des Geants, 2026/)).toBeInTheDocument()
  })

  it('sends old ?activity= links to the race page', async () => {
    const { router } = renderRoutes(routes, { route: '/running?activity=20235667026' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/running/2026-tor-des-geants/'))
  })

  it('says what failed when strava-sync cannot be read', async () => {
    server.use(http.get(ACTIVITIES_API, () => new HttpResponse(null, { status: 503 })))
    renderRoutes(routes, { route: '/running' })
    expect(await screen.findByRole('alert')).toHaveTextContent('The race list could not be read from strava-sync')
  })
})
