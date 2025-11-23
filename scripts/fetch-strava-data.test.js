import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock node-fetch or global fetch.
// Since the script runs in Node, it likely uses global fetch in Node 18+.
// However, unit testing a script file directly is tricky because it executes on import.
// I will create a testable version of the logic or just mock the network calls and
// modify the script to export functions if feasible, OR I'll test the logic by
// reading the script file and eval-ing it (messy) or better yet, refactor the script
// to export functions and run main only if called directly.

// Refactoring the script slightly to export functions would be better for testing.
// But for now, I will write a test that mocks the globals and requires the script?
// "scripts/fetch-strava-data.js" is an ES module.

// Let's assume I modify the script to export the functions first.
// I will rewrite the script slightly in the next step to export functions,
// but for now I'll write the test assuming I can import them.

// Since I cannot easily import a script that runs immediately without side effects,
// I will rename the script logic to a module and have the script import and run it.
// OR I can use `vi.mock` to mock the environment variables and fetch.

// Let's try to verify the logic by creating a separate testable module or
// just refactoring the script in the next step if I can.
// Actually, I'll refactor the script in the next `overwrite_file_with_block` call
// to export functions and check `if (process.argv[1] === fileURLToPath(import.meta.url))`
// or similar.

// Wait, the plan step is "Test Strava Fetch Script Logic".
// So I will first Refactor the script to be testable, then write the test.

import { fetchActivities, getAccessToken } from '../scripts/fetch-strava-data.js'; // This will be possible after refactor

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
