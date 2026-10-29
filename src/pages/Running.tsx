import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, StravaActivityJSON, UnitSystem } from '../models/Activity';
import { ActivityModal, FitBounds } from '../components/ActivityModal/ActivityModal';
import './Running.css';

const getColorForActivity = (id: number): string => {
  // Simple hash function to generate a consistent color
  const hash = id * 2654435761 % 2 ** 32;
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

const Running = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

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
          .filter(activity => activity.type === 'Run' && activity.distance > 20000)
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

  const allPolylinesBounds = useMemo(() => {
    const allPoints = activities.flatMap(a => a.polyline);
    if (allPoints.length === 0) return undefined;

    // Calculate bounds manually to avoid L dependency if possible, or just pass all points to fitBounds
    // But fitBounds expects a LatLngBoundsExpression which can be an array of LatLngs.
    // However, creating a huge array might be heavy. Let's find min/max.
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

    allPoints.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
  }, [activities]);

  if (loading) return <div className="running-page">Loading activities...</div>;
  if (error) return <div className="running-page">Error: {error}</div>;

  return (
    <div className="running-page">
      <header className="running-header">
        <div className="header-content">
          <h1>Running Activities</h1>
          <div className="unit-toggle">
            <button
              className={`toggle-btn ${unitSystem === 'metric' ? 'active' : ''}`}
              onClick={() => setUnitSystem('metric')}
            >
              Metric
            </button>
            <button
              className={`toggle-btn ${unitSystem === 'imperial' ? 'active' : ''}`}
              onClick={() => setUnitSystem('imperial')}
            >
              Imperial
            </button>
          </div>
        </div>
      </header>

      {/* Main Map with all activities */}
      <div className="all-activities-map-container">
         <MapContainer
            bounds={allPolylinesBounds}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {activities.map(activity => (
              activity.polyline.length > 0 && (
                <Polyline
                  key={activity.id}
                  positions={activity.polyline}
                  pathOptions={{ color: getColorForActivity(activity.id) }}
                  eventHandlers={{
                    click: () => setSelectedActivity(activity)
                  }}
                />
              )
            ))}
            <FitBounds bounds={allPolylinesBounds} />
          </MapContainer>
      </div>

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
              <td>{activity.getFormattedDistance(unitSystem)}</td>
              <td>{activity.formattedMovingTime}</td>
              <td>{activity.getFormattedPace(unitSystem)}</td>
              <td>{activity.getFormattedElevation(unitSystem)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedActivity && (
        <ActivityModal activity={selectedActivity} unitSystem={unitSystem} onClose={() => setSelectedActivity(null)} />
      )}
    </div>
  );
};

export default Running;
