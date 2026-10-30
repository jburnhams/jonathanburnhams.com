import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, ActivityPhoto, UnitSystem } from '../../models/Activity';
import '../../pages/Running.css';

// Component to fit map bounds to polyline
export function FitBounds({ polyline, bounds }: { polyline?: [number, number][], bounds?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
       map.fitBounds(bounds);
    } else if (polyline && polyline.length > 0) {
      map.fitBounds(polyline);
    }
  }, [map, polyline, bounds]);
  return null;
}

// A few arrowheads along the route showing the direction of travel, in the route's colour
function DirectionArrows({ activity, color }: { activity: Activity; color: string }) {
  return (
    <>
      {activity.directionArrows().map(({ position, bearing }, i) => (
        <Marker
          key={i}
          position={position}
          interactive={false}
          icon={L.divIcon({
            className: 'route-arrow',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            html: `<svg width="24" height="24" viewBox="0 0 16 16" style="transform: rotate(${bearing.toFixed(0)}deg)"><path d="M8 1 L14.5 14.5 L8 11 L1.5 14.5 Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
          })}
        />
      ))}
    </>
  );
}

// Start (filled green) and finish (red ring); one combined marker for loops.
function StartFinishMarkers({ activity }: { activity: Activity }) {
  const ends = activity.startFinish;
  if (!ends) return null;
  if (ends.loop) {
    return (
      <CircleMarker center={ends.start} radius={7} pathOptions={{ color: '#d32f2f', weight: 3, fillColor: '#2e7d32', fillOpacity: 1 }}>
        <Tooltip>Start / Finish</Tooltip>
      </CircleMarker>
    );
  }
  return (
    <>
      <CircleMarker center={ends.finish} radius={7} pathOptions={{ color: '#d32f2f', weight: 3, fillColor: '#fff', fillOpacity: 1 }}>
        <Tooltip>Finish</Tooltip>
      </CircleMarker>
      <CircleMarker center={ends.start} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2e7d32', fillOpacity: 1 }}>
        <Tooltip>Start</Tooltip>
      </CircleMarker>
    </>
  );
}
// The details of an activity: stats, description, photos (with a lightbox) and the route map.
// Shown in the popup (ActivityModal) and on each race's own page.
export function ActivityDetails({ activity, unitSystem }: { activity: Activity; unitSystem: UnitSystem }) {
  const [openPhoto, setOpenPhoto] = useState<ActivityPhoto | null>(null);
  return (
    <>
      <div className="activity-stats">
        <div className="stat-item">
          <span className="stat-label">Date</span>
          <span className="stat-value">{activity.formattedDate}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Distance</span>
          <span className="stat-value">{activity.getFormattedDistance(unitSystem)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Moving Time</span>
          <span className="stat-value">{activity.formattedMovingTime}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pace</span>
          <span className="stat-value">{activity.getFormattedPace(unitSystem)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Elevation Gain</span>
          <span className="stat-value">{activity.getFormattedElevation(unitSystem)}</span>
        </div>
      </div>

      {activity.description && (
        <p className="activity-description">{activity.description}</p>
      )}

      {activity.photos.length > 0 && (
        <div className="activity-photos">
          {activity.photos.map(photo => (
            <button
              key={photo.id}
              type="button"
              className="activity-photo-thumb"
              onClick={() => setOpenPhoto(photo)}
            >
              <img
                src={photo.thumb_url}
                alt={photo.caption || activity.name}
                loading="lazy"
                width={400}
                height={Math.round((400 * photo.height) / photo.width) || undefined}
              />
            </button>
          ))}
        </div>
      )}

      {activity.polyline.length > 0 ? (
        <div className="map-container">
          <MapContainer
            center={activity.polyline[0]}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={activity.polyline} color="blue" />
            <DirectionArrows activity={activity} color="blue" />
            <StartFinishMarkers activity={activity} />
            <FitBounds polyline={activity.polyline} />
          </MapContainer>
        </div>
      ) : (
        <div className="map-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          No map data available
        </div>
      )}

      {openPhoto && (
        <div className="photo-lightbox" onClick={() => setOpenPhoto(null)}>
          <img src={openPhoto.url} alt={openPhoto.caption || activity.name || ''} />
          {openPhoto.caption && <p className="photo-caption">{openPhoto.caption}</p>}
          <button className="modal-close photo-lightbox-close" onClick={() => setOpenPhoto(null)}>×</button>
        </div>
      )}
    </>
  );
}

// The activity popup, used by the Running page (overview map) and the Training page (races).
// pageUrl, when the activity has its own page, adds a link to it.
export function ActivityModal({ activity, unitSystem, onClose, pageUrl }: {
  activity: Activity; unitSystem: UnitSystem; onClose: () => void; pageUrl?: string;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{activity.name}</h2>
          {pageUrl && <a className="modal-page-link" href={pageUrl}>Race page →</a>}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <ActivityDetails activity={activity} unitSystem={unitSystem} />
        </div>
      </div>
    </div>
  );
}

export default ActivityModal;
