// Strava activity id -> race page slug, written by scripts/build-race-pages.mjs at build time.
// Missing (dev server, or the API was down at build time) means no race pages: names are then plain text.
import { useLoad } from 'strata-react';

let cache: Promise<Record<string, string>> | null = null;

export function getRacePages(): Promise<Record<string, string>> {
  cache ??= Promise.resolve()
    .then(() => fetch('/race-pages.json'))
    .then(res => (res?.ok ? res.json() : {}))
    .then(data => (data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, string>) : {}))
    .catch(() => ({}));
  return cache;
}

export const racePageUrl = (slug: string) => `/running/${slug}/`;

export function clearRacePagesCache() {
  cache = null;
}

/** The slugs as a load (never fails: no file means no race pages). */
export function useRacePages() {
  const load = useLoad({ queryKey: ['race-pages'], queryFn: getRacePages, staleTime: Infinity });
  return load.status === 'ready' ? load.data : {};
}
