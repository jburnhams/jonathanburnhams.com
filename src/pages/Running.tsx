// Running. One question: "What has he raced?" Finding: how many races over 20 km, how far and how
// much climbing in all, and the longest. Then where they were (one map of every route; choosing a
// route opens its race page) and the list (newest first, every column sortable, units in the URL).
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DataTable, DataView, EmptyState, Skeleton, TextLink, ToggleGroup, format, useSearchParam } from 'strata-react';
import { RouteMap, type MapRoute } from 'strata-react/map';
import { sessionPhoto, usePhotoPalette } from '../backgrounds';
import { PhotoBand, PlainBand } from '../components/PhotoBand';
import { isRace, useActivities } from '../data/activities';
import { TILES, raceFinding } from '../data/races';
import type { Activity, UnitSystem } from '../models/Activity';
import { racePageUrl, useRacePages } from '../utils/racePages';

const UNITS = [{ value: 'metric', label: 'Kilometres' }, { value: 'imperial', label: 'Miles' }] as const;

function RaceTable({ races, units, slugs }: { races: Activity[]; units: UnitSystem; slugs: Record<string, string> }) {
  return (
    <DataTable
      caption="Races over 20 km"
      rows={races}
      rowKey={a => String(a.id)}
      initialSort={{ key: 'date', dir: 'descending' }}
      sortParam="sort"
      columns={[
        { key: 'date', header: 'Date', value: a => a.startDate, cell: a => format.date(a.startDate) },
        {
          key: 'name', header: 'Race', value: a => a.name, truncate: true,
          cell: a => (slugs[a.id] ? <TextLink to={racePageUrl(slugs[a.id])}>{a.name}</TextLink> : a.name),
        },
        { key: 'distance', header: 'Distance', numeric: true, value: a => a.distance, cell: a => a.getFormattedDistance(units) },
        { key: 'time', header: 'Moving time', numeric: true, value: a => a.movingTime, cell: a => a.formattedMovingTime },
        { key: 'pace', header: 'Pace', numeric: true, value: a => a.averageSpeed ? 1 / a.averageSpeed : null, cell: a => a.getFormattedPace(units) },
        { key: 'climb', header: 'Climb', numeric: true, value: a => a.elevationGain, cell: a => a.getFormattedElevation(units) },
      ]}
    />
  );
}

function RaceMap({ races, slugs }: { races: Activity[]; slugs: Record<string, string> }) {
  const navigate = useNavigate();
  const routes = useMemo<MapRoute[]>(
    () => races.filter(a => a.polyline.length > 1).map(a => ({ id: String(a.id), label: `${a.name}, ${a.startDate.getFullYear()}`, points: a.polyline })),
    [races],
  );
  if (!routes.length) return null;
  return (
    <RouteMap
      label={`Routes of ${format.count(routes.length, 'race')}`}
      routes={routes}
      tiles={TILES}
      onSelect={id => { if (slugs[id]) navigate(racePageUrl(slugs[id])); }}
      className="map-tall aspect-auto"
    />
  );
}

const Running = () => {
  const photo = sessionPhoto();
  usePhotoPalette(photo);
  const activities = useActivities();
  const slugs = useRacePages();
  const [units] = useSearchParam('units', { default: 'metric', parse: raw => raw === 'metric' || raw === 'imperial' });
  const races = useMemo(
    () => (activities.status === 'ready' ? activities.data.filter(isRace).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()) : []),
    [activities],
  );
  const finding = raceFinding(races);
  // Old links (/running?activity=<id>, from before race pages) go to the race's own page
  const navigate = useNavigate();
  const [linked] = useSearchParam('activity', { default: '' });
  useEffect(() => { if (linked && slugs[linked]) navigate(racePageUrl(slugs[linked]), { replace: true }); }, [linked, slugs, navigate]);
  return (
    <>
      {photo ? <PhotoBand photo={photo} title="Running">{finding}</PhotoBand> : <PlainBand title="Running">{finding}</PlainBand>}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8">
        <DataView
          state={activities}
          isEmpty={all => all.filter(isRace).length === 0}
          skeleton={<div className="grid gap-8"><Skeleton className="h-96" /><Skeleton className="h-64" /></div>}
          empty={<EmptyState title="No races yet">Runs over 20 km appear here once they are in the Strava export that strava-sync loads.</EmptyState>}
        >
          {() => (
            <>
              <RaceMap races={races} slugs={slugs} />
              <section aria-labelledby="races" className="grid gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id="races" className="type-heading">Every race</h2>
                  <ToggleGroup label="Units" options={UNITS} param="units" size="sm" />
                </div>
                <RaceTable races={races} units={units as UnitSystem} slugs={slugs} />
              </section>
            </>
          )}
        </DataView>
      </div>
    </>
  );
};

export default Running;
