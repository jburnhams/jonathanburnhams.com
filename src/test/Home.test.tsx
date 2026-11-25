import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithStrata } from 'strata-react/testing'
import Home from '../pages/Home'
import { shuffle, srcSet, visitOrder, type Background } from '../backgrounds'

const photo = (id: string, name: string, extra: Partial<Background['activity']> = {}): Background => ({
  id, width: 1200, height: 900, source: 'strava-sync', focus: '50% 50%',
  activity: { id: Number(id.split('_')[0]), name, date: '2022-05-22', distance: 400000, elevation: 11000, route: 'M0 0L100 100', ...extra },
  sizes: [{ width: 640, avif: 1, webp: 1 }, { width: 1200, avif: 1, webp: 1 }],
  placeholder: 'data:image/webp;base64,AA==',
  colours: { mean: '#556677', ink: '#112233', inkText: '#eeeeee', primary: '#cc4422', secondary: '#88aa66' },
})
const capeWrath = photo('7230974312_12', 'Cape Wrath Ultra 2022')
const tor = photo('20235667026_0', 'Tor Des Geants', { date: '2026-09-13', route: null })

describe('Homepage', () => {
  it('says who this is and where to go, on the photo', () => {
    renderWithStrata(<Home order={[capeWrath, tor]} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Jonathan Burnhams' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Elsewhere' })
    expect([...nav.querySelectorAll('a')].map(a => a.textContent)).toEqual(['Running', 'Training', 'Strava', 'YouTube', 'GitHub'])
    expect(screen.getByRole('img', { name: 'A photo from Cape Wrath Ultra 2022' })).toBeInTheDocument()
  })

  it('captions the photo with its race, when, how far and how much climbing, and its route', () => {
    renderWithStrata(<Home order={[capeWrath, tor]} />)
    expect(screen.getByText('Cape Wrath Ultra 2022')).toBeInTheDocument()
    expect(screen.getByText(/22 May 2022, 400\skm, 11,000\sm climb/)).toBeInTheDocument()
    expect(screen.getByTestId('route-trace')).toBeInTheDocument()
  })

  it('puts the photo\'s palette on the page, and "Another photo" changes photo and palette', async () => {
    const user = userEvent.setup()
    renderWithStrata(<Home order={[capeWrath, tor]} />)
    expect(document.body.dataset.photo).toBe('7230974312_12')
    await user.click(screen.getByRole('button', { name: 'Another photo' }))
    expect(screen.getByText('Tor Des Geants')).toBeInTheDocument()
    expect(document.body.dataset.photo).toBe('20235667026_0')
    expect(sessionStorage.getItem('photo')).toBe('20235667026_0')
  })

  it('offers no other photo when there is only one', () => {
    renderWithStrata(<Home order={[tor]} />)
    expect(screen.queryByRole('button', { name: 'Another photo' })).not.toBeInTheDocument()
  })

  it('serves AVIF and WebP at every built width', () => {
    expect(srcSet(capeWrath, 'avif')).toBe('/backgrounds/7230974312_12-640.avif 640w, /backgrounds/7230974312_12-1200.avif 1200w')
  })

  it('starts the visit with the photo the page head chose, then the rest shuffled', () => {
    const all = [capeWrath, tor, photo('1_0', 'A'), photo('2_0', 'B')]
    const order = visitOrder(all, '1_0', () => 0)
    expect(order[0].id).toBe('1_0')
    expect(order).toHaveLength(4)
    expect(shuffle([1, 2, 3], () => 0.999)).toEqual([1, 2, 3])
  })
})
