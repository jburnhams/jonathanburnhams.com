import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, StravaActivityJSON, UnitSystem } from '../models/Activity';
import { ActivityDetails } from '../components/ActivityModal/ActivityModal';
import { getRacePages } from '../utils/racePages';
import './Running.css';

const ACTIVITIES_API = 'https://stravasync.jonathanburnhams.com/api/users/7828229/activities';

declare global {
  // Embedded in each race's static page by scripts/build-race-pages.mjs
  interface Window { __RACE__?: { slug: string; activity: StravaActivityJSON } }
}

// A race's own page (/running/<year>-<name>/): the static HTML built for search engines is
// replaced by this, using the race's data embedded in the page (or fetched, e.g. in dev).
const RacePage = () => {
  const { slug } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [missing, setMissing] = useState(false);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  useEffect(() => {
    const embedded = window.__RACE__;
    if (embedded && embedded.slug === slug) {
      setActivity(new Activity(embedded.activity));
      return;
    }
    (async () => {
      const slugs = await getRacePages();
      const id = Object.keys(slugs).find(k => slugs[k] === slug);
      if (!id) { setMissing(true); return; }
      const res = await fetch(ACTIVITIES_API);
      const data: StravaActivityJSON[] = res.ok ? await res.json() : [];
      const found = data.find(a => String(a.id) === id);
      if (found) setActivity(new Activity(found)); else setMissing(true);
    })().catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    if (activity) document.title = `${activity.name} (${activity.startDate.getFullYear()}) | Jonathan Burnhams`;
  }, [activity]);

  if (missing) {
    return (
      <div className="running-page race-page">
        <p><Link to="/running">← All runs</Link></p>
        <h1>Race not found</h1>
      </div>
    );
  }
  if (!activity) return <div className="running-page race-page">Loading race...</div>;

  return (
    <div className="running-page race-page">
      <p className="race-back"><Link to="/running">← All runs</Link></p>
      <header className="running-header">
        <div className="header-content">
          <h1>{activity.name}</h1>
          <div className="unit-toggle">
            <button className={`toggle-btn ${unitSystem === 'metric' ? 'active' : ''}`} onClick={() => setUnitSystem('metric')}>Metric</button>
            <button className={`toggle-btn ${unitSystem === 'imperial' ? 'active' : ''}`} onClick={() => setUnitSystem('imperial')}>Imperial</button>
          </div>
        </div>
      </header>
      <ActivityDetails activity={activity} unitSystem={unitSystem} />
    </div>
  );
};

export default RacePage;
