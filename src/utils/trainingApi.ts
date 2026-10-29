import { TRAINING_API, TrainingPeriod } from '../models/Training';

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch training data');
  return res.json();
}

// Summary responses are small and don't change while the page is open, so each is fetched once
const summaryCache = new Map<string, Promise<TrainingPeriod[]>>();
export function getSummary(params: Record<string, string>): Promise<TrainingPeriod[]> {
  const url = `${TRAINING_API}/summary?${new URLSearchParams(params)}`;
  if (!summaryCache.has(url)) {
    summaryCache.set(url, getJson<TrainingPeriod[]>(url).catch(err => { summaryCache.delete(url); throw err; }));
  }
  return summaryCache.get(url)!;
}
export const clearSummaryCache = () => summaryCache.clear();

