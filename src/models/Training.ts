// Anonymised training data from the strava-sync API (/api/training/*), published
// from Garmin with identifying details removed: day, sport and totals only.

export const TRAINING_API = 'https://stravasync.jonathanburnhams.com/api/training';

export interface TrainingActivity {
  date: string; // local day, YYYY-MM-DD
  sport: string;
  distance: number | null; // metres
  moving_time: number | null; // seconds
  elapsed_time: number | null;
  elevation_gain: number | null; // metres
  race?: number; // 1 when it was (part of) a race
  race_activity_id?: number | null; // that race's Strava activity id (strava-sync /api/users/:id/activities)
}

export interface TrainingPeriod {
  period: string; // YYYY-MM-DD (week's Monday), YYYY-MM or YYYY
  sport: string;
  count: number;
  distance: number | null;
  moving_time: number | null;
  elevation_gain: number | null;
}

export type Period = 'week' | 'month' | 'year';

// The API's sports, grouped for charts and filters
export const SPORT_GROUPS: { key: string; label: string; color: string; sports: string[] }[] = [
  { key: 'run', label: 'Run', color: '#e8590c', sports: ['run', 'trail_run', 'ultra_run', 'treadmill_run'] },
  { key: 'ride', label: 'Ride', color: '#1c7ed6', sports: ['ride', 'indoor_ride'] },
  { key: 'swim', label: 'Swim', color: '#12b886', sports: ['swim', 'open_water_swim'] },
  { key: 'hike', label: 'Hike / Walk', color: '#ae3ec9', sports: ['hike', 'walk'] },
  { key: 'other', label: 'Other', color: '#868e96', sports: [] },
];

export function sportGroup(sport: string) {
  return SPORT_GROUPS.find(g => g.sports.includes(sport)) ?? SPORT_GROUPS[SPORT_GROUPS.length - 1];
}

const SPORT_LABELS: Record<string, string> = {
  run: 'Run', trail_run: 'Trail run', ultra_run: 'Ultra', treadmill_run: 'Treadmill',
  ride: 'Ride', indoor_ride: 'Indoor ride', swim: 'Swim', open_water_swim: 'Open water',
  hike: 'Hike', walk: 'Walk', other: 'Other',
};

export function sportLabel(sport: string): string {
  return SPORT_LABELS[sport] ?? sport.replace(/_/g, ' ');
}

export interface PeriodTotals {
  period: string;
  byGroup: Record<string, { count: number; distance: number; moving_time: number; elevation_gain: number }>;
}

// Rows per (period, sport) -> one entry per period with totals per sport group, newest first.
export function totalsByPeriod(rows: TrainingPeriod[]): PeriodTotals[] {
  const map = new Map<string, PeriodTotals>();
  for (const r of rows) {
    const p = map.get(r.period) ?? { period: r.period, byGroup: {} };
    const g = (p.byGroup[sportGroup(r.sport).key] ??= { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 });
    g.count += r.count;
    g.distance += r.distance ?? 0;
    g.moving_time += r.moving_time ?? 0;
    g.elevation_gain += r.elevation_gain ?? 0;
    map.set(r.period, p);
  }
  return [...map.values()].sort((a, b) => b.period.localeCompare(a.period));
}

export function formatKm(metres: number | null): string {
  return metres == null ? '–' : `${(metres / 1000).toFixed(metres >= 100000 ? 0 : 1)} km`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

// Pace for runs and hikes, speed for rides, per 100 m for swims
export function formatPace(a: TrainingActivity): string {
  if (!a.distance || !a.moving_time) return '–';
  const group = sportGroup(a.sport).key;
  if (group === 'ride') return `${((a.distance / a.moving_time) * 3.6).toFixed(1)} km/h`;
  const per = group === 'swim' ? 100 : 1000;
  const s = Math.round((a.moving_time / a.distance) * per);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')} /${group === 'swim' ? '100m' : 'km'}`;
}

// Whether a day (YYYY-MM-DD) falls in a chart period: a week (its Monday), a month (YYYY-MM) or a year
export function inPeriod(day: string, kind: Period, period: string): boolean {
  if (kind !== 'week') return day.startsWith(period);
  const start = Date.parse(`${period}T00:00:00Z`);
  const t = Date.parse(`${day}T00:00:00Z`);
  return t >= start && t < start + 7 * 86400000;
}

export function periodLabel(period: string, kind: Period, long = false): string {
  if (kind === 'year') return period;
  if (kind === 'month' && long) return new Date(`${period}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const d = new Date(kind === 'month' ? `${period}-01T00:00:00Z` : `${period}T00:00:00Z`);
  return kind === 'month'
    ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    : long
    ? `week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
