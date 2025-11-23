import fs from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const OUTPUT_FILE = path.resolve('src/data/strava-activities.json');

export async function getAccessToken() {
  // We need to read env vars here to ensure they are picked up during test execution if mocked
  const cId = process.env.STRAVA_CLIENT_ID || CLIENT_ID;
  const cSecret = process.env.STRAVA_CLIENT_SECRET || CLIENT_SECRET;
  const rToken = process.env.STRAVA_REFRESH_TOKEN || REFRESH_TOKEN;

  if (!cId || !cSecret || !rToken) {
    throw new Error('Missing Strava credentials in environment variables.');
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: cId,
      client_secret: cSecret,
      refresh_token: rToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function fetchActivities(accessToken) {
  let page = 1;
  const perPage = 200; // Max allowed by Strava is usually 200
  let allActivities = [];
  let keepFetching = true;

  console.log('Fetching activities from Strava...');

  while (keepFetching) {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit exceeded
        console.warn('Rate limit exceeded. Saving what we have so far...');
        break;
      }
      const errorText = await response.text();
      throw new Error(`Failed to fetch activities page ${page}: ${response.status} ${errorText}`);
    }

    const activities = await response.json();

    if (activities.length === 0) {
      keepFetching = false;
    } else {
      // Filter sensitive data immediately
      const sanitizedActivities = activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        type: activity.type,
        workout_type: activity.workout_type,
        start_date_local: activity.start_date_local,
        distance: activity.distance,
        moving_time: activity.moving_time,
        total_elevation_gain: activity.total_elevation_gain,
        average_speed: activity.average_speed
        // map, start_latlng, end_latlng are explicitly excluded
      }));

      allActivities = allActivities.concat(sanitizedActivities);
      console.log(`Fetched page ${page}: ${activities.length} activities.`);
      page++;
    }
  }

  return allActivities;
}

export async function main() {
  try {
    // Check if running directly
    const cId = process.env.STRAVA_CLIENT_ID || CLIENT_ID;
    const cSecret = process.env.STRAVA_CLIENT_SECRET || CLIENT_SECRET;
    const rToken = process.env.STRAVA_REFRESH_TOKEN || REFRESH_TOKEN;

    if (!cId || !cSecret || !rToken) {
        console.warn('Strava credentials not found. Skipping fetch and writing empty/mock data.');
        try {
            await fs.access(OUTPUT_FILE);
            console.log('Existing data file found, keeping it.');
        } catch {
            console.log('Writing empty array to ' + OUTPUT_FILE);
            // Ensure directory exists
            await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
            await fs.writeFile(OUTPUT_FILE, JSON.stringify([], null, 2));
        }
        return;
    }

    const accessToken = await getAccessToken();
    const activities = await fetchActivities(accessToken);

    // Ensure directory exists
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(activities, null, 2));
    console.log(`Successfully wrote ${activities.length} activities to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error fetching Strava data:', error);
    process.exit(1);
  }
}

// Check if this module is the entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
