// Strava activity id -> race page slug, written by scripts/build-race-pages.mjs at build time.
// Missing (dev server, or the API was down at build time) means no race pages: callers fall back to the popup.
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
