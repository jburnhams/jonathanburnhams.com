import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Training from '../pages/Training';
import { formatPace, inPeriod, sportGroup, totalsByPeriod, TRAINING_API } from '../models/Training';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Marker: () => null,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const activities = [
  { date: '2026-09-13', sport: 'ultra_run', distance: 358700, moving_time: 274720, elapsed_time: 433935, elevation_gain: 24388, race: 1, race_activity_id: 20235667026 },
  { date: '2026-09-01', sport: 'ride', distance: 30000, moving_time: 3600, elapsed_time: 3700, elevation_gain: 200, race: 0 },
  { date: '2025-05-01', sport: 'swim', distance: 2000, moving_time: 2400, elapsed_time: 2500, elevation_gain: null, race: 0 },
];
const week = [
  { period: '2026-09-07', sport: 'ultra_run', count: 1, distance: 358700, moving_time: 274720, elevation_gain: 24388 },
  { period: '2026-08-31', sport: 'ride', count: 4, distance: 50000, moving_time: 7000, elevation_gain: 300 },
];
const trainingWeek = [week[1]];
const strava = [{
  id: 20235667026, name: 'Tor Des Geants', type: 'Run', start_date: '2026-09-13T08:01:00Z', distance: 358700,
  moving_time: 274720, elapsed_time: 433935, total_elevation_gain: 24388,
  data_json: { id: 20235667026, name: 'Tor Des Geants', type: 'Run', start_date_local: '2026-09-13T10:01:00Z', distance: 358700,
    moving_time: 274720, elapsed_time: 433935, total_elevation_gain: 24388, average_speed: 1.3, description: '178/1118' },
}];
const year = [
  { period: '2026', sport: 'ultra_run', count: 1, distance: 358700, moving_time: 274720, elevation_gain: 24388 },
  { period: '2026', sport: 'ride', count: 4, distance: 50000, moving_time: 7000, elevation_gain: 300 },
  { period: '2025', sport: 'swim', count: 1, distance: 2000, moving_time: 2400, elevation_gain: 0 },
];

global.fetch = vi.fn();

function mockApi() {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url === `${TRAINING_API}/activities` ? activities
        : url.endsWith('/activities') ? strava
        : url.endsWith('period=week&race=0') ? trainingWeek
        : url.includes('period=year') ? year
        : url.endsWith('period=month') ? [] : week,
  }));
}

describe('Training model', () => {
  it('groups sports and sums totals per period', () => {
    expect(sportGroup('trail_run').key).toBe('run');
    expect(sportGroup('open_water_swim').key).toBe('swim');
    expect(sportGroup('kayak').key).toBe('other');
    const t = totalsByPeriod(year);
    expect(t.map(p => p.period)).toEqual(['2026', '2025']);
    expect(t[0].byGroup.run.distance).toBe(358700);
    expect(t[0].byGroup.ride.count).toBe(4);
  });

  it('knows which days fall in a week, month or year', () => {
    expect(inPeriod('2026-09-13', 'week', '2026-09-07')).toBe(true);
    expect(inPeriod('2026-09-14', 'week', '2026-09-07')).toBe(false);
    expect(inPeriod('2026-09-01', 'month', '2026-09')).toBe(true);
    expect(inPeriod('2025-05-01', 'year', '2026')).toBe(false);
  });

  it('formats pace per sport', () => {
    expect(formatPace(activities[0])).toBe('12:46 /km');
    expect(formatPace(activities[1])).toBe('30.0 km/h');
    expect(formatPace(activities[2])).toBe('2:00 /100m');
  });
});

describe('Training page', () => {
  beforeEach(() => { vi.clearAllMocks(); mockApi(); });

  it('shows the chart, yearly totals and the session list', async () => {
    render(<Training />);
    expect(await screen.findByRole('heading', { name: 'Training' })).toBeInTheDocument();
    expect(screen.getAllByTestId('volume-bar')).toHaveLength(2);
    expect(screen.getByText('3 of 3 sessions')).toBeInTheDocument();
    expect(screen.getByText('Race')).toBeInTheDocument();
    const totals = screen.getByRole('heading', { name: 'Totals by year' }).nextElementSibling as HTMLElement;
    expect(within(totals).getByText('2025')).toBeInTheDocument();
  });

  it('filters sessions by sport, year and races', async () => {
    render(<Training />);
    await screen.findByText('3 of 3 sessions');
    fireEvent.change(screen.getByLabelText('Sport'), { target: { value: 'ride' } });
    expect(screen.getByText('1 of 1 sessions')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sport'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
    expect(screen.getByText('1 of 1 sessions')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: 'all' } });
    fireEvent.click(screen.getByLabelText('Races only'));
    expect(screen.getByText('1 of 1 sessions')).toBeInTheDocument();
    expect(screen.getByText('Ultra')).toBeInTheDocument();
  });

  it('shows an error when the API fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    render(<Training />);
    expect(await screen.findByText(/Error: Failed to fetch training data/)).toBeInTheDocument();
  });

  it('filters sessions to a clicked bar, and clears on a second click or the chip', async () => {
    render(<Training />);
    await screen.findByText('3 of 3 sessions');
    const [older, newer] = screen.getAllByTestId('volume-bar'); // oldest first: weeks of 31 Aug and 7 Sep
    fireEvent.click(newer);
    expect(screen.getByText('1 of 1 sessions')).toBeInTheDocument();
    expect(screen.getByText(/week of 7 Sept? 2026/)).toBeInTheDocument();
    fireEvent.click(older);
    expect(screen.getByText('1 of 1 sessions')).toBeInTheDocument(); // the 1 Sep ride
    fireEvent.click(older);
    expect(screen.getByText('3 of 3 sessions')).toBeInTheDocument();
    fireEvent.click(newer);
    fireEvent.click(screen.getByLabelText('Clear period filter'));
    expect(screen.getByText('3 of 3 sessions')).toBeInTheDocument();
  });

  it('hides races from the chart and list when "Include races" is unticked', async () => {
    render(<Training />);
    await screen.findByText('3 of 3 sessions');
    expect(screen.getAllByTestId('volume-bar')).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Include races'));
    expect(screen.getAllByTestId('volume-bar')).toHaveLength(1); // the race=0 summary
    expect(screen.getByText('2 of 2 sessions')).toBeInTheDocument();
    expect(screen.queryByText('Race')).toBeNull();
    expect(screen.getByLabelText('Races only')).toBeDisabled();
  });

  it('opens the Strava race popup from a race session', async () => {
    render(<Training />);
    await screen.findByText('3 of 3 sessions');
    fireEvent.click(screen.getByText('Race').closest('tr')!);
    expect(await screen.findByRole('heading', { level: 2, name: 'Tor Des Geants' })).toBeInTheDocument();
    expect(screen.getByText('178/1118')).toBeInTheDocument();
    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByRole('heading', { level: 2, name: 'Tor Des Geants' })).toBeNull();
  });
});
