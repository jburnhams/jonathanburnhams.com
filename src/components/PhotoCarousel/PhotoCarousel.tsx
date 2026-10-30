import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './PhotoCarousel.css';
import { CarouselPhoto, PHOTOS_API, ROW_HEIGHT, fitsAtEnd, swapIn, thumbWidth, trimToFit } from './carousel';

const PAGE = 20;
const INTERVAL_MS = 10000;

function newSeed(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

const formatDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

/**
 * A row of race photos from the strava-sync API in a random order (a new seed on
 * every page load), all 250 px tall at their own shape, as many whole ones as fit.
 * Every 10 seconds one of them changes to the next photo in the sequence, which only
 * repeats after every photo has been shown: it goes into a slot where it fits, so the
 * row keeps its length; if it fits nowhere, thumbnails at the end make room. Clicking a thumbnail opens it large; clicking that calls
 * onOpenActivity with the photo's Strava activity id (the homepage navigates to
 * /running?activity=<id>, the Running page opens the race's popup in place).
 */
function PhotoCarousel({ onOpenActivity, intervalMs = INTERVAL_MS, seed: fixedSeed, className = '' }: {
  onOpenActivity: (activityId: number) => void; intervalMs?: number; seed?: string; className?: string;
}) {
  const seed = useRef(fixedSeed ?? newSeed()).current;
  const container = useRef<HTMLDivElement>(null);
  const queue = useRef<CarouselPhoto[]>([]); // every photo fetched so far, in sequence order
  const next = useRef(0); // index in queue of the next photo to show
  const fetching = useRef<Promise<void> | null>(null);
  const lastSlot = useRef(-1);
  const [width, setWidth] = useState(0);
  const [slots, setSlots] = useState<CarouselPhoto[]>([]);
  const [open, setOpen] = useState<CarouselPhoto | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetch the next page of the sequence (one request at a time)
  const fetchMore = useCallback(() => {
    if (!fetching.current) {
      const url = `${PHOTOS_API}?${new URLSearchParams({ seed, offset: String(queue.current.length), limit: String(PAGE) })}`;
      fetching.current = Promise.resolve()
        .then(() => fetch(url))
        .then(res => (res?.ok ? res.json() : Promise.reject(new Error('photos'))))
        .then((page: CarouselPhoto[]) => {
          queue.current.push(...(Array.isArray(page) ? page : []).filter(p => p && p.url && p.thumb_url && p.activity));
        })
        .catch(() => setFailed(true))
        .finally(() => { fetching.current = null; });
    }
    return fetching.current;
  }, [seed]);

  // The next photo in the sequence without taking it (fetching more when needed)
  const peek = useCallback(async (): Promise<CarouselPhoto | undefined> => {
    if (next.current >= queue.current.length) await fetchMore();
    if (queue.current.length - next.current < 10) void fetchMore();
    return queue.current[next.current];
  }, [fetchMore]);

  // The row's width: on mount and whenever the container resizes
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || window.innerWidth);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Fit the row to the width: drop thumbnails from the end, or add the next photos while they fit
  const fill = useCallback(async (row: CarouselPhoto[]) => {
    const out = trimToFit(row, width);
    for (;;) {
      const photo = await peek();
      if (!photo || !fitsAtEnd(out, photo, width)) break;
      out.push(photo);
      next.current++;
    }
    return out;
  }, [peek, width]);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    fill(slots).then(row => { if (!cancelled) setSlots(row); });
    return () => { cancelled = true; };
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every interval the next photo replaces one thumbnail (random, not the one changed last).
  // Paused while the tab is hidden or a photo is open.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden || open || slots.length === 0 || !width) return;
      const photo = await peek();
      if (!photo) return;
      next.current++;
      const { row, slot } = swapIn(slots, photo, width, Math.random, lastSlot.current);
      lastSlot.current = slot;
      setSlots(row.length < slots.length ? await fill(row) : row);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, open, slots, width, peek, fill]);

  // Esc closes the large photo
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openRace = (photo: CarouselPhoto) => { setOpen(null); onOpenActivity(photo.activity.id); };

  if (failed && slots.length === 0) return null;

  return (
    <div className={`photo-carousel ${className}`.trim()} ref={container} aria-label="Race photos">
      {slots.map((photo, i) => (
        <button
          key={i}
          type="button"
          style={{ width: thumbWidth(photo) }}
          className="photo-carousel-slot"
          onClick={() => setOpen(photo)}
          title={[photo.activity.name, formatDate(photo.activity.date)].filter(Boolean).join(', ')}
        >
          <img
            key={photo.id}
            className="photo-carousel-thumb"
            src={photo.thumb_url}
            alt={photo.caption || photo.activity.name || 'Race photo'}
            width={thumbWidth(photo)}
            height={ROW_HEIGHT}
          />
        </button>
      ))}

      {/* Portalled to <body>: the hero's animations use transforms, which would trap position: fixed */}
      {open && createPortal(
        <div className="photo-carousel-modal" role="dialog" aria-label={open.activity.name ?? 'Photo'} onClick={() => setOpen(null)}>
          <button className="photo-carousel-close" aria-label="Close" onClick={() => setOpen(null)}>×</button>
          <figure onClick={e => e.stopPropagation()}>
            <img
              src={open.url}
              alt={open.caption || open.activity.name || 'Race photo'}
              title="Open the race"
              onClick={() => openRace(open)}
            />
            <figcaption>
              {open.caption && <span>{open.caption} · </span>}
              <button type="button" className="photo-carousel-race" onClick={() => openRace(open)}>
                {open.activity.name}
              </button>
              {open.activity.date && <span> · {formatDate(open.activity.date)}</span>}
            </figcaption>
          </figure>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PhotoCarousel;
