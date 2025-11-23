import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Activities from './Activities';

// Mock the data
vi.mock('../data/strava-activities.json', () => ({
  default: [
    {
      id: 1,
      name: 'Run 1',
      type: 'Run',
      workout_type: null,
      start_date_local: '2023-01-01T10:00:00Z',
      distance: 5000,
      moving_time: 1500,
      total_elevation_gain: 50,
      average_speed: 3.33,
    },
    {
      id: 2,
      name: 'Race 1',
      type: 'Run',
      workout_type: 1,
      start_date_local: '2023-02-01T10:00:00Z',
      distance: 10000,
      moving_time: 3000,
      total_elevation_gain: 100,
      average_speed: 3.33,
    },
    {
      id: 3,
      name: 'Ride 1',
      type: 'Ride',
      start_date_local: '2023-03-01T10:00:00Z',
      distance: 20000,
      moving_time: 3600,
      total_elevation_gain: 200,
      average_speed: 5.55,
    }
  ]
}));

describe('Activities Page', () => {
  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <Activities />
      </BrowserRouter>
    );
    expect(screen.getByText('Activities')).toBeInTheDocument();
  });

  it('filters runs by default', () => {
    render(
      <BrowserRouter>
        <Activities />
      </BrowserRouter>
    );
    // Should see Run 1 and Race 1, but not Ride 1
    expect(screen.getByText('Run 1')).toBeInTheDocument();
    expect(screen.getByText('Race 1')).toBeInTheDocument();
    expect(screen.queryByText('Ride 1')).not.toBeInTheDocument();
  });

  it('filters all activities', () => {
    render(
      <BrowserRouter>
        <Activities />
      </BrowserRouter>
    );
    const allButton = screen.getByText('All');
    fireEvent.click(allButton);

    expect(screen.getByText('Run 1')).toBeInTheDocument();
    expect(screen.getByText('Race 1')).toBeInTheDocument();
    expect(screen.getByText('Ride 1')).toBeInTheDocument();
  });

  it('filters races only', () => {
    render(
      <BrowserRouter>
        <Activities />
      </BrowserRouter>
    );
    const raceButton = screen.getByText('Races');
    fireEvent.click(raceButton);

    expect(screen.queryByText('Run 1')).not.toBeInTheDocument();
    expect(screen.getByText('Race 1')).toBeInTheDocument();
    expect(screen.queryByText('Ride 1')).not.toBeInTheDocument();
  });
});
