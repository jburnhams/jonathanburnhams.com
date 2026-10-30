import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './PhotoCarousel.css';
import { CarouselPhoto, PHOTOS_API, THUMB_WIDTH, slotsFor } from './carousel';

const PAGE = 20;
const INTERVAL_MS = 10000;

function newSeed(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

const formatDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

/**
 * A row of race photos from the strava-sync API in a random order (a new seed on
 * every page load). Shows as many whole thumbnails as fit; every 10 seconds one of
 * them changes to the next photo in the sequence, which only repeats after every
 * photo has been shown. Clicking a thumbnail opens it large; clicking that opens
 * the race on the Running page.
 */
function PhotoCarousel({ intervalMs = INTERVAL_MS, seed: fixedSeed }: { intervalMs?: number; seed?: string }) {
  const navigate = useNavigate();
  const seed = useRef(fixedSeed ?? newSeed()).current;
  const container = useRef<HTMLDivElement>(null);
  const queue = useRef<CarouselPhoto[]>([]); // every photo fetched so far, in sequence order
  const next = useRef(0); // index in queue of the next photo to show
  const fetching = useRef<Promise<void> | null>(null);
  const lastSlot = useRef(-1);
  const [slotCount, setSlotCount] = useState(0);
  const [slots, setSlots] = useState<CarouselPhoto[]>([]);
  const [open, setOpen] = useState<CarouselPhoto | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetch the next page of the sequence (one request at a time)
  const fetchMore = useCallback(() => {
    if (!fetching.current) {
      fetching.current = fetch(`${PHOTOS_API}?${new URLSearchParams({ seed, offset: String(queue.current.length), limit: String(PAGE) })}`)
        .then(res => (res.ok ? res.json() : Promise.reject(new Error('photos'))))
        .then((page: CarouselPhoto[]) => { queue.current.push(...page); })
        .catch(() => setFailed(true))
        .finally(() => { fetching.current = null; });
    }
    return fetching.current;
  }, [seed]);

  // Take the next photo, fetching more when fewer than a row's worth remain
  const take = useCallback(async (): Promise<CarouselPhoto | undefined> => {
    if (next.current >= queue.current.length) await fetchMore();
    const photo = queue.current[next.current];
    if (photo) next.current++;
    if (queue.current.length - next.current < Math.max(slotCount, 5)) void fetchMore();
    return photo;
  }, [fetchMore, slotCount]);

  // Number of slots from the width: on mount and whenever the container resizes
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => setSlotCount(slotsFor(el.clientWidth || window.innerWidth));
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Fill new slots when the row grows; drop the extra ones when it shrinks
  useEffect(() => {
    if (!slotCount) return;
    let cancelled = false;
    (async () => {
      const filled = slots.slice(0, slotCount);
      while (filled.length < slotCount) {
        const photo = await take();
        if (!photo) break;
        filled.push(photo);
      }
      if (!cancelled) setSlots(filled);
    })();
    return () => { cancelled = true; };
  }, [slotCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every interval, one slot (random, not the same as last time) changes to the next photo.
  // Paused while the tab is hidden or a photo is open.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden || open || slots.length === 0) return;
      let slot = Math.floor(Math.random() * slots.length);
      if (slots.length > 1 && slot === lastSlot.current) slot = (slot + 1) % slots.length;
      const photo = await take();
      if (!photo) return;
      lastSlot.current = slot;
      setSlots(current => current.map((p, i) => (i === slot ? photo : p)));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, open, slots.length, take]);

  // Esc closes the large photo
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (failed && slots.length === 0) return null;

  return (
    <div className="photo-carousel" ref={container} aria-label="Race photos">
      {slots.map((photo, i) => (
        <button
          key={i}
          type="button"
          className="photo-carousel-slot"
          onClick={() => setOpen(photo)}
          title={[photo.activity.name, formatDate(photo.activity.date)].filter(Boolean).join(', ')}
        >
          <img
            key={photo.id}
            className="photo-carousel-thumb"
            src={photo.thumb_url}
            alt={photo.caption || photo.activity.name || 'Race photo'}
            width={THUMB_WIDTH}
            height={Math.round((THUMB_WIDTH * 3) / 4)}
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
              onClick={() => navigate(`/running?activity=${open.activity.id}`)}
            />
            <figcaption>
              {open.caption && <span>{open.caption} · </span>}
              <button type="button" className="photo-carousel-race" onClick={() => navigate(`/running?activity=${open.activity.id}`)}>
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
