import { describe, it, expect } from 'vitest';
import { Activity, bearingDegrees, distanceMeters } from '../models/Activity';

describe('Activity Model', () => {
  const mockActivityData = {
    id: 123,
    name: 'Morning Run',
    type: 'Run',
    start_date: '2023-01-01T08:00:00Z',
    distance: 10000, // 10km
    moving_time: 3600, // 1 hour
    elapsed_time: 3600,
    total_elevation_gain: 100, // 100 meters
    average_speed: 2.77, // ~10km/h
    data_json: {
      id: 123,
      name: 'Morning Run',
      type: 'Run',
      start_date_local: '2023-01-01T08:00:00Z',
      distance: 10000,
      moving_time: 3600,
      elapsed_time: 3600,
      total_elevation_gain: 100,
      average_speed: 2.77,
      map: {
        summary_polyline: 'encoded_polyline_string'
      }
    }
  };

  it('should parse basic fields correctly', () => {
    const activity = new Activity(mockActivityData);
    expect(activity.id).toBe(123);
    expect(activity.name).toBe('Morning Run');
    expect(activity.type).toBe('Run');
    expect(activity.distance).toBe(10000);
    expect(activity.movingTime).toBe(3600);
    expect(activity.elevationGain).toBe(100);
  });

  it('should format distance correctly (Metric)', () => {
    const activity = new Activity(mockActivityData);
    expect(activity.getFormattedDistance('metric')).toBe('10.00 km');
  });

  it('should format distance correctly (Imperial)', () => {
    const activity = new Activity(mockActivityData);
    // 10000 meters * 0.000621371 = 6.21371 miles
    expect(activity.getFormattedDistance('imperial')).toBe('6.21 mi');
  });

  it('should format moving time correctly', () => {
    const activity = new Activity(mockActivityData);
    expect(activity.formattedMovingTime).toBe('1:00:00');
  });

  it('should format pace correctly (Metric)', () => {
    // 2.77 m/s is roughly 6:00 min/km
    // 1000 / 2.77 = 361 seconds per km = 6:01
    const activity = new Activity(mockActivityData);
    expect(activity.getFormattedPace('metric')).toBe('6:01 /km');
  });

  it('should format pace correctly (Imperial)', () => {
    // 2.77 m/s
    // 1 mile = 1609.344 meters
    // Seconds per mile = 1609.344 / 2.77 = 580.99
    // 580.99 seconds = 9 minutes 40.99 seconds -> 9:40
    const activity = new Activity(mockActivityData);
    expect(activity.getFormattedPace('imperial')).toBe('9:40 /mi');
  });

  it('should format elevation correctly (Metric)', () => {
    const activity = new Activity(mockActivityData);
    expect(activity.getFormattedElevation('metric')).toBe('100 m');
  });

  it('should format elevation correctly (Imperial)', () => {
    const activity = new Activity(mockActivityData);
    // 100 meters * 3.28084 = 328.084 feet
    expect(activity.getFormattedElevation('imperial')).toBe('328 ft');
  });

  it('should format date correctly', () => {
    const activity = new Activity(mockActivityData);
    // Expect dd/mm/yyyy format
    expect(activity.formattedDate).toBe('01/01/2023');
  });

  it('should handle missing data_json', () => {
    const simpleData = {
      id: 456,
      name: 'Simple Run',
      type: 'Run',
      start_date: '2023-02-01T10:00:00Z',
      distance: 5000,
      moving_time: 1800,
      elapsed_time: 1800,
      total_elevation_gain: 50
    };
    const activity = new Activity(simpleData);
    expect(activity.id).toBe(456);
    expect(activity.name).toBe('Simple Run');
    expect(activity.getFormattedDistance('metric')).toBe('5.00 km');
  });

  it('reads description and photos from data_json', () => {
    const photo = { id: '1_0', width: 1200, height: 800, url: 'https://x/api/photos/1_0', thumb_url: 'https://x/api/photos/1_0?size=thumb' };
    const activity = new Activity({
      ...mockActivityData,
      data_json: { ...mockActivityData.data_json, description: '  Line one\nLine two  ', photos: [photo, { id: 'bad' } as unknown as typeof photo] },
    });
    expect(activity.description).toBe('Line one\nLine two');
    expect(activity.photos).toEqual([photo]); // entries without urls are dropped
  });

  it('defaults to no description and no photos', () => {
    const activity = new Activity(mockActivityData);
    expect(activity.description).toBe('');
    expect(activity.photos).toEqual([]);
  });

  it('gives the start and finish of the route, and spots loops', () => {
    const route = (points: [number, number][]) => {
      const a = new Activity(mockActivityData);
      a.polyline = points;
      return a.startFinish;
    };
    expect(route([])).toBeNull();
    expect(route([[51.5, -0.1], [51.6, -0.2]])).toEqual({ start: [51.5, -0.1], finish: [51.6, -0.2], loop: false });
    expect(route([[51.5, -0.1], [51.6, -0.2], [51.5003, -0.1]])?.loop).toBe(true); // ~33 m apart
    expect(distanceMeters([51.5, -0.1], [51.5, -0.1])).toBe(0);
    expect(Math.round(distanceMeters([0, 0], [1, 0]) / 1000)).toBe(111);
  });

  it('places direction arrows evenly along the route, pointing the way it goes', () => {
    const a = new Activity(mockActivityData);
    a.polyline = [[51.5, -0.1], [51.6, -0.1], [51.6, 0.06]]; // north ~11 km, then east ~11 km
    const arrows = a.directionArrows(3);
    expect(arrows).toHaveLength(3);
    expect(Math.round(arrows[0].bearing)).toBe(0);   // first quarter: heading north
    expect(Math.round(arrows[2].bearing)).toBe(90);  // last quarter: heading east
    expect(arrows[0].position[0]).toBeGreaterThan(51.5);
    expect(arrows[2].position[1]).toBeGreaterThan(-0.1);
    expect(Math.round(bearingDegrees([0, 0], [0, -1]))).toBe(270);
    a.polyline = [[51.5, -0.1]];
    expect(a.directionArrows()).toEqual([]);
  });

  it('smooths the direction: a zig-zag heading north points north', () => {
    const a = new Activity(mockActivityData);
    // 200 points 50 m apart northwards, each swinging 40 m east or west (a GPS zig-zag)
    a.polyline = Array.from({ length: 200 }, (_, i) => [51.5 + i * 0.00045, -0.1 + (i % 2 ? 0.0006 : -0.0006)] as [number, number]);
    for (const { bearing } of a.directionArrows()) {
      const off = Math.min(bearing, 360 - bearing); // angle from north
      expect(off).toBeLessThan(5);
    }
    // whereas the raw segment under a marker points well off to the side
    expect(Math.round(bearingDegrees(a.polyline[100], a.polyline[101]))).toBeGreaterThan(20);
  });

  it('follows each stretch on a winding route, not the next bend', () => {
    const a = new Activity(mockActivityData);
    // east for ~10 km, then a tight hairpin, then west back along a parallel line
    const east = Array.from({ length: 100 }, (_, i) => [51.5, -0.1 + i * 0.0014] as [number, number]);
    const west = Array.from({ length: 100 }, (_, i) => [51.502, -0.1 + (99 - i) * 0.0014] as [number, number]);
    a.polyline = [...east, ...west];
    const [first, , mid, , last] = a.directionArrows();
    expect(Math.round(first.bearing)).toBe(90);
    expect(Math.round(last.bearing)).toBe(270);
    expect(mid.position[1]).toBeGreaterThan(0.03); // the middle one sits out near the hairpin
  });
});
