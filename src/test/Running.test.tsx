// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Running from '../pages/Running';

// Mock fetch
global.fetch = vi.fn();

describe('Running Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActivities = [
    {
      id: 1,
      name: 'Test Run 1',
      type: 'Run',
      start_date: '2023-01-01T10:00:00Z',
      distance: 5000,
      moving_time: 1800,
      total_elevation_gain: 50,
      average_speed: 2.77,
      data_json: {
        id: 1,
        name: 'Test Run 1',
        type: 'Run',
        start_date_local: '2023-01-01T10:00:00Z',
        distance: 5000,
        moving_time: 1800,
        total_elevation_gain: 50,
        average_speed: 2.77,
        map: { summary_polyline: 'encoded_polyline' }
      }
    }
  ];

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {})); // Never resolves
    render(<Running />);
    expect(screen.getByText(/Loading activities/i)).toBeInTheDocument();
  });

  it('renders activities table after fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockActivities,
    });

    render(<Running />);

    await waitFor(() => {
      expect(screen.getByText('Test Run 1')).toBeInTheDocument();
    });

    expect(screen.getByText('5.00 km')).toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<Running />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });
});
