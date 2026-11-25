// Training. Question: "How much does he train, and at what?" Every session from his watch since
// 2018, by day and sport, published a week late without routes, times or places (strava-sync's
// /api/training). The chart's bars are weeks, months or years stacked by sport; choosing a bar
// lists its sessions below. Sports are coloured by the chart roles of the page's palette.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, DataTable, EmptyState, LoadError, NativeSelect, Skeleton, TextLink, ToggleGroup, format } from 'strata-react';
import {
  Period, PeriodTotals, SPORT_GROUPS, TRAINING_API, TrainingActivity, TrainingPeriod,
  chartRange, formatDuration, formatKm, formatPace, groupSports, periodLabel, periodRange, periodsIn,
  sportGroup, sportLabel, totalsByPeriod,
} from '../models/Training';
import { getSummary } from '../utils/trainingApi';
import { racePageUrl, useRacePages } from '../utils/racePages';
import { sessionPhoto, usePhotoPalette } from '../backgrounds';
import { PlainBand } from '../components/PhotoBand';

type Metric = 'distance' | 'moving_time';
const PAGE = 50;
const PERIODS = [{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }] as const;
const METRICS = [{ value: 'distance', label: 'Distance' }, { value: 'moving_time', label: 'Time' }] as const;
const RECENT_LABEL: Record<'week' | 'month', string> = { week: 'Last 12 months', month: 'Last 2 years' };

