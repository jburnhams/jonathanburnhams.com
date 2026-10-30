// After vite build: a static page per race (dist/running/<slug>/index.html), a crawlable
// dist/running/index.html, dist/sitemap.xml and dist/race-pages.json (Strava id -> slug).
// Data comes from the strava-sync API at build time, so the pages change only when the
// site is rebuilt: redeploy after each Strava export import (see README).
// If the API can't be reached the build still succeeds, just without race pages.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ACTIVITIES_API, assignSlugs, raceList, racePage, runningIndexPage, sitemap } from './race-pages.mjs';

const DIST = path.resolve('dist');

async function run() {
  const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
  let activities;
  try {
    const res = await fetch(ACTIVITIES_API, { headers: { 'User-Agent': 'jonathanburnhams.com build' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    activities = await res.json();
  } catch (err) {
    console.warn(`[race-pages] Could not fetch activities (${err.message}); building without race pages.`);
    await writeFile(path.join(DIST, 'race-pages.json'), '{}\n');
    return;
  }
  const races = raceList(activities);
  const slugs = assignSlugs(races);
  for (const a of races) {
    const dir = path.join(DIST, 'running', slugs[a.id]);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), racePage(template, a, slugs[a.id]));
  }
  await mkdir(path.join(DIST, 'running'), { recursive: true });
  await writeFile(path.join(DIST, 'running', 'index.html'), runningIndexPage(template, races, slugs));
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(races, slugs));
  await writeFile(path.join(DIST, 'race-pages.json'), JSON.stringify(slugs) + '\n');
  console.log(`[race-pages] ${races.length} race pages, sitemap.xml and race-pages.json written.`);
}

run().catch((err) => {
  console.error('[race-pages] Failed:', err);
  process.exitCode = 1;
});
