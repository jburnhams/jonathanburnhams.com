import { describe, it, expect } from 'vitest';
import { Activity } from '../models/Activity';

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
    // Note: Locale date string format depends on environment, but should contain 2023
    expect(activity.formattedDate).toContain('2023');
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
});
