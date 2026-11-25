// Every activity strava-sync serves (races and photos come from Jonathan's Strava export), read
// once per visit and shared by the Running, race and Training pages (TanStack Query, through
// strata-react's useLoad).
import { fetchJson, useLoad } from 'strata-react';
import { Activity, type StravaActivityJSON } from '../models/Activity';

export const ACTIVITIES_API = 'https://stravasync.jonathanburnhams.com/api/users/7828229/activities';

/** Runs over 20 km: the ones that get a race page (scripts/race-pages.mjs uses the same rule). */
export const isRace = (a: Activity) => a.type === 'Run' && a.distance > 20000;

export function useActivities() {
  return useLoad({
    queryKey: ['activities'],
    queryFn: async () => (await fetchJson<StravaActivityJSON[]>(ACTIVITIES_API)).map(item => new Activity(item)),
    staleTime: 10 * 60 * 1000,
    describeError: () => 'The race list could not be read from strava-sync. Try again in a minute.',
  });
}
