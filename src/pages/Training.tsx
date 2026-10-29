import { useEffect, useMemo, useState } from 'react';
import {
  Period, PeriodTotals, SPORT_GROUPS, TRAINING_API, TrainingActivity, TrainingPeriod,
  formatDuration, formatKm, formatPace, periodLabel, sportGroup, sportLabel, totalsByPeriod,
} from '../models/Training';
import './Running.css';
import './Training.css';

type Metric = 'distance' | 'moving_time';
const BARS: Record<Period, number> = { week: 52, month: 36, year: 20 };
const PAGE = 100;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch training data');
  return res.json();
}

// Stacked bars per period (oldest left), one colour per sport group
function VolumeChart({ totals, period, metric }: { totals: PeriodTotals[]; period: Period; metric: Metric }) {
  const bars = totals.slice(0, BARS[period]).reverse();
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
          <g key={t.period} data-testid="volume-bar">
            <title>{`${periodLabel(t.period, period)}: ${SPORT_GROUPS.filter(g => value(t, g.key)).map(g => `${g.label} ${fmt(value(t, g.key))}`).join(', ')}`}</title>
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

const Training = () => {
  const [summary, setSummary] = useState<Record<Period, TrainingPeriod[]>>({ week: [], month: [], year: [] });
  const [activities, setActivities] = useState<TrainingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [metric, setMetric] = useState<Metric>('distance');
  const [groupFilter, setGroupFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [racesOnly, setRacesOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    Promise.all([
      ...(['week', 'month', 'year'] as Period[]).map(p => getJson<TrainingPeriod[]>(`${TRAINING_API}/summary?period=${p}`)),
      getJson<TrainingActivity[]>(`${TRAINING_API}/activities`),
    ])
      .then(([week, month, year, acts]) => {
        setSummary({ week: week as TrainingPeriod[], month: month as TrainingPeriod[], year: year as TrainingPeriod[] });
        setActivities(acts as TrainingActivity[]);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'An error occurred'))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => totalsByPeriod(summary[period]), [summary, period]);
  const yearly = useMemo(() => totalsByPeriod(summary.year), [summary]);
  const years = useMemo(() => [...new Set(activities.map(a => a.date.slice(0, 4)))].sort().reverse(), [activities]);
  const filtered = useMemo(
    () => activities.filter(a =>
      (groupFilter === 'all' || sportGroup(a.sport).key === groupFilter) &&
      (yearFilter === 'all' || a.date.startsWith(yearFilter)) &&
      (!racesOnly || a.race === 1)),
    [activities, groupFilter, yearFilter, racesOnly]
  );

  if (loading) return <div className="running-page">Loading training...</div>;
  if (error) return <div className="running-page">Error: {error}</div>;

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
            {(['week', 'month', 'year'] as Period[]).map(p => (
              <button key={p} className={`toggle-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
          <div className="unit-toggle">
            <button className={`toggle-btn ${metric === 'distance' ? 'active' : ''}`} onClick={() => setMetric('distance')}>Distance</button>
            <button className={`toggle-btn ${metric === 'moving_time' ? 'active' : ''}`} onClick={() => setMetric('moving_time')}>Time</button>
          </div>
        </div>
        <VolumeChart totals={totals} period={period} metric={metric} />
        <div className="chart-legend">
          {SPORT_GROUPS.map(g => (
            <span key={g.key}><i style={{ background: g.color }} />{g.label}</span>
          ))}
        </div>
      </section>

      <section className="training-section">
        <h2>Totals by year</h2>
        <table className="activities-table training-table">
          <thead>
            <tr>
              <th>Year</th>
              {SPORT_GROUPS.slice(0, 4).map(g => <th key={g.key}>{g.label}</th>)}
              <th>Total time</th>
            </tr>
          </thead>
          <tbody>
            {yearly.map(y => (
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

      <section className="training-section">
        <div className="training-controls">
          <h2>Sessions</h2>
          <div className="training-filters">
            <select aria-label="Sport" value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setShown(PAGE); }}>
              <option value="all">All sports</option>
              {SPORT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <select aria-label="Year" value={yearFilter} onChange={e => { setYearFilter(e.target.value); setShown(PAGE); }}>
              <option value="all">All years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className="races-only">
              <input type="checkbox" checked={racesOnly} onChange={e => { setRacesOnly(e.target.checked); setShown(PAGE); }} />
              Races only
            </label>
          </div>
        </div>
        <table className="activities-table training-table">
          <thead>
            <tr><th>Date</th><th>Sport</th><th>Distance</th><th>Time</th><th>Pace</th><th>Elevation</th></tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map((a, i) => (
              <tr key={`${a.date}-${i}`}>
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
          {Math.min(shown, filtered.length)} of {filtered.length} sessions
          {shown < filtered.length && (
            <button className="toggle-btn show-more" onClick={() => setShown(s => s + PAGE)}>Show more</button>
          )}
        </p>
      </section>
    </div>
  );
};

export default Training;
