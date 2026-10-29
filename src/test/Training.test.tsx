import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Training from '../pages/Training';
import {
  chartRange, formatPace, groupSports, inPeriod, mondayOf, periodRange, periodsIn, sportGroup, totalsByPeriod,
  TrainingActivity,
} from '../models/Training';
import { clearSummaryCache } from '../utils/trainingApi';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Marker: () => null,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const TODAY = '2026-10-29';

// Sessions on the server (newest first, as the API orders them)
const activities: TrainingActivity[] = [
  { date: '2026-09-13', sport: 'ultra_run', distance: 358700, moving_time: 274720, elapsed_time: 433935, elevation_gain: 24388, race: 1, race_activity_id: 20235667026 },
  { date: '2026-09-01', sport: 'ride', distance: 30000, moving_time: 3600, elapsed_time: 3700, elevation_gain: 200, race: 0, race_activity_id: null },
  ...Array.from({ length: 60 }, (_, i): TrainingActivity => ({
    date: `2026-08-${String(30 - Math.floor(i / 2)).padStart(2, '0')}`, sport: 'run', distance: 5000, moving_time: 1500,
    elapsed_time: 1500, elevation_gain: 10, race: 0, race_activity_id: null,
  })),
  { date: '2025-05-01', sport: 'swim', distance: 2000, moving_time: 2400, elapsed_time: 2500, elevation_gain: null, race: 0, race_activity_id: null },
];
// Weekly totals on the server, split into race and training rows
const weekly = [
  { week: '2026-09-07', sport: 'ultra_run', race: 1, count: 1, distance: 358700, moving_time: 274720, elevation_gain: 24388 },
  { week: '2026-08-31', sport: 'ride', race: 0, count: 4, distance: 50000, moving_time: 7000, elevation_gain: 300 },
  { week: '2026-08-24', sport: 'run', race: 0, count: 14, distance: 70000, moving_time: 21000, elevation_gain: 140 },
  { week: '2025-04-28', sport: 'swim', race: 0, count: 1, distance: 2000, moving_time: 2400, elevation_gain: 0 },
];
const strava = [{
  id: 20235667026, name: 'Tor Des Geants', type: 'Run', start_date: '2026-09-13T08:01:00Z', distance: 358700,
  moving_time: 274720, elapsed_time: 433935, total_elevation_gain: 24388,
  data_json: { id: 20235667026, name: 'Tor Des Geants', type: 'Run', start_date_local: '2026-09-13T10:01:00Z', distance: 358700,
    moving_time: 274720, elapsed_time: 433935, total_elevation_gain: 24388, average_speed: 1.3, description: '178/1118' },
}];

const requests: string[] = [];

// A small fake of the strava-sync training API: the same filters and paging
function fakeApi(url: string) {
  requests.push(url);
  const u = new URL(url);
  const q = u.searchParams;
  const sports = q.get('sport')?.split(',');
  const keep = (sport: string, race: number, day: string) =>
    (!sports || sports.includes(sport)) &&
    (q.get('race') === null || race === Number(q.get('race'))) &&
    (!q.get('from') || day >= q.get('from')!) && (!q.get('to') || day <= q.get('to')!);
  if (u.pathname.endsWith('/training/activities')) {
    const rows = activities.filter(a => keep(a.sport, a.race ?? 0, a.date));
    const offset = Number(q.get('offset') ?? 0), limit = Number(q.get('limit'));
    return { ok: true, headers: new Headers({ 'X-Total-Count': String(rows.length) }), json: async () => rows.slice(offset, offset + limit) };
  }
  if (u.pathname.endsWith('/training/summary')) {
    const len = { week: 10, month: 7, year: 4 }[q.get('period') as 'week'];
    const sums = new Map<string, { period: string; sport: string; count: number; distance: number; moving_time: number; elevation_gain: number }>();
    for (const w of weekly.filter(w => keep(w.sport, w.race, w.week))) {
      const key = `${w.week.slice(0, len)}|${w.sport}`;
      const s = sums.get(key) ?? { period: w.week.slice(0, len), sport: w.sport, count: 0, distance: 0, moving_time: 0, elevation_gain: 0 };
      s.count += w.count; s.distance += w.distance; s.moving_time += w.moving_time; s.elevation_gain += w.elevation_gain;
      sums.set(key, s);
    }
    return { ok: true, headers: new Headers(), json: async () => [...sums.values()].sort((a, b) => b.period.localeCompare(a.period)) };
  }
  return { ok: true, headers: new Headers(), json: async () => strava };
}

