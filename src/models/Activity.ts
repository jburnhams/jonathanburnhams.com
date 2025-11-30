import mapboxPolyline from '@mapbox/polyline';

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

  constructor(data: StravaActivityJSON) {
    // Prefer data from data_json if available, as it seems richer based on user provided sample
    // Otherwise fall back to top level
    const details = data.data_json || {};

    this.id = details.id || data.id;
    this.name = details.name || data.name;
    this.type = details.type || data.type;
    this.startDate = new Date(details.start_date_local || data.start_date);
    this.distance = details.distance ?? data.distance;
    this.movingTime = details.moving_time ?? data.moving_time;
    this.elapsedTime = details.elapsed_time ?? data.elapsed_time;
    this.elevationGain = details.total_elevation_gain ?? data.total_elevation_gain;
    this.averageSpeed = details.average_speed ?? data.average_speed ?? 0;

    const summaryPolyline = details.map?.summary_polyline;
    if (summaryPolyline) {
      this.polyline = mapboxPolyline.decode(summaryPolyline);
    } else {
      this.polyline = [];
    }
  }

  get formattedDistance(): string {
    return (this.distance / 1000).toFixed(2) + ' km';
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

  get formattedPace(): string {
    if (this.averageSpeed === 0) return '0:00 /km';
    const secondsPerKm = 1000 / this.averageSpeed;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  }

  get formattedDate(): string {
    return this.startDate.toLocaleDateString();
  }
}
