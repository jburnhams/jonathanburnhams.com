import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, StravaActivityJSON } from '../models/Activity';
import './Running.css';

// Component to fit map bounds to polyline
function FitBounds({ polyline }: { polyline: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (polyline && polyline.length > 0) {
      map.fitBounds(polyline);
    }
  }, [map, polyline]);
  return null;
}

const Running = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('https://stravasync.jonathanburnhams.com/api/users/7828229/activities');
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        const data: StravaActivityJSON[] = await response.json();
        const parsedActivities = data
          .map(item => new Activity(item))
          .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        setActivities(parsedActivities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (loading) return <div className="running-page">Loading activities...</div>;
  if (error) return <div className="running-page">Error: {error}</div>;

  return (
    <div className="running-page">
      <header className="running-header">
        <h1>Running Activities</h1>
      </header>

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
          {activities.map(activity => (
            <tr key={activity.id} onClick={() => setSelectedActivity(activity)}>
              <td>{activity.formattedDate}</td>
              <td>{activity.name}</td>
              <td>{activity.formattedDistance}</td>
              <td>{activity.formattedMovingTime}</td>
              <td>{activity.formattedPace}</td>
              <td>{activity.elevationGain}m</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedActivity.name}</h2>
              <button className="modal-close" onClick={() => setSelectedActivity(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="activity-stats">
                <div className="stat-item">
                  <span className="stat-label">Date</span>
                  <span className="stat-value">{selectedActivity.formattedDate}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Distance</span>
                  <span className="stat-value">{selectedActivity.formattedDistance}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Moving Time</span>
                  <span className="stat-value">{selectedActivity.formattedMovingTime}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pace</span>
                  <span className="stat-value">{selectedActivity.formattedPace}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Elevation Gain</span>
                  <span className="stat-value">{selectedActivity.elevationGain}m</span>
                </div>
              </div>

              {selectedActivity.polyline.length > 0 ? (
                <div className="map-container">
                  <MapContainer
                    center={selectedActivity.polyline[0]}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Polyline positions={selectedActivity.polyline} color="blue" />
                    <FitBounds polyline={selectedActivity.polyline} />
                  </MapContainer>
                </div>
              ) : (
                <div className="map-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  No map data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Running;
