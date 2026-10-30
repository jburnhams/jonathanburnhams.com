import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, StravaActivityJSON, UnitSystem } from '../models/Activity';
import { ActivityModal, FitBounds } from '../components/ActivityModal/ActivityModal';
import PhotoCarousel from '../components/PhotoCarousel/PhotoCarousel';
import { getRacePages, racePageUrl } from '../utils/racePages';
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
  // Every activity from the API (not only the listed runs), so a photo of any race can open its popup
  const [allById, setAllById] = useState<Map<number, Activity>>(new Map());
  // Strava id -> race page slug (built with the site); empty in dev or if the build couldn't fetch them
  const [racePages, setRacePages] = useState<Record<string, string>>({});
  const pageFor = (id: number) => (racePages[id] ? racePageUrl(racePages[id]) : undefined);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('https://stravasync.jonathanburnhams.com/api/users/7828229/activities');
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        const [data, slugs] = await Promise.all([response.json() as Promise<StravaActivityJSON[]>, getRacePages()]);
        setRacePages(slugs);
        const all = data.map(item => new Activity(item));
        const parsedActivities = all
          .filter(activity => activity.type === 'Run' && activity.distance > 20000)
          .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        setActivities(parsedActivities);
        setAllById(new Map(all.map(a => [a.id, a])));
        // /running?activity=<id> (e.g. from a homepage photo) opens that activity, even one not in the list
        const linked = Number(new URLSearchParams(window.location.search).get('activity'));
        if (linked && slugs[linked]) {
          window.location.replace(racePageUrl(slugs[linked])); // old links now go to the race's own page
          return;
        }
        const target = linked ? all.find(a => a.id === linked) : undefined;
        if (target) setSelectedActivity(target);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Closing drops ?activity= so a reload doesn't reopen it
  const closeActivity = () => {
    setSelectedActivity(null);
    if (window.location.search.includes('activity=')) window.history.replaceState(null, '', window.location.pathname);
  };

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

      <PhotoCarousel
        className="running-carousel"
        onOpenActivity={id => {
          const url = pageFor(id);
          if (url) window.location.assign(url);
          else { const a = allById.get(id); if (a) setSelectedActivity(a); }
        }}
      />

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
            <tr
              key={activity.id}
              onClick={() => { const url = pageFor(activity.id); if (url) window.location.assign(url); else setSelectedActivity(activity); }}
            >
              <td>{activity.formattedDate}</td>
              <td>
                {pageFor(activity.id)
                  ? <a className="activity-name-link" href={pageFor(activity.id)} onClick={e => e.stopPropagation()}>{activity.name}</a>
                  : activity.name}
              </td>
              <td>{activity.getFormattedDistance(unitSystem)}</td>
              <td>{activity.formattedMovingTime}</td>
              <td>{activity.getFormattedPace(unitSystem)}</td>
              <td>{activity.getFormattedElevation(unitSystem)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedActivity && (
        <ActivityModal activity={selectedActivity} unitSystem={unitSystem} onClose={closeActivity} pageUrl={pageFor(selectedActivity.id)} />
      )}
    </div>
  );
};

export default Running;