// Stacked bars per period (oldest left), one colour per sport group; press a bar to pick that period
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
    <svg className="w-full" viewBox={`0 0 ${width} ${height + 24}`} role="img" aria-label={`Training ${metric === 'distance' ? 'distance' : 'time'} per ${period}`}>
      <text x={0} y={12} className="fill-muted-foreground type-caption">{fmt(max)}</text>
      {bars.map((t, i) => {
        let y = height;
        return (
          <g
            key={t.period}
            data-testid="volume-bar"
            className={`cursor-pointer transition-state ${selected && selected !== t.period ? 'opacity-30' : ''}`}
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
              <text x={i * barW + barW / 2} y={height + 16} textAnchor="middle" className="fill-muted-foreground type-caption">{periodLabel(t.period, period)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const yearTotal = (y: PeriodTotals) => Object.values(y.byGroup).reduce((s, t) => s + t.moving_time, 0);

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
  const racePages = useRacePages();
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
    document.getElementById('training-sessions')?.scrollIntoView?.({ block: 'start' });
  };

  usePhotoPalette(sessionPhoto());
  const intro = 'Every session recorded on my watch since 2018, by day and sport. Published a week late, without routes, times or places.';

  if (error) {
    return (
      <>
        <PlainBand title="Training">{intro}</PlainBand>
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8" role="alert">
          <LoadError message="The training log could not be read from strava-sync." retry={() => { setError(null); fetchPage(0); getSummary({ period: 'year', ...raceParam }).then(setYearly).catch(fail); }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PlainBand title="Training">{intro}</PlainBand>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:px-8">
        {!yearly ? (
          <div className="grid gap-4" aria-busy>
            <Skeleton className="h-10 w-1/2" /><Skeleton className="h-64" /><Skeleton className="h-48" />
          </div>
        ) : (
          <>
            <section aria-label="Volume" className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <ToggleGroup label="Bars" options={PERIODS} value={period} onChange={v => choosePeriod(v as Period)} size="sm" />
                {period !== 'year' && (
                  <NativeSelect aria-label="Chart range" size="sm" value={chartYear[period]} onChange={e => chooseChartYear(e.target.value)}>
                    <option value="recent">{RECENT_LABEL[period]}</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </NativeSelect>
                )}
                <ToggleGroup label="Measure" options={METRICS} value={metric} onChange={v => setMetric(v as Metric)} size="sm" />
              </div>
              <VolumeChart periods={chartPeriods} totals={chartTotals} period={period} metric={metric} selected={selectedPeriod} onSelect={selectBar} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 type-body-sm text-muted-foreground">
                {SPORT_GROUPS.map(g => (
                  <span key={g.key} className="inline-flex items-center gap-1.5"><svg aria-hidden viewBox="0 0 10 10" className="size-2.5"><rect width="10" height="10" rx="2" fill={g.color} /></svg>{g.label}</span>
                ))}
                <Checkbox
                  label="Include races"
                  checked={includeRaces}
                  onCheckedChange={checked => { setIncludeRaces(checked); if (!checked) setRacesOnly(false); }}
                  className="ms-auto"
                />
              </div>
              <p className="type-body-sm text-muted-foreground">Choose a bar to list its sessions.</p>
            </section>

            <section aria-labelledby="totals" className="grid gap-3">
              <h2 id="totals" className="type-heading">Totals by year{includeRaces ? '' : ' (training only)'}</h2>
              <DataTable
                caption="Totals by year"
                rows={yearlyTotals}
                rowKey={y => y.period}
                columns={[
                  { key: 'year', header: 'Year', value: y => y.period },
                  ...SPORT_GROUPS.slice(0, 4).map(g => ({
                    key: g.key, header: g.label, numeric: true,
                    value: (y: PeriodTotals) => y.byGroup[g.key]?.distance ?? null,
                    cell: (y: PeriodTotals) => `${formatKm(y.byGroup[g.key]!.distance)}, ${format.count(y.byGroup[g.key]!.count, 'session')}`,
                  })),
                  { key: 'time', header: 'Total time', numeric: true, value: yearTotal, cell: y => formatDuration(yearTotal(y)) },
                ]}
              />
            </section>
          </>
        )}

        <section aria-labelledby="sessions" id="training-sessions" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="sessions" className="type-heading">Sessions</h2>
            {selectedPeriod && (
              <Button variant="outline" size="sm" onPress={() => setSelectedPeriod(null)} aria-label={`Show every period, not only ${periodLabel(selectedPeriod, period, true)}`}>
                {periodLabel(selectedPeriod, period, true)}: show all
              </Button>
            )}
            <div className="ms-auto flex flex-wrap items-center gap-3">
              <NativeSelect aria-label="Sport" size="sm" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
                <option value="all">All sports</option>
                {SPORT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </NativeSelect>
              <NativeSelect aria-label="Year" size="sm" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                <option value="all">All years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </NativeSelect>
              <Checkbox label="Races only" checked={racesOnly} disabled={!includeRaces} onCheckedChange={setRacesOnly} />
            </div>
          </div>
          {sessions.length === 0 && !loadingSessions ? (
            <EmptyState title="No sessions match">Change the sport or year, or show every period.</EmptyState>
          ) : (
            <DataTable
              caption="Training sessions"
              rows={sessions}
              rowKey={a => `${a.date}-${a.sport}-${a.distance}-${a.moving_time}`}
              columns={[
                { key: 'date', header: 'Date', value: a => a.date, cell: a => format.date(a.date) },
                {
                  key: 'sport', header: 'Sport', value: a => sportLabel(a.sport),
                  cell: a => (
                    <span className="inline-flex items-center gap-2">
                      <svg aria-hidden viewBox="0 0 10 10" className="size-2"><circle cx="5" cy="5" r="5" fill={sportGroup(a.sport).color} /></svg>
                      {sportLabel(a.sport)}
                      {a.race === 1 && (a.race_activity_id && racePages[a.race_activity_id]
                        ? <TextLink to={racePageUrl(racePages[a.race_activity_id])}>Race</TextLink>
                        : <span className="type-caption text-muted-foreground">Race</span>)}
                    </span>
                  ),
                },
                { key: 'distance', header: 'Distance', numeric: true, value: a => a.distance, cell: a => formatKm(a.distance) },
                { key: 'time', header: 'Time', numeric: true, value: a => a.moving_time, cell: a => formatDuration(a.moving_time) },
                { key: 'pace', header: 'Pace', numeric: true, sort: false, cell: a => formatPace(a) },
                { key: 'climb', header: 'Climb', numeric: true, value: a => a.elevation_gain, cell: a => `${Math.round(a.elevation_gain ?? 0)}\u00a0m` },
              ]}
            />
          )}
          <div className="flex flex-wrap items-center gap-3 type-body-sm text-muted-foreground">
            <span>{loadingSessions && sessions.length === 0 ? 'Reading sessions…' : `${format.integer(sessions.length)} of ${format.count(total, 'session')}`}</span>
            {sessions.length < total && (
              <Button variant="outline" size="sm" disabled={loadingSessions} onPress={() => fetchPage(sessions.length)}>
                {loadingSessions ? 'Reading more…' : 'Show more'}
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default Training;
