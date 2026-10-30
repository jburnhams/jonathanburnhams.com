import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RacePage from '../pages/RacePage';
import { clearRacePagesCache } from '../utils/racePages';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Marker: () => null,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const tor = {
  id: 20235667026, name: 'Tor Des Geants', type: 'Run', start_date: '2026-09-13T08:01:00Z', distance: 358700,
  moving_time: 274720, elapsed_time: 433935, total_elevation_gain: 24388,
  data_json: { id: 20235667026, name: 'Tor Des Geants', type: 'Run', start_date_local: '2026-09-13T10:01:00Z', distance: 358700,
    moving_time: 274720, elapsed_time: 433935, total_elevation_gain: 24388, average_speed: 1.3, description: '178/1118',
    photos: [{ id: 'p', width: 1200, height: 800, url: 'https://x/p', thumb_url: 'https://x/p?size=thumb' }] },
};

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/running/:slug" element={<RacePage />} /><Route path="/running" element={<p>runs list</p>} /></Routes>
  </MemoryRouter>
);

describe('RacePage', () => {
  beforeEach(() => { clearRacePagesCache(); global.fetch = vi.fn(); });
  afterEach(() => { delete window.__RACE__; });

  it('renders the race embedded in its static page, without fetching', async () => {
    window.__RACE__ = { slug: '2026-tor-des-geants', activity: tor };
    renderAt('/running/2026-tor-des-geants');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tor Des Geants' })).toBeInTheDocument();
    expect(screen.getByText('178/1118')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tor Des Geants' })).toHaveAttribute('src', 'https://x/p?size=thumb');
    expect(screen.getByRole('link', { name: '← All runs' })).toHaveAttribute('href', '/running');
    expect(document.title).toBe('Tor Des Geants (2026) | Jonathan Burnhams');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('looks the race up by slug when the data is not embedded', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => ({
      ok: true, json: async () => (url === '/race-pages.json' ? { 20235667026: '2026-tor-des-geants' } : [tor]),
    }));
    renderAt('/running/2026-tor-des-geants');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tor Des Geants' })).toBeInTheDocument();
  });

  it('says so for an unknown race', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });
    renderAt('/running/1999-nothing');
    expect(await screen.findByRole('heading', { name: 'Race not found' })).toBeInTheDocument();
  });
});
