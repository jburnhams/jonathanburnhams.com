import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Period, PeriodTotals, SPORT_GROUPS, TRAINING_API, TrainingActivity, TrainingPeriod,
  chartRange, formatDuration, formatKm, formatPace, groupSports, periodLabel, periodRange, periodsIn,
  sportGroup, sportLabel, totalsByPeriod,
} from '../models/Training';
import { Activity, StravaActivityJSON } from '../models/Activity';
import { ActivityModal } from '../components/ActivityModal/ActivityModal';
import { getJson, getSummary } from '../utils/trainingApi';
import { getRacePages, racePageUrl } from '../utils/racePages';
import './Running.css';
import './Training.css';

type Metric = 'distance' | 'moving_time';
const PAGE = 50;
const STRAVA_ACTIVITIES = 'https://stravasync.jonathanburnhams.com/api/users/7828229/activities';
const PERIODS: Period[] = ['week', 'month', 'year'];
const RECENT_LABEL: Record<'week' | 'month', string> = { week: 'Last 12 months', month: 'Last 2 years' };

// Stacked bars per period (oldest left), one colour per sport group; click a bar to pick that period
function VolumeChart({ periods, totals, period, metric, selected, onSelect }: {
  periods: string[]; totals: PeriodTotals[]; period: Period; metric: Metric;
  selected: string | null; onSelect: (period: string) => void;
}) {
  const byPeriod = new Map(totals.map(t => [t.period, t]));
  const bars = periods.map(p => byPeriod.get(p) ?? { period: p, byGroup: {} });
  const value = (t: PeriodTotals, g: string) => t.byGroup[g]?.[metric] ?? 0;
  const max = Math.max(1, ...bars.map(t => SPORT_GROUPS.reduce((s, g) => s + value(t, g.key), 0)));
  const width = 900, height = 220, gap = 2;
  const barW = bars.length ? width / bars.length : width;
  const labelEvery = Math.ceil(bars.length / 12);
  const fmt = (v: number) => (metric === 'distance' ? formatKm(v) : formatDuration(v));

  return (
    <svg className="volume-chart" viewBox={`0 0 ${width} ${height + 24}`} role="img" aria-label={`Training ${metric === 'distance' ? 'distance' : 'time'} per ${period}`}>
      <text x={0} y={12} className="chart-axis">{fmt(max)}</text>
      {bars.map((t, i) => {
        let y = height;
        return (
          <g
            key={t.period}
            data-testid="volume-bar"
            className={`volume-bar ${selected && selected !== t.period ? 'dimmed' : ''}`}
            onClick={() => onSelect(t.period)}
          >
            <rect x={i * barW} y={0} width={barW} height={height} fill="transparent" />
            <title>{`${periodLabel(t.period, period)}: ${SPORT_GROUPS.filter(g => value(t, g.key)).map(g => `${g.label} ${fmt(value(t, g.key))}`).join(', ') || 'nothing'}`}</title>
            {SPORT_GROUPS.map(g => {
              const h = (value(t, g.key) / max) * (height - 20);
              if (!h) return null;
              y -= h;
              return <rect key={g.key} x={i * barW + gap / 2} y={y} width={Math.max(1, barW - gap)} height={h} fill={g.color} />;
            })}
            {i % labelEvery === 0 && (
              <text x={i * barW + barW / 2} y={height + 16} textAnchor="middle" className="chart-axis">{periodLabel(t.period, period)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const Training = ({ today = new Date().toISOString().slice(0, 10) }: { today?: string }) => {
  const [yearly, setYearly] = useState<TrainingPeriod[] | null>(null);
  const [chartRows, setChartRows] = useState<TrainingPeriod[]>([]);
  const [sessions, setSessions] = useState<TrainingActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [chartYear, setChartYear] = useState<Record<'week' | 'month', string>>({ week: 'recent', month: 'recent' });
  const [metric, setMetric] = useState<Metric>('distance');
  const [includeRaces, setIncludeRaces] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [racesOnly, setRacesOnly] = useState(false);
  const [races, setRaces] = useState<Map<number, Activity> | null>(null);
  const [openRace, setOpenRace] = useState<Activity | null>(null);
  const [racePages, setRacePages] = useState<Record<string, string>>({});
  useEffect(() => { getRacePages().then(setRacePages); }, []);
  const request = useRef(0);

  const raceParam = useMemo((): Record<string, string> => (includeRaces ? {} : { race: '0' }), [includeRaces]);
  const fail = useCallback((err: unknown) => setError(err instanceof Error ? err.message : 'An error occurred'), []);

  // Yearly totals (all years): the totals table, the Yearly chart and the year selectors
  useEffect(() => {
    getSummary({ period: 'year', ...raceParam }).then(setYearly).catch(fail);
  }, [raceParam, fail]);

  // Weekly or monthly bars for the chosen range, fetched when first shown
  const range = useMemo(
    () => (period === 'year' ? null : chartRange(period, chartYear[period], today)),
    [period, chartYear, today]
  );
  useEffect(() => {
    if (!range) return;
    getSummary({ period, from: range.from, to: range.to, ...raceParam }).then(setChartRows).catch(fail);
  }, [period, range, raceParam, fail]);

  // The session list's filters as API parameters (the chart view only matters while a bar is selected)
  const barFilter = selectedPeriod ? periodRange(period, selectedPeriod) : null;
  const barFrom = barFilter?.from, barTo = barFilter?.to;
  const listParams = useMemo(() => {
    const p: Record<string, string> = { limit: String(PAGE) };
    if (groupFilter !== 'all') p.sport = groupSports(groupFilter);
    if (racesOnly) p.race = '1';
    else if (!includeRaces) p.race = '0';
    let from = yearFilter === 'all' ? '' : `${yearFilter}-01-01`;
    let to = yearFilter === 'all' ? '' : `${yearFilter}-12-31`;
    if (barFrom && barTo) {
      if (!from || barFrom > from) from = barFrom;
      if (!to || barTo < to) to = barTo;
    }
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [groupFilter, racesOnly, includeRaces, yearFilter, barFrom, barTo]);

  // One page of sessions; offset 0 replaces the list, later pages are appended
  const fetchPage = useCallback(async (offset: number) => {
    const id = ++request.current;
    setLoadingSessions(true);
    try {
      const res = await fetch(`${TRAINING_API}/activities?${new URLSearchParams({ ...listParams, offset: String(offset) })}`);
      if (!res.ok) throw new Error('Failed to fetch training data');
      const page: TrainingActivity[] = await res.json();
      if (id !== request.current) return; // the filters changed meanwhile
      setTotal(Number(res.headers.get('X-Total-Count') ?? page.length));
      setSessions(current => (offset === 0 ? page : [...current, ...page]));
    } catch (err) {
      if (id === request.current) fail(err);
    } finally {
      if (id === request.current) setLoadingSessions(false);
    }
  }, [listParams, fail]);

  useEffect(() => { fetchPage(0); }, [fetchPage]);

  const yearlyTotals = useMemo(() => totalsByPeriod(yearly ?? []), [yearly]);
  const years = useMemo(() => yearlyTotals.map(y => y.period), [yearlyTotals]);
  const chartTotals = period === 'year' ? yearlyTotals : totalsByPeriod(chartRows);
  const chartPeriods = range ? periodsIn(period as 'week' | 'month', range.from, range.to) : [...years].reverse();

  const choosePeriod = (p: Period) => { setPeriod(p); setSelectedPeriod(null); };
  const chooseChartYear = (y: string) => {
    if (period === 'year') return;
    setChartYear(c => ({ ...c, [period]: y }));
    setSelectedPeriod(null);
  };
  const selectBar = (p: string) => {
    setSelectedPeriod(current => (current === p ? null : p));
    document.getElementById('training-sessions')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  // Race rows open the Strava activity's popup; the Strava list is fetched on the first click
  const openRaceSession = async (a: TrainingActivity) => {
    if (!a.race_activity_id) return;
    let byId = races;
    if (!byId) {
      try {
        const data = await getJson<StravaActivityJSON[]>(STRAVA_ACTIVITIES);
        byId = new Map(data.map(d => [d.id, new Activity(d)]));
        setRaces(byId);
      } catch {
        return;
      }
    }
    const race = byId.get(a.race_activity_id);
    if (race) setOpenRace(race);
  };

  if (error) return <div className="running-page">Error: {error}</div>;
  if (!yearly) return <div className="running-page">Loading training...</div>;

  return (
    <div className="running-page training-page">
      <div className="running-header">
        <div className="header-content">
          <h1>Training</h1>
        </div>
        <p className="training-note">Every session recorded on my watch since 2018, by day and sport. Published a week late, without routes, times or places.</p>
      </div>

      <section className="training-section">
        <div className="training-controls">
          <div className="unit-toggle">
            {PERIODS.map(p => (
              <button key={p} className={`toggle-btn ${period === p ? 'active' : ''}`} onClick={() => choosePeriod(p)}>
                {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
          {period !== 'year' && (
            <select aria-label="Chart range" className="chart-range" value={chartYear[period]} onChange={e => chooseChartYear(e.target.value)}>
              <option value="recent">{RECENT_LABEL[period]}</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <div className="unit-toggle">
            <button className={`toggle-btn ${metric === 'distance' ? 'active' : ''}`} onClick={() => setMetric('distance')}>Distance</button>
            <button className={`toggle-btn ${metric === 'moving_time' ? 'active' : ''}`} onClick={() => setMetric('moving_time')}>Time</button>
          </div>
        </div>
        <VolumeChart periods={chartPeriods} totals={chartTotals} period={period} metric={metric} selected={selectedPeriod} onSelect={selectBar} />
        <div className="chart-legend">
          {SPORT_GROUPS.map(g => (
            <span key={g.key}><i style={{ background: g.color }} />{g.label}</span>
          ))}
          <label className="races-only include-races">
            <input
              type="checkbox"
              checked={includeRaces}
              onChange={e => { setIncludeRaces(e.target.checked); if (!e.target.checked) setRacesOnly(false); }}
            />
            Include races
          </label>
        </div>
        <p className="training-note chart-hint">Click a bar to list its sessions.</p>
      </section>

      <section className="training-section">
        <h2>Totals by year{includeRaces ? '' : ' (training only)'}</h2>
        <table className="activities-table training-table">
          <thead>
            <tr>
              <th>Year</th>
              {SPORT_GROUPS.slice(0, 4).map(g => <th key={g.key}>{g.label}</th>)}
              <th>Total time</th>
            </tr>
          </thead>
          <tbody>
            {yearlyTotals.map(y => (
              <tr key={y.period}>
                <td>{y.period}</td>
                {SPORT_GROUPS.slice(0, 4).map(g => {
                  const t = y.byGroup[g.key];
                  return <td key={g.key}>{t ? `${formatKm(t.distance)} · ${t.count}` : '–'}</td>;
                })}
                <td>{formatDuration(Object.values(y.byGroup).reduce((s, t) => s + t.moving_time, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="training-section" id="training-sessions">
        <div className="training-controls">
          <h2>Sessions</h2>
          {selectedPeriod && (
            <span className="filter-chip">
              {periodLabel(selectedPeriod, period, true)}
              <button aria-label="Clear period filter" onClick={() => setSelectedPeriod(null)}>×</button>
            </span>
          )}
          <div className="training-filters">
            <select aria-label="Sport" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
              <option value="all">All sports</option>
              {SPORT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <select aria-label="Year" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="all">All years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className="races-only">
              <input type="checkbox" checked={racesOnly} disabled={!includeRaces} onChange={e => setRacesOnly(e.target.checked)} />
              Races only
            </label>
          </div>
        </div>
        <table className="activities-table training-table">
          <thead>
            <tr><th>Date</th><th>Sport</th><th>Distance</th><th>Time</th><th>Pace</th><th>Elevation</th></tr>
          </thead>
          <tbody>
            {sessions.map((a, i) => (
              <tr
                key={`${a.date}-${i}`}
                className={a.race_activity_id ? 'race-row' : undefined}
                onClick={a.race_activity_id ? () => openRaceSession(a) : undefined}
                title={a.race_activity_id ? 'Show the race' : undefined}
              >
                <td>{new Date(`${a.date}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</td>
                <td>
                  <i className="sport-dot" style={{ background: sportGroup(a.sport).color }} />{sportLabel(a.sport)}
                  {a.race === 1 && <span className="race-badge">Race</span>}
                </td>
                <td>{formatKm(a.distance)}</td>
                <td>{formatDuration(a.moving_time)}</td>
                <td>{formatPace(a)}</td>
                <td>{a.elevation_gain == null ? '–' : `${Math.round(a.elevation_gain)} m`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="training-note">
          {loadingSessions && sessions.length === 0 ? 'Loading sessions...' : `${sessions.length} of ${total} sessions`}
          {sessions.length < total && (
            <button className="toggle-btn show-more" disabled={loadingSessions} onClick={() => fetchPage(sessions.length)}>
              {loadingSessions ? 'Loading...' : 'Show more'}
            </button>
          )}
        </p>
      </section>

      {openRace && (
        <ActivityModal
          activity={openRace}
          unitSystem="metric"
          onClose={() => setOpenRace(null)}
          pageUrl={racePages[openRace.id] ? racePageUrl(racePages[openRace.id]) : undefined}
        />
      )}
    </div>
  );
};

export default Training;
