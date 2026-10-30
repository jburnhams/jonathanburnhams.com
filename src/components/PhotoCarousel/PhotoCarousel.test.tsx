import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import PhotoCarousel from './PhotoCarousel';
import { PHOTOS_API, slotsFor, CarouselPhoto } from './carousel';

// The API's sequence for a seed: photo n is "p<n>", any offset
const photo = (n: number): CarouselPhoto => ({
  id: `1_${n}`, width: 1200, height: 800, url: `https://x/api/photos/1_${n}`, thumb_url: `https://x/api/photos/1_${n}?size=thumb`,
  activity: { id: 100 + (n % 3), name: `Race ${n % 3}`, date: '2026-09-13' },
});
let pageSize = 20;
const requests: URLSearchParams[] = [];

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

// As on the homepage: opening a photo's race navigates to /running?activity=<id>
function HomeCarousel({ intervalMs }: { intervalMs: number }) {
  const navigate = useNavigate();
  return <PhotoCarousel intervalMs={intervalMs} seed="test-seed" onOpenActivity={id => navigate(`/running?activity=${id}`)} />;
}

function renderCarousel(intervalMs = 40) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeCarousel intervalMs={intervalMs} />} />
        <Route path="/running" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}
const thumbs = () => screen.getAllByRole('img').map(img => img.getAttribute('src'));

describe('PhotoCarousel', () => {
  beforeEach(() => {
    pageSize = 20;
    requests.length = 0;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 520 }); // jsdom has no layout: falls back to this
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    global.fetch = vi.fn(async (url: string) => {
      const u = new URL(url);
      expect(u.origin + u.pathname).toBe(PHOTOS_API);
      requests.push(u.searchParams);
      const offset = Number(u.searchParams.get('offset'));
      return { ok: true, json: async () => Array.from({ length: pageSize }, (_, i) => photo(offset + i)) };
    }) as unknown as typeof fetch;
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('fits only whole thumbnails', () => {
    expect(slotsFor(160)).toBe(1);
    expect(slotsFor(327)).toBe(1);
    expect(slotsFor(328)).toBe(2);
    expect(slotsFor(520)).toBe(3);
    expect(slotsFor(0)).toBe(1);
  });

  it('shows as many photos as fit, from the seeded sequence', async () => {
    renderCarousel(60000);
    await waitFor(() => expect(thumbs()).toHaveLength(3));
    expect(thumbs()).toEqual(['https://x/api/photos/1_0?size=thumb', 'https://x/api/photos/1_1?size=thumb', 'https://x/api/photos/1_2?size=thumb']);
    expect(requests[0].get('seed')).toBe('test-seed');
    expect(requests[0].get('offset')).toBe('0');
    expect(requests[0].get('limit')).toBe('20');
  });

  it('replaces one thumbnail at a time with the next photo', async () => {
    renderCarousel(40);
    await waitFor(() => expect(thumbs()).toHaveLength(3));
    const before = thumbs();
    await waitFor(() => expect(thumbs()).toContain('https://x/api/photos/1_3?size=thumb'));
    const after = thumbs();
    expect(after.filter((src, i) => src !== before[i])).toHaveLength(1); // exactly one slot changed
    await waitFor(() => expect(thumbs()).toContain('https://x/api/photos/1_4?size=thumb'));
  });

  it('fetches the next page before running out', async () => {
    pageSize = 6;
    renderCarousel(20);
    await waitFor(() => expect(requests.map(r => r.get('offset'))).toEqual(['0', '6']));
    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(3));
    expect(requests[2].get('offset')).toBe('12');
    expect(new Set(requests.map(r => r.get('seed')))).toEqual(new Set(['test-seed']));
  });

  it('pauses while the tab is hidden', async () => {
    renderCarousel(30);
    await waitFor(() => expect(thumbs()).toHaveLength(3));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const before = thumbs();
    await act(() => new Promise(r => setTimeout(r, 150)));
    expect(thumbs()).toEqual(before);
  });

  it('opens a photo large, closes with ×, Esc or the backdrop, and the photo links to its race', async () => {
    renderCarousel(60000);
    await waitFor(() => expect(thumbs()).toHaveLength(3));
    fireEvent.click(screen.getAllByRole('button')[1]);
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('img')!.getAttribute('src')).toBe('https://x/api/photos/1_1');
    expect(screen.getByText('Race 1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getAllByRole('button')[1]);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getAllByRole('button')[1]);
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getAllByRole('button')[1]);
    fireEvent.click(screen.getByRole('dialog').querySelector('img')!);
    expect(screen.getByTestId('where').textContent).toBe('/running?activity=101');
  });

  it('shows nothing if the photos cannot be fetched', async () => {
    global.fetch = vi.fn(async () => ({ ok: false })) as unknown as typeof fetch;
    const { container } = renderCarousel();
    await waitFor(() => expect(container.querySelector('.photo-carousel')).toBeNull());
  });

  it('skips anything in the response that is not a complete photo', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => [{ id: 1, name: 'not a photo' }, photo(0), photo(1), photo(2)] })) as unknown as typeof fetch;
    renderCarousel(60000);
    await waitFor(() => expect(thumbs()).toHaveLength(3));
    expect(thumbs()[0]).toBe('https://x/api/photos/1_0?size=thumb');
  });
});