global.fetch = vi.fn();
const params = (path: string) => requests.filter(r => r.includes(path)).map(r => Object.fromEntries(new URL(r).searchParams));
const lastParams = (path: string) => params(path)[params(path).length - 1];

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
  beforeEach(() => {
    vi.clearAllMocks();
    clearSummaryCache();
    requests.length = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => fakeApi(url));
  });

  it('loads only the yearly totals, the last 12 months of weeks and the first page of sessions', async () => {
    render(<Training today={TODAY} />);
    expect(await screen.findByText('50 of 63 sessions')).toBeInTheDocument();
    expect(screen.getAllByTestId('volume-bar')).toHaveLength(52);
    expect(params('/summary')).toEqual([{ period: 'year' }, { period: 'week', from: '2025-11-03', to: TODAY }]);
    expect(params('/activities')).toEqual([{ limit: '50', offset: '0' }]);
    expect(requests.some(r => r.includes('period=month'))).toBe(false);
    const totals = screen.getByRole('heading', { name: 'Totals by year' }).nextElementSibling as HTMLElement;
    expect(within(totals).getByText('2025')).toBeInTheDocument();
  });

  it('fetches the next page on Show more', async () => {
    render(<Training today={TODAY} />);
    fireEvent.click(await screen.findByText('Show more'));
    expect(await screen.findByText('63 of 63 sessions')).toBeInTheDocument();
    expect(lastParams('/activities')).toEqual({ limit: '50', offset: '50' });
    expect(screen.queryByText('Show more')).toBeNull();
  });

  it('fetches monthly bars (last 2 years) and other years only when chosen', async () => {
    render(<Training today={TODAY} />);
    await screen.findByText('50 of 63 sessions');
    fireEvent.click(screen.getByText('Monthly'));
    await waitFor(() => expect(screen.getAllByTestId('volume-bar')).toHaveLength(24));
    expect(lastParams('/summary')).toEqual({ period: 'month', from: '2024-11-01', to: TODAY });
    expect(screen.getByLabelText('Chart range')).toHaveValue('recent');
    fireEvent.change(screen.getByLabelText('Chart range'), { target: { value: '2025' } });
    await waitFor(() => expect(screen.getAllByTestId('volume-bar')).toHaveLength(12));
    expect(lastParams('/summary')).toEqual({ period: 'month', from: '2025-01-01', to: '2025-12-31' });
    fireEvent.click(screen.getByText('Yearly'));
    expect(screen.getAllByTestId('volume-bar')).toHaveLength(2); // from the yearly totals already loaded
    expect(screen.queryByLabelText('Chart range')).toBeNull();
  });

  it('sends the sport, year and race filters to the server', async () => {
    render(<Training today={TODAY} />);
    await screen.findByText('50 of 63 sessions');
    fireEvent.change(screen.getByLabelText('Sport'), { target: { value: 'ride' } });
    expect(await screen.findByText('1 of 1 sessions')).toBeInTheDocument();
    expect(lastParams('/activities')).toMatchObject({ sport: 'ride,indoor_ride' });
    fireEvent.change(screen.getByLabelText('Sport'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
    expect(await screen.findByText('1 of 1 sessions')).toBeInTheDocument();
    expect(lastParams('/activities')).toMatchObject({ from: '2025-01-01', to: '2025-12-31' });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: 'all' } });
    fireEvent.click(screen.getByLabelText('Races only'));
    expect(await screen.findByText('1 of 1 sessions')).toBeInTheDocument();
    expect(lastParams('/activities')).toMatchObject({ race: '1' });
    expect(screen.getByText('Ultra')).toBeInTheDocument();
  });

  it('filters sessions to a clicked bar, and clears on a second click or the chip', async () => {
    render(<Training today={TODAY} />);
    await screen.findByText('50 of 63 sessions');
    const bars = screen.getAllByTestId('volume-bar');
    const week = bars.find(b => b.querySelector('title')?.textContent?.startsWith('31 Aug'))!;
    fireEvent.click(week);
    expect(await screen.findByText('1 of 1 sessions')).toBeInTheDocument(); // the 1 Sep ride
    expect(lastParams('/activities')).toMatchObject({ from: '2026-08-31', to: '2026-09-06' });
    expect(screen.getByText(/week of 31 Aug 2026/)).toBeInTheDocument();
    fireEvent.click(week);
    expect(await screen.findByText('50 of 63 sessions')).toBeInTheDocument();
    fireEvent.click(week);
    await screen.findByText('1 of 1 sessions');
    fireEvent.click(screen.getByLabelText('Clear period filter'));
    expect(await screen.findByText('50 of 63 sessions')).toBeInTheDocument();
  });

  it('switches to training-only totals and sessions when "Include races" is unticked', async () => {
    render(<Training today={TODAY} />);
    await screen.findByText('50 of 63 sessions');
    fireEvent.click(screen.getByLabelText('Include races'));
    expect(await screen.findByText('50 of 62 sessions')).toBeInTheDocument();
    expect(lastParams('/activities')).toMatchObject({ race: '0' });
    await waitFor(() => expect(params('/summary').filter(p => p.race === '0').map(p => p.period).sort()).toEqual(['week', 'year']));
    expect(screen.getByRole('heading', { name: 'Totals by year (training only)' })).toBeInTheDocument();
    expect(screen.queryByText('Race')).toBeNull();
    expect(screen.getByLabelText('Races only')).toBeDisabled();
  });

  it('opens the Strava race popup from a race session', async () => {
    render(<Training today={TODAY} />);
    await screen.findByText('50 of 63 sessions');
    fireEvent.click(screen.getByText('Race').closest('tr')!);
    expect(await screen.findByRole('heading', { level: 2, name: 'Tor Des Geants' })).toBeInTheDocument();
    expect(screen.getByText('178/1118')).toBeInTheDocument();
    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByRole('heading', { level: 2, name: 'Tor Des Geants' })).toBeNull();
  });

  it('shows an error when the API fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, headers: new Headers() });
    render(<Training today={TODAY} />);
    expect(await screen.findByText(/Error: Failed to fetch training data/)).toBeInTheDocument();
  });
});
