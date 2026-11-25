// What the Running and race pages share: the map tiles and the Running page's finding.
import { format } from 'strata-react';
import type { Activity } from '../models/Activity';

/** OpenStreetMap's standard tiles, with the attribution its tile policy requires. */
export const TILES = {
  light: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

/** "N races over 20 km since YEAR: total distance and climbing. The longest was …" */
export function raceFinding(races: Activity[]): string | null {
  if (!races.length) return null;
  const km = races.reduce((s, a) => s + a.distance, 0);
  const climb = races.reduce((s, a) => s + a.elevationGain, 0);
  const first = Math.min(...races.map(a => a.startDate.getFullYear()));
  const longest = races.reduce((l, a) => (a.distance > l.distance ? a : l));
  return `${format.count(races.length, 'race')} over 20\u00a0km since ${first}: ${format.distance(km)} and ${format.integer(Math.round(climb))}\u00a0m of climbing. The longest was ${longest.name}, ${format.distance(longest.distance)}.`;
}

