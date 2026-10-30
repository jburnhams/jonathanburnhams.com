
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Running from '../pages/Running';

// Mock react-leaflet
vi.mock('react-leaflet', () => {
  const MockMapContainer = ({ children, bounds }: { children: React.ReactNode, bounds?: any }) => (
    <div data-testid="map-container" data-bounds={JSON.stringify(bounds)}>
      {children}
    </div>
  );

  const MockPolyline = ({ eventHandlers }: { eventHandlers?: any }) => (
    <div
      data-testid="polyline"
      onClick={eventHandlers?.click}
    />
  );

  return {
    MapContainer: MockMapContainer,
    TileLayer: () => <div data-testid="tile-layer" />,
    Polyline: MockPolyline,
    CircleMarker: ({ children, center }: { children?: React.ReactNode, center: [number, number] }) => (
      <div data-testid="circle-marker" data-center={JSON.stringify(center)}>{children}</div>
    ),
    Marker: ({ icon }: { icon?: { options?: { className?: string } } }) => <div data-testid={icon?.options?.className ?? 'marker'} />,
    Tooltip: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
    useMap: () => ({
      fitBounds: vi.fn(),
    }),
  };
});

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
      distance: 25000,
      moving_time: 7200,
      total_elevation_gain: 50,
      average_speed: 2.77,
      data_json: {
        id: 1,
        name: 'Test Run 1',
        type: 'Run',
        start_date_local: '2023-01-01T10:00:00Z',
        distance: 25000,
        moving_time: 7200,
        total_elevation_gain: 50,
        average_speed: 2.77,
        map: { summary_polyline: 'encoded_polyline' } // This will be decoded by mapboxPolyline
      }
    },
    {
      id: 2,
      name: 'Test Run 2',
      type: 'Run',
      start_date: '2023-01-02T10:00:00Z',
      distance: 30000,
      moving_time: 9000,
      total_elevation_gain: 100,
      average_speed: 2.77,
      data_json: {
        id: 2,
        name: 'Test Run 2',
        type: 'Run',
        start_date_local: '2023-01-02T10:00:00Z',
        distance: 30000,
        moving_time: 9000,
        total_elevation_gain: 100,
        average_speed: 2.77,
        map: { summary_polyline: 'encoded_polyline_2' }
      }
    }
  ];

  // We need to mock mapboxPolyline.decode since it's used in Activity constructor
  vi.mock('@mapbox/polyline', () => ({
    default: {
      decode: () => [[0, 0], [1, 1]] // Mock decoding to some points
    }
  }));

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

    expect(screen.getByText('25.00 km')).toBeInTheDocument();
  });

  it('renders the all-activities map', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockActivities,
    });

    render(<Running />);

    await waitFor(() => {
        const maps = screen.getAllByTestId('map-container');
        expect(maps.length).toBeGreaterThan(0);
    });
  });

  it('renders polylines for each activity on the main map', async () => {
     (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockActivities,
    });

    render(<Running />);

    await waitFor(() => {
       const polylines = screen.getAllByTestId('polyline');
       // Assuming 2 activities, so 2 polylines on the main map.
       expect(polylines).toHaveLength(2);
    });
  });

  it('opens modal when clicking a polyline', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockActivities,
    });

    render(<Running />);

    await waitFor(() => {
       expect(screen.getAllByTestId('polyline').length).toBe(2);
    });

    const polylines = screen.getAllByTestId('polyline');

    // Click the first polyline
    fireEvent.click(polylines[0]);

    await waitFor(() => {
       // Check for modal overlay
       const modalOverlay = screen.getByText('×'); // Close button is a good indicator
       expect(modalOverlay).toBeInTheDocument();

       // Check that the modal title matches the activity name
       // Note: mockActivities[0] is 'Test Run 1' but activities are sorted by date descending in the component
       // 'Test Run 2' is newer (02/01/2023) than 'Test Run 1' (01/01/2023).
       // So activities[0] in render loop (and thus polylines[0]) should correspond to 'Test Run 2'.
       expect(screen.getByRole('heading', { level: 2, name: 'Test Run 2' })).toBeInTheDocument();
    });
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

  it('shows the description and photos in the modal, and opens a photo large', async () => {
    const withPhotos = [{
      ...mockActivities[0],
      data_json: {
        ...mockActivities[0].data_json,
        description: 'Great day\n<b>not bold</b>',
        photos: [{ id: '1_0', width: 1200, height: 800, url: 'https://x/api/photos/1_0', thumb_url: 'https://x/api/photos/1_0?size=thumb' }],
      },
    }];
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => withPhotos });

    render(<Running />);
    fireEvent.click(await screen.findByText('Test Run 1'));

    const description = await screen.findByText(/Great day/);
    expect(description.textContent).toBe('Great day\n<b>not bold</b>'); // text, not HTML
    expect(description.querySelector('b')).toBeNull();

    const thumb = screen.getByRole('img', { name: 'Test Run 1' });
    expect(thumb).toHaveAttribute('src', 'https://x/api/photos/1_0?size=thumb');
    expect(thumb).toHaveAttribute('loading', 'lazy');

    fireEvent.click(thumb);
    const large = screen.getAllByRole('img', { name: 'Test Run 1' }).find(img => img.getAttribute('src') === 'https://x/api/photos/1_0');
    expect(large).toBeDefined();
  });

  it('marks the start and finish on the activity map', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => mockActivities });
    render(<Running />);
    fireEvent.click(await screen.findByText('Test Run 1'));
    // mapbox polyline decodes the mock strings to distinct points, so this is not a loop
    await screen.findByText('Start');
    expect(screen.getByText('Finish')).toBeInTheDocument();
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2);
    expect(screen.getAllByTestId('route-arrow')).toHaveLength(5);
  });

  it('opens the activity named in ?activity= (a link from a homepage photo)', async () => {
    window.history.pushState({}, '', '/running?activity=2');
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => mockActivities });
    render(<Running />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Test Run 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('×'));
    expect(window.location.search).toBe(''); // closing drops the parameter
    window.history.pushState({}, '', '/');
  });

  it('shows race photos under the title, and a photo opens its race in place', async () => {
    const photo = { id: '2_0', width: 1200, height: 800, url: 'https://x/api/photos/2_0', thumb_url: 'https://x/api/photos/2_0?size=thumb',
      activity: { id: 2, name: 'Test Run 2', date: '2023-01-02' } };
    (global.fetch as any).mockImplementation(async (url: string) => ({
      ok: true, json: async () => (url.includes('/api/photos/random') ? [photo] : mockActivities),
    }));
    render(<Running />);
    await screen.findByText('Test Run 1');
    const [thumb] = await screen.findAllByRole('img', { name: 'Test Run 2' });
    expect(thumb).toHaveAttribute('src', 'https://x/api/photos/2_0?size=thumb');
    expect(thumb.closest('.photo-carousel')!.compareDocumentPosition(screen.getAllByTestId('map-container')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // above the map
    fireEvent.click(thumb);
    fireEvent.click(screen.getByRole('dialog').querySelector('img')!);
    expect(await screen.findByRole('heading', { level: 2, name: 'Test Run 2' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/'); // no navigation
  });
});
