import { formatDate } from '../utils/dateFormatter';
import mapboxPolyline from '@mapbox/polyline';

export type UnitSystem = 'metric' | 'imperial';

export interface ActivityPhoto {
  id: string;
  width: number;
  height: number;
  caption?: string;
  url: string; // ~1200 px
  thumb_url: string; // ~400 px wide
}

export interface StravaActivityJSON {
  id: number;
  name: string;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed?: number; // Sometimes top level
  data_json?: {
    id: number;
    name: string;
    type: string;
    start_date_local: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    average_speed: number;
    map?: {
      summary_polyline: string;
    };
    description?: string;
    photos?: ActivityPhoto[];
    [key: string]: any;
  };
  [key: string]: any;
}

export class Activity {
  id: number;
  name: string;
  type: string;
  startDate: Date;
  distance: number; // meters
  movingTime: number; // seconds
  elapsedTime: number; // seconds
  elevationGain: number; // meters
  averageSpeed: number; // m/s
  polyline: [number, number][]; // [lat, lng][]
  description: string;
  photos: ActivityPhoto[];

  constructor(data: StravaActivityJSON) {
    // Prefer data from data_json if available, as it seems richer based on user provided sample
    // Otherwise fall back to top level
    const details = data.data_json || {
        id: undefined,
        name: undefined,
        type: undefined,
        start_date_local: undefined,
        distance: undefined,
        moving_time: undefined,
        elapsed_time: undefined,
        total_elevation_gain: undefined,
        average_speed: undefined,
        map: undefined,
        description: undefined,
        photos: undefined
    };

    this.id = details.id || data.id;
    this.name = details.name || data.name;
    this.type = details.type || data.type;
    this.startDate = new Date(details.start_date_local || data.start_date);
    this.distance = details.distance ?? data.distance;
    this.movingTime = details.moving_time ?? data.moving_time;
    this.elapsedTime = details.elapsed_time ?? data.elapsed_time;
    this.elevationGain = details.total_elevation_gain ?? data.total_elevation_gain;
    this.averageSpeed = details.average_speed ?? data.average_speed ?? 0;

    this.description = (details.description ?? '').trim();
    this.photos = Array.isArray(details.photos) ? details.photos.filter(p => p && p.url && p.thumb_url) : [];

    const summaryPolyline = details.map?.summary_polyline;
    if (summaryPolyline) {
      this.polyline = mapboxPolyline.decode(summaryPolyline);
    } else {
      this.polyline = [];
    }
  }

  // First and last points of the summary polyline (Strava's privacy zones are
  // already trimmed off it); null when there is no route. Within 50 m counts as a loop.
  get startFinish(): { start: [number, number]; finish: [number, number]; loop: boolean } | null {
    if (this.polyline.length === 0) return null;
    const start = this.polyline[0];
    const finish = this.polyline[this.polyline.length - 1];
    return { start, finish, loop: distanceMeters(start, finish) <= 50 };
  }

  // `count` points evenly spaced by distance along the route (ends skipped), each with the
  // direction of travel there in degrees clockwise from north. The direction is smoothed: it is
  // the bearing from a point `window` of the spacing before to one the same distance after, so
  // GPS jitter and tight bends don't make a marker point off at an angle.
  directionArrows(count = 5, window = 0.4): { position: [number, number]; bearing: number }[] {
    const pts = this.polyline;
    if (pts.length < 2) return [];
    const cumulative = [0];
    for (let i = 1; i < pts.length; i++) cumulative.push(cumulative[i - 1] + distanceMeters(pts[i - 1], pts[i]));
    const total = cumulative[cumulative.length - 1];
    if (total === 0) return [];
    // The point `d` metres along the route
    const pointAt = (d: number): [number, number] => {
      const dist = Math.min(Math.max(d, 0), total);
      let lo = 1, hi = pts.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cumulative[mid] < dist) lo = mid + 1; else hi = mid; }
      const [p, q] = [pts[lo - 1], pts[lo]];
      const t = (dist - cumulative[lo - 1]) / ((cumulative[lo] - cumulative[lo - 1]) || 1);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const spacing = total / (count + 1);
    const half = spacing * window;
    return Array.from({ length: count }, (_, i) => {
      const target = spacing * (i + 1);
      return { position: pointAt(target), bearing: bearingDegrees(pointAt(target - half), pointAt(target + half)) };
    });
  }

  getFormattedDistance(system: UnitSystem = 'metric'): string {
    if (system === 'imperial') {
      const miles = this.distance * 0.000621371;
      return miles.toFixed(2) + ' mi';
    }
    return (this.distance / 1000).toFixed(2) + ' km';
  }

  get formattedDistance(): string {
    return this.getFormattedDistance('metric');
  }

  get formattedMovingTime(): string {
    const hours = Math.floor(this.movingTime / 3600);
    const minutes = Math.floor((this.movingTime % 3600) / 60);
    const seconds = this.movingTime % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getFormattedPace(system: UnitSystem = 'metric'): string {
    if (this.averageSpeed === 0) return system === 'imperial' ? '0:00 /mi' : '0:00 /km';

    let secondsPerUnit;
    if (system === 'imperial') {
      // 1 mile = 1609.344 meters
      secondsPerUnit = 1609.344 / this.averageSpeed;
    } else {
      secondsPerUnit = 1000 / this.averageSpeed;
    }

    const minutes = Math.floor(secondsPerUnit / 60);
    const seconds = Math.floor(secondsPerUnit % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /${system === 'imperial' ? 'mi' : 'km'}`;
  }

  get formattedPace(): string {
    return this.getFormattedPace('metric');
  }

  getFormattedElevation(system: UnitSystem = 'metric'): string {
    if (system === 'imperial') {
      const feet = this.elevationGain * 3.28084;
      return Math.round(feet) + ' ft';
    }
    return Math.round(this.elevationGain) + ' m';
  }

  get formattedDate(): string {
    return formatDate(this.startDate);
  }
}

// Haversine distance between two [lat, lng] points
export function distanceMeters([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

// Direction from a to b on the map, degrees clockwise from north (flat approximation, fine between neighbouring points)
export function bearingDegrees([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const dx = (lng2 - lng1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const dy = lat2 - lat1;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}
