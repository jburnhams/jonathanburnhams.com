// Static, search-friendly pages for each race, built from the strava-sync API.
// Pure functions here (tested in race-pages.test.js); build-race-pages.mjs writes the files.

export const SITE = 'https://www.jonathanburnhams.com';
export const ACTIVITIES_API = 'https://stravasync.jonathanburnhams.com/api/users/7828229/activities';
export const MIN_DISTANCE = 20000; // the same runs as the /running list

const details = (a) => a.data_json || {};

// The activities that get a page: runs over 20 km, newest first (as on /running)
export function raceList(activities) {
  return activities
    .filter((a) => (details(a).type || a.type) === 'Run' && (details(a).distance ?? a.distance) > MIN_DISTANCE)
    .sort((a, b) => localDate(b).localeCompare(localDate(a)));
}

export function localDate(a) {
  return String(details(a).start_date_local || a.start_date || '').slice(0, 10);
}

export function slugify(name) {
  return String(name || 'run')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .replace(/^(.{0,60})-.*$/, (all, head) => (all.length > 60 ? head : all)) // whole words up to 60 characters
    .slice(0, 60).replace(/-+$/, '') || 'run';
}

// id -> slug: "<year>-<name>", with "-<strava id>" added only when two races would share a slug
export function assignSlugs(races) {
  const base = new Map(races.map((a) => [a.id, `${localDate(a).slice(0, 4)}-${slugify(a.name)}`]));
  const counts = new Map();
  for (const s of base.values()) counts.set(s, (counts.get(s) || 0) + 1);
  return Object.fromEntries(races.map((a) => {
    const s = base.get(a.id);
    return [a.id, counts.get(s) > 1 ? `${s}-${a.id}` : s];
  }));
}

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON safe to put inside <script>
export const scriptJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function formatKm(m) {
  return `${(m / 1000).toFixed(m >= 100000 ? 0 : 1)} km`;
}

export function formatDuration(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function formatDate(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// One-line summary for the meta description: date, distance, time, elevation, then the start of the description
export function summary(a) {
  const d = details(a);
  const facts = [
    formatDate(localDate(a)),
    formatKm(d.distance ?? a.distance),
    d.moving_time ?? a.moving_time ? `${formatDuration(d.moving_time ?? a.moving_time)} moving` : '',
    d.total_elevation_gain ?? a.total_elevation_gain ? `${Math.round(d.total_elevation_gain ?? a.total_elevation_gain)} m climbing` : '',
  ].filter(Boolean).join(', ');
  const text = String(d.description || '').replace(/\s+/g, ' ').trim();
  const full = text ? `${a.name}: ${facts}. ${text}` : `${a.name}: ${facts}.`;
  return full.length > 160 ? `${full.slice(0, 157).replace(/\s+\S*$/, '')}…` : full;
}

export function jsonLd(a, url) {
  const d = details(a);
  const photo = (d.photos || [])[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: a.name,
    startDate: localDate(a),
    sport: 'Running',
    url,
    description: summary(a),
    ...(photo ? { image: photo.url } : {}),
    distance: { '@type': 'QuantitativeValue', value: Math.round((d.distance ?? a.distance) / 10) / 100, unitCode: 'KMT' },
    competitor: { '@type': 'Person', name: 'Jonathan Burnhams', url: SITE },
  };
}

// Replace the template's <title> and description, add canonical, Open Graph and JSON-LD,
// and put readable content (and the race's data) in #root for crawlers and the first paint
export function renderPage(template, { title, description, path, image, extraHead = '', body, data }) {
  const url = `${SITE}${path}`;
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    ...(image ? [`<meta property="og:image" content="${escapeHtml(image)}" />`, `<meta name="twitter:card" content="summary_large_image" />`] : []),
    extraHead,
  ].filter(Boolean).join('\n    ');
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (data !== undefined) html = html.replace('</body>', `  <script>window.__RACE__ = ${scriptJson(data)};</script>\n  </body>`);
  return html;
}

export function racePage(template, a, slug) {
  const d = details(a);
  const path = `/running/${slug}/`;
  const photos = (d.photos || []).filter((p) => p && p.url && p.thumb_url);
  const stats = [
    ['Date', formatDate(localDate(a))],
    ['Distance', formatKm(d.distance ?? a.distance)],
    ['Moving time', formatDuration(d.moving_time ?? a.moving_time ?? 0)],
    ['Elevation gain', `${Math.round(d.total_elevation_gain ?? a.total_elevation_gain ?? 0)} m`],
  ];
  const body = [
    `<main class="running-page race-page">`,
    `<p><a href="/running">← All runs</a></p>`,
    `<h1>${escapeHtml(a.name)}</h1>`,
    `<p>${stats.map(([k, v]) => `${k}: ${escapeHtml(v)}`).join(' · ')}</p>`,
    d.description ? `<p style="white-space: pre-line">${escapeHtml(d.description)}</p>` : '',
    photos.length ? `<p>${photos.map((p) => `<a href="${escapeHtml(p.url)}"><img src="${escapeHtml(p.thumb_url)}" alt="${escapeHtml(p.caption || a.name)}" width="160" loading="lazy" /></a>`).join(' ')}</p>` : '',
    `</main>`,
  ].filter(Boolean).join('\n');
  return renderPage(template, {
    title: `${a.name} (${localDate(a).slice(0, 4)}) | Jonathan Burnhams`,
    description: summary(a),
    path,
    image: photos[0]?.url,
    extraHead: `<script type="application/ld+json">${scriptJson(jsonLd(a, `${SITE}${path}`))}</script>`,
    body,
    data: { slug, activity: a },
  });
}

// /running itself: a crawlable list of links to every race page
export function runningIndexPage(template, races, slugs) {
  const items = races.map((a) => `<li><a href="/running/${slugs[a.id]}/">${escapeHtml(a.name)}</a> · ${escapeHtml(formatDate(localDate(a)))} · ${escapeHtml(formatKm(details(a).distance ?? a.distance))}</li>`);
  return renderPage(template, {
    title: 'Running | Jonathan Burnhams',
    description: `${races.length} ultra and long runs and races by Jonathan Burnhams, with maps, photos and race reports.`,
    path: '/running/',
    image: races.map((a) => (details(a).photos || [])[0]?.url).find(Boolean),
    body: `<main class="running-page"><h1>Running Activities</h1><ul>${items.join('')}</ul></main>`,
  });
}

export function sitemap(races, slugs) {
  const urls = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/running/` },
    { loc: `${SITE}/training` },
    ...races.map((a) => ({ loc: `${SITE}/running/${slugs[a.id]}/`, lastmod: localDate(a) })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
}
