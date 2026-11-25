// MSW: every request the site makes, answered from fixtures.ts. Shared by all tests; a test puts
// the server in another state with server.use(...).
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ACTIVITIES_API } from '../data/activities'
import { TRAINING_API } from '../models/Training'
import { activities, racePages, sessions, weekly } from './fixtures'

/** Every training API request's query, in order, so a test can check what was asked for. */
export const trainingRequests: { path: string; params: Record<string, string> }[] = []

const keep = (q: URLSearchParams) => (sport: string, race: number, day: string) => {
  const sports = q.get('sport')?.split(',')
  return (!sports || sports.includes(sport))
    && (q.get('race') === null || race === Number(q.get('race')))
    && (!q.get('from') || day >= q.get('from')!) && (!q.get('to') || day <= q.get('to')!)
}

export const handlers = [
  http.get(ACTIVITIES_API, () => HttpResponse.json(activities)),
  http.get('*/race-pages.json', () => HttpResponse.json(racePages)),
  http.get(`${TRAINING_API}/activities`, ({ request }) => {
    const q = new URL(request.url).searchParams
    trainingRequests.push({ path: 'activities', params: Object.fromEntries(q) })
    const rows = sessions.filter(a => keep(q)(a.sport, a.race ?? 0, a.date))
    const offset = Number(q.get('offset') ?? 0), limit = Number(q.get('limit'))
    return HttpResponse.json(rows.slice(offset, offset + limit), { headers: { 'X-Total-Count': String(rows.length) } })
  }),
  http.get(`${TRAINING_API}/summary`, ({ request }) => {
    const q = new URL(request.url).searchParams
    trainingRequests.push({ path: 'summary', params: Object.fromEntries(q) })
    const len = { week: 10, month: 7, year: 4 }[q.get('period') as 'week']
    const sums = new Map<string, { period: string; sport: string; count: number; distance: number; moving_time: number; elevation_gain: number }>()
    for (const w of weekly.filter(w => keep(q)(w.sport, w.race, w.week))) {
      const key = `${w.week.slice(0, len)}|${w.sport}`
      const s = sums.get(key) ?? { period: w.week.slice(0, len), sport: w.sport, count: 0, distance: 0, moving_time: 0, elevation_gain: 0 }
      s.count += w.count; s.distance += w.distance; s.moving_time += w.moving_time; s.elevation_gain += w.elevation_gain
      sums.set(key, s)
    }
    return HttpResponse.json([...sums.values()].sort((a, b) => b.period.localeCompare(a.period)))
  }),
]

export const server = setupServer(...handlers)
