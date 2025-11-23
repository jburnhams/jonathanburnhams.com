import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import rawActivities from '../data/strava-activities.json';
import './Activities.css';

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  workout_type?: number | null; // 1 for Race (Run)
  start_date_local: string;
  distance: number; // in meters
  moving_time: number; // in seconds
  total_elevation_gain: number; // in meters
  average_speed: number; // in meters/second
  map?: {
      summary_polyline: string;
  }
}

const Activities = () => {
  // Use 'any' cast if the JSON structure is not guaranteed or typed yet,
  // but explicit interface is better.
  const activities = rawActivities as StravaActivity[];

  const [filter, setFilter] = useState<'all' | 'run' | 'race'>('run');

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (filter === 'all') return true;
      if (filter === 'run') return activity.type === 'Run';
      if (filter === 'race') return activity.type === 'Run' && activity.workout_type === 1;
      return true;
    }).sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());
  }, [activities, filter]);

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + ' km';
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculatePace = (speed: number) => {
     if (speed === 0) return '0:00 /km';
     const secondsPerKm = 1000 / speed;
     const m = Math.floor(secondsPerKm / 60);
     const s = Math.floor(secondsPerKm % 60);
     return `${m}:${s.toString().padStart(2, '0')} /km`;
  };

  return (
    <div className="activities-page">
      <header className="activities-header">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1>Activities</h1>
      </header>

      <div className="filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'run' ? 'active' : ''}
            onClick={() => setFilter('run')}
          >
            Runs
          </button>
          <button
            className={filter === 'race' ? 'active' : ''}
            onClick={() => setFilter('race')}
          >
            Races
          </button>
      </div>

      <div className="activities-list">
        {filteredActivities.length === 0 ? (
            <p>No activities found.</p>
        ) : (
            <table className="activities-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Distance</th>
                        <th>Time</th>
                        <th>Pace</th>
                        <th>Elevation</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredActivities.map(activity => (
                        <tr key={activity.id}>
                            <td>{formatDate(activity.start_date_local)}</td>
                            <td>{activity.name}</td>
                            <td>{formatDistance(activity.distance)}</td>
                            <td>{formatTime(activity.moving_time)}</td>
                            <td>{calculatePace(activity.average_speed)}</td>
                            <td>{activity.total_elevation_gain}m</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default Activities;
