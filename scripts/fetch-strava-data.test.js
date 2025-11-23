import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchActivities, getAccessToken } from '../scripts/fetch-strava-data.js';

describe('Strava Fetch Script', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    process.env.STRAVA_CLIENT_ID = 'client_id';
    process.env.STRAVA_CLIENT_SECRET = 'client_secret';
    process.env.STRAVA_REFRESH_TOKEN = 'refresh_token';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('getAccessToken exchanges refresh token for access token', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new_access_token' }),
    });

    const token = await getAccessToken();
    expect(token).toBe('new_access_token');
    expect(global.fetch).toHaveBeenCalledWith('https://www.strava.com/oauth/token', expect.any(Object));
  });

  it('fetchActivities handles pagination and returns all activities', async () => {
    // Page 1
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }, { id: 2 }],
    });
    // Page 2 (empty)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const activities = await fetchActivities('token');
    expect(activities).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
