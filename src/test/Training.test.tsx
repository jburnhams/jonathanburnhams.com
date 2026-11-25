import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithStrata } from 'strata-react/testing'
import Training from '../pages/Training'
import {
  chartRange, formatPace, groupSports, inPeriod, mondayOf, periodRange, periodsIn, sportGroup, totalsByPeriod,
} from '../models/Training'
import { TRAINING_API } from '../models/Training'
import { clearSummaryCache } from '../utils/trainingApi'
import { clearRacePagesCache } from '../utils/racePages'
import { sessions as activities, TODAY } from './fixtures'
import { server, trainingRequests } from './server'

const params = (path: string) => trainingRequests.filter(r => r.path === path).map(r => r.params)
const last = (path: string) => params(path)[params(path).length - 1]

describe('Training model', () => {
  it('groups sports and sums totals per period', () => {
    expect(sportGroup('trail_run').key).toBe('run');
    expect(sportGroup('open_water_swim').key).toBe('swim');
    expect(sportGroup('kayak').key).toBe('other');
    expect(groupSports('run')).toBe('run,trail_run,ultra_run,treadmill_run');
    expect(groupSports('other')).toBe('other');
    const t = totalsByPeriod([
      { period: '2026', sport: 'ultra_run', count: 1, distance: 358700, moving_time: 274720, elevation_gain: 24388 },
      { period: '2026', sport: 'ride', count: 4, distance: 50000, moving_time: 7000, elevation_gain: 300 },
      { period: '2025', sport: 'swim', count: 1, distance: 2000, moving_time: 2400, elevation_gain: 0 },
    ]);
    expect(t.map(p => p.period)).toEqual(['2026', '2025']);
    expect(t[0].byGroup.run.distance).toBe(358700);
  });

  it('works out periods, ranges and the chart window', () => {
    expect(mondayOf('2026-09-13')).toBe('2026-09-07');
    expect(inPeriod('2026-09-13', 'week', '2026-09-07')).toBe(true);
    expect(inPeriod('2026-09-14', 'week', '2026-09-07')).toBe(false);
    expect(periodRange('week', '2026-09-07')).toEqual({ from: '2026-09-07', to: '2026-09-13' });
    expect(periodRange('month', '2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('year', '2025')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    const weeks = chartRange('week', 'recent', TODAY);
    expect(periodsIn('week', weeks.from, weeks.to)).toHaveLength(52);
    const months = chartRange('month', 'recent', TODAY);
    expect(periodsIn('month', months.from, months.to)).toHaveLength(24);
    expect(chartRange('month', '2025', TODAY)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(periodsIn('month', '2025-01-01', '2025-12-31')).toHaveLength(12);
  });

  it('formats pace per sport', () => {
    expect(formatPace(activities[0])).toBe('12:46 /km');
    expect(formatPace(activities[1])).toBe('30.0 km/h');
    expect(formatPace(activities[activities.length - 1])).toBe('2:00 /100m');
  });
});

describe('Training page', () => {
  beforeEach(() => { clearSummaryCache(); clearRacePagesCache(); trainingRequests.length = 0 })

  it('loads only the yearly totals, the last 12 months of weeks and the first page of sessions', async () => {
    const user = userEvent.setup()
    renderWithStrata(<Training today={TODAY} />)
    expect(await screen.findByText(/^50 of 63\ssessions$/)).toBeInTheDocument()
    expect(await screen.findAllByTestId('volume-bar')).toHaveLength(52)
    expect(params('summary')).toEqual([{ period: 'year' }, { period: 'week', from: '2025-11-03', to: TODAY }])
    expect(params('activities')).toEqual([{ limit: '50', offset: '0' }])
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await waitFor(() => expect(params('summary').some(p => p.period === 'month')).toBe(true))
    expect(params('activities')).toHaveLength(1) // the list doesn't depend on the chart view
    const totals = screen.getByRole('grid', { name: 'Totals by year' })
    expect(within(totals).getByText('2025')).toBeInTheDocument()
  })

  it('fetches the next page on Show more', async () => {
    const user = userEvent.setup()
    renderWithStrata(<Training today={TODAY} />)
    await user.click(await screen.findByRole('button', { name: 'Show more' }))
    expect(await screen.findByText(/^63 of 63\ssessions$/)).toBeInTheDocument()
    expect(last('activities')).toEqual({ limit: '50', offset: '50' })
  })

  it('sends the sport, year and race filters to the server', async () => {
    const user = userEvent.setup()
    renderWithStrata(<Training today={TODAY} />)
    await screen.findByText(/^50 of 63\ssessions$/)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sport' }), 'run')
    await waitFor(() => expect(last('activities')).toMatchObject({ sport: 'run,trail_run,ultra_run,treadmill_run' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '2026')
    await waitFor(() => expect(last('activities')).toMatchObject({ from: '2026-01-01', to: '2026-12-31' }))
    await user.click(screen.getByRole('checkbox', { name: 'Races only' }))
    await waitFor(() => expect(last('activities')).toMatchObject({ race: '1' }))
  })

  it('filters sessions to a chosen bar, and shows all again', async () => {
    const user = userEvent.setup()
    renderWithStrata(<Training today={TODAY} />)
    const bars = await screen.findAllByTestId('volume-bar')
    await user.click(bars[44]) // the week of 2026-09-07 (weeks from 2025-11-03)
    await waitFor(() => expect(last('activities')).toMatchObject({ from: '2026-09-07', to: '2026-09-13' }))
    await user.click(screen.getByRole('button', { name: /Show every period/ }))
    await waitFor(() => expect(last('activities').from).toBeUndefined())
  })

  it('switches to training-only totals and sessions when "Include races" is unticked', async () => {
    const user = userEvent.setup()
    renderWithStrata(<Training today={TODAY} />)
    await screen.findByText(/^50 of 63\ssessions$/)
    await user.click(screen.getByRole('checkbox', { name: 'Include races' }))
    expect(await screen.findByRole('heading', { name: 'Totals by year (training only)' })).toBeInTheDocument()
    await waitFor(() => expect(last('activities')).toMatchObject({ race: '0' }))
    expect(last('summary')).toMatchObject({ race: '0' })
  })

  it('links a race session to its race page', async () => {
    renderWithStrata(<Training today={TODAY} />)
    expect(await screen.findByRole('link', { name: 'Race' })).toHaveAttribute('href', '/running/2026-tor-des-geants/')
  })

  it('says what failed when the training API cannot be read', async () => {
    server.use(http.get(`${TRAINING_API}/summary`, () => new HttpResponse(null, { status: 500 })))
    renderWithStrata(<Training today={TODAY} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('The training log could not be read from strava-sync.')
  })
})
