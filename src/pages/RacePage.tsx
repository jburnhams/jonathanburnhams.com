// A race's own page (/running/<year>-<name>/, Read mode). Question: "How did that race go?" The
// static HTML built for search engines (scripts/build-race-pages.mjs) is replaced by this, from the
// race's data embedded in the page, or the activities API in dev. When one of the race's photos is
// in the background set it heads the page and colours it; otherwise the page keeps the visit's
// colours and starts with the name.
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { DataView, EmptyState, Lightbox, Metric, MetricStrip, Skeleton, TextLink, ToggleGroup, Thumbnail, format, useLightboxUrl, useSearchParam } from 'strata-react';
import { RouteMap } from 'strata-react/map';
import { backgroundFor, sessionPhoto, usePhotoPalette } from '../backgrounds';
import { PhotoBand, PlainBand } from '../components/PhotoBand';
import { useActivities } from '../data/activities';
import { Activity, type StravaActivityJSON, type UnitSystem } from '../models/Activity';
import { useRacePages } from '../utils/racePages';
import { TILES } from '../data/races';

declare global {
  // Embedded in each race's static page by scripts/build-race-pages.mjs
  interface Window { __RACE__?: { slug: string; activity: StravaActivityJSON } }
}

const UNITS = [{ value: 'metric', label: 'Kilometres' }, { value: 'imperial', label: 'Miles' }] as const;

function RaceBody({ activity }: { activity: Activity }) {
  const [units] = useSearchParam('units', { default: 'metric', parse: raw => raw === 'metric' || raw === 'imperial' });
  const u = units as UnitSystem;
  const items = useMemo(
    () => activity.photos.map((p, i) => ({ id: p.id, src: p.url, thumb: p.thumb_url, label: p.caption || `${activity.name}, photo ${i + 1}`, natural: [p.width, p.height] as const })),
    [activity],
  );
  const lightbox = useLightboxUrl(items);
  const routes = useMemo(() => (activity.polyline.length > 1 ? [{ id: String(activity.id), label: activity.name, points: activity.polyline }] : []), [activity]);
  const [distance, distanceUnit] = splitUnit(activity.getFormattedDistance(u));
  const [climb, climbUnit] = splitUnit(activity.getFormattedElevation(u));
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="type-body text-muted-foreground"><TextLink to="/running">Every race</TextLink></p>
        <ToggleGroup label="Units" options={UNITS} param="units" size="sm" />
      </div>
      <MetricStrip label={`${activity.name} in figures`}>
        <Metric label="Date" value={format.date(activity.startDate)} />
        <Metric label="Distance" value={distance} unit={distanceUnit} />
        <Metric label="Moving time" value={activity.formattedMovingTime} />
        <Metric label="Pace" value={activity.getFormattedPace(u)} />
        <Metric label="Climb" value={climb} unit={climbUnit} />
      </MetricStrip>
      {activity.description && <p className="max-w-prose whitespace-pre-line type-body">{activity.description}</p>}
      {items.length > 0 && (
        <section aria-labelledby="photos" className="grid gap-3">
          <h2 id="photos" className="type-heading">Photos</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => lightbox.show(item.id)} className="block w-full rounded-control" aria-label={`Open ${item.label}`}>
                  <Thumbnail src={item.thumb} alt={item.label} aspect="4/3" missing="Photo not available" />
                </button>
              </li>
            ))}
          </ul>
          <Lightbox title={activity.name} items={items} missing="This photo could not be loaded from strava-sync." {...lightbox} />
        </section>
      )}
      {routes.length > 0 && <RouteMap label={`Route of ${activity.name}`} routes={routes} tiles={TILES} units={u} className="map-tall aspect-auto" />}
    </div>
  );
}

/** "42.20 km" -> ["42.20", "km"], for a Metric's value and unit. */
function splitUnit(s: string): [string, string | undefined] {
  const i = s.lastIndexOf(' ');
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, undefined];
}

const RacePage = () => {
  const { slug } = useParams();
  const embedded = window.__RACE__?.slug === slug ? window.__RACE__ : undefined;
  const slugs = useRacePages();
  const activities = useActivities();
  const id = embedded ? String(embedded.activity.id) : Object.keys(slugs).find(k => slugs[k] === slug);
  const fromApi = activities.status === 'ready' && id ? activities.data.find(a => String(a.id) === id) : undefined;
  const activity = useMemo(() => (embedded ? new Activity(embedded.activity) : fromApi), [embedded, fromApi]);
  const own = backgroundFor(activity?.id);
  const photo = own ?? sessionPhoto();
  usePhotoPalette(photo);
  useEffect(() => {
    if (activity) document.title = `${activity.name} (${activity.startDate.getFullYear()}) | Jonathan Burnhams`;
  }, [activity]);

  if (activity) {
    return (
      <>
        {own ? <PhotoBand photo={own} title={activity.name} named={false} /> : <PlainBand title={activity.name} />}
        <RaceBody activity={activity} />
      </>
    );
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8">
      <DataView
        state={activities}
        isEmpty={() => true}
        skeleton={<div className="grid gap-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-24" /><Skeleton className="h-96" /></div>}
        empty={<EmptyState title="No race at this address" action={<TextLink to="/running">Every race</TextLink>}>The race may have been renamed since the link was made.</EmptyState>}
      >
        {() => null}
      </DataView>
    </div>
  );
};

export default RacePage;
