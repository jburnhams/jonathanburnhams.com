import { describe, it, expect } from 'vitest';
import {
  assignSlugs, escapeHtml, homePage, jsonLd, trainingPage, raceList, racePage, runningIndexPage, scriptJson, sitemap, slugify, summary,
} from './race-pages.mjs';

const TEMPLATE = `<!doctype html><html><head>
<meta charset="UTF-8" />
<meta name="description" content="Jonathan Burnhams - Personal Homepage" />
<title>Jonathan Burnhams</title>
<script type="module" src="/assets/index.js"></script>
</head><body><div id="root"></div></body></html>`;

const act = (id, name, day, km, extra = {}) => ({
  id, name, type: 'Run', start_date: `${day}T08:00:00Z`, distance: km * 1000, moving_time: 3600 * km / 10, total_elevation_gain: 100,
  data_json: { name, type: 'Run', start_date_local: `${day}T09:00:00Z`, distance: km * 1000, moving_time: 3600 * km / 10, total_elevation_gain: 100, ...extra },
});

describe('race pages', () => {
  it('makes readable slugs', () => {
    expect(slugify('Tor Des Géants')).toBe('tor-des-geants');
    expect(slugify('Capital to Country to Capital')).toBe('capital-to-country-to-capital');
    expect(slugify('Ultra (FKT) - Shoeburyness & Canvey!')).toBe('ultra-fkt-shoeburyness-and-canvey');
    expect(slugify('Azores Triangle Adventure Day 1 - From the vineyards to the mountains')).toBe('azores-triangle-adventure-day-1-from-the-vineyards-to-the');
    expect(slugify('')).toBe('run');
  });

  it('lists runs over 20 km, newest first, and adds the id only on a slug clash', () => {
    const races = raceList([
      act(1, 'Half', '2023-01-07', 21.1), act(2, 'Half', '2023-03-04', 21.1), act(3, 'Tor Des Geants', '2026-09-13', 359),
      act(4, 'Parkrun', '2025-05-01', 5), { ...act(5, 'Ride', '2025-06-01', 100), type: 'Ride', data_json: { type: 'Ride', distance: 100000 } },
    ]);
    expect(races.map(a => a.id)).toEqual([3, 2, 1]);
    expect(assignSlugs(races)).toEqual({ 3: '2026-tor-des-geants', 2: '2023-half-2', 1: '2023-half-1' });
  });

  it('builds a page with its own title, description, canonical, Open Graph, JSON-LD and content', () => {
    const a = act(20235667026, 'Tor Des Geants <3', '2026-09-13', 358.7, {
      description: 'Line one\nLine "two"',
      photos: [{ id: 'p', url: 'https://x/api/photos/p', thumb_url: 'https://x/api/photos/p?size=thumb', width: 1200, height: 800 }],
    });
    const html = racePage(TEMPLATE, a, '2026-tor-des-geants');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<title>Tor Des Geants &lt;3 (2026) | Jonathan Burnhams</title>');
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html).toContain('<link rel="canonical" href="https://www.jonathanburnhams.com/running/2026-tor-des-geants/" />');
    expect(html).toContain('<meta property="og:image" content="https://x/api/photos/p" />');
    expect(html).toContain('<h1>Tor Des Geants &lt;3</h1>');
    expect(html).toContain('Line one\nLine &quot;two&quot;');
    expect(html).toContain('<img src="https://x/api/photos/p?size=thumb"');
    expect(html).toContain('<a href="/running">← All runs</a>');
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>'); // the app still loads
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    expect(ld).toMatchObject({ '@type': 'SportsEvent', name: 'Tor Des Geants <3', startDate: '2026-09-13', image: 'https://x/api/photos/p', distance: { value: 358.7, unitCode: 'KMT' } });
    const data = html.match(/window\.__RACE__ = (.*?);<\/script>/)[1];
    expect(data).not.toContain('<');
    expect(JSON.parse(data)).toMatchObject({ slug: '2026-tor-des-geants', activity: { id: 20235667026 } });
  });

  it('writes a short description and escapes everything', () => {
    const long = act(1, 'Spine', '2024-01-14', 431, { description: 'x '.repeat(200) });
    expect(summary(long).length).toBeLessThanOrEqual(160);
    expect(summary(act(1, 'Spine', '2024-01-14', 431))).toBe('Spine: 14 January 2024, 431 km, 43h 06m moving, 100 m climbing.');
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(scriptJson({ s: '</script><b>\u2028' })).toBe('{"s":"\\u003c/script>\\u003cb>\\u2028"}');
    expect(jsonLd(long, 'u')).not.toHaveProperty('image');
  });

  it('builds a crawlable /running index and a sitemap of every page', () => {
    const races = raceList([act(1, 'A', '2025-01-01', 50), act(2, 'B', '2026-01-01', 100)]);
    const slugs = assignSlugs(races);
    const index = runningIndexPage(TEMPLATE, races, slugs);
    expect(index).toContain('<a href="/running/2026-b/">B</a>');
    expect(index).toContain('<link rel="canonical" href="https://www.jonathanburnhams.com/running/" />');
    const xml = sitemap(races, slugs);
    expect(xml.match(/<url>/g)).toHaveLength(5);
    expect(xml).toContain('<url><loc>https://www.jonathanburnhams.com/running/2025-a/</loc><lastmod>2025-01-01</lastmod></url>');
  });

  it('puts plain links to /running/ and /training in the homepage HTML, matching the Hero markup', () => {
    const html = homePage(TEMPLATE);
    expect(html).toContain('<a href="/running/" class="hero-link">');
    expect(html).toContain('<a href="/training/" class="hero-link">');
    expect(html).toContain('<span class="hero-name">Jonathan Burnhams</span>');
    expect(html).toContain('<title>Jonathan Burnhams</title>'); // head unchanged
    expect(html.match(/id="root"/g)).toHaveLength(1);
  });

  it('gives /training/ its own page without the homepage hero', () => {
    const html = trainingPage(TEMPLATE);
    expect(html).toContain('<title>Training | Jonathan Burnhams</title>');
    expect(html).toContain('<link rel="canonical" href="https://www.jonathanburnhams.com/training/" />');
    expect(html).toContain('<div id="root"></div>');
  });
});
