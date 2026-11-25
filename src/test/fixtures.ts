// Data the MSW handlers serve: two races (one with a page and photos), a short run that is not a
// race, a training log and the race-page slugs. Shaped like strava-sync's real responses.
import type { StravaActivityJSON } from '../models/Activity';
import type { TrainingActivity } from '../models/Training';

const run = (id: number, name: string, date: string, distance: number, moving: number, climb: number, extra: Partial<NonNullable<StravaActivityJSON['data_json']>> = {}): StravaActivityJSON => ({
  id, name, type: 'Run', start_date: `${date}T08:00:00Z`, distance, moving_time: moving, elapsed_time: moving, total_elevation_gain: climb,
  data_json: {
    id, name, type: 'Run', start_date_local: `${date}T10:00:00Z`, distance, moving_time: moving, elapsed_time: moving,
    total_elevation_gain: climb, average_speed: distance / moving,
    map: { summary_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
    ...extra,
  },
});

export const tor = run(20235667026, 'Tor Des Geants', '2026-09-13', 358700, 274720, 24388, {
  description: '178/1118',
  photos: [
    { id: '20235667026_0', width: 1200, height: 800, url: 'https://stravasync.jonathanburnhams.com/api/photos/20235667026_0', thumb_url: 'https://stravasync.jonathanburnhams.com/api/photos/20235667026_0?size=thumb', caption: 'Col Malatrà' },
  ],
});
export const capeWrath = run(7230974312, 'Cape Wrath Ultra 2022', '2022-05-22', 400000, 300000, 11000);
export const parkrun = run(111, 'Parkrun', '2026-10-01', 5000, 1200, 20);

export const activities: StravaActivityJSON[] = [tor, capeWrath, parkrun];
export const racePages: Record<string, string> = { [tor.id]: '2026-tor-des-geants', [capeWrath.id]: '2022-cape-wrath-ultra-2022' };

export const TODAY = '2026-10-29';

// Sessions on the server (newest first, as the API orders them)
export const sessions: TrainingActivity[] = [
  { date: '2026-09-13', sport: 'ultra_run', distance: 358700, moving_time: 274720, elapsed_time: 433935, elevation_gain: 24388, race: 1, race_activity_id: 20235667026 },
  { date: '2026-09-01', sport: 'ride', distance: 30000, moving_time: 3600, elapsed_time: 3700, elevation_gain: 200, race: 0, race_activity_id: null },
  ...Array.from({ length: 60 }, (_, i): TrainingActivity => ({
    date: `2026-08-${String(30 - Math.floor(i / 2)).padStart(2, '0')}`, sport: 'run', distance: 5000 + i, moving_time: 1500,
    elapsed_time: 1500, elevation_gain: 10, race: 0, race_activity_id: null,
  })),
  { date: '2025-05-01', sport: 'swim', distance: 2000, moving_time: 2400, elapsed_time: 2500, elevation_gain: null, race: 0, race_activity_id: null },
];
// Weekly totals on the server, split into race and training rows
export const weekly = [
  { week: '2026-09-07', sport: 'ultra_run', race: 1, count: 1, distance: 358700, moving_time: 274720, elevation_gain: 24388 },
  { week: '2026-08-31', sport: 'ride', race: 0, count: 4, distance: 50000, moving_time: 7000, elevation_gain: 300 },
  { week: '2026-08-24', sport: 'run', race: 0, count: 14, distance: 70000, moving_time: 21000, elevation_gain: 140 },
  { week: '2025-04-28', sport: 'swim', race: 0, count: 1, distance: 2000, moving_time: 2400, elevation_gain: 0 },
];
