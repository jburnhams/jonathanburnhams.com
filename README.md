# Jonathan Burnhams - Personal Homepage

A modern personal homepage built with React, TypeScript, and Vite.

## Features

- **Strava Integration**: Fetches and displays running activities at build time.
- **Responsive Design**: Animated hero section and mobile-friendly layout.
- **Tech Stack**: React 18, TypeScript, Vite 5, Node 20+.
- **Automated Deployment**: Configured for Cloudflare Pages with GitHub Actions CI.

## Getting Started

### Prerequisites

- Node.js 20 or higher

### Installation

```bash
git clone https://github.com/yourusername/jonathanburnhams.com.git
cd jonathanburnhams.com
npm install
```

### Local Development

1. Create a `.env` file with your Strava credentials (optional for local dev, but required for data fetching):
   ```env
   STRAVA_CLIENT_ID=your_id
   STRAVA_CLIENT_SECRET=your_secret
   STRAVA_REFRESH_TOKEN=your_token
   ```
2. Start the server:
   ```bash
   npm run dev
   ```

### Building

The build process fetches Strava data automatically:

```bash
npm run build
```

### Testing

```bash
npm test
npm run lint
```

## Race pages

Every run over 20 km on the Running page gets its own static page at `/running/<year>-<name>/` (e.g. `/running/2026-tor-des-geants/`; the Strava id is added only when two races would share a name and year). They are generated at build time by `scripts/build-race-pages.mjs` (after `vite build`) from the strava-sync API (`https://stravasync.jonathanburnhams.com/api/users/7828229/activities`):

- each page has its own `<title>`, meta description, canonical link, Open Graph tags (first photo as the image) and JSON-LD (`SportsEvent`), plus the race's text and photo links in the HTML, so search engines see it without JavaScript; the app then shows the full page (stats, description, photos, map);
- `dist/running/index.html` is a crawlable list of all race pages, `dist/sitemap.xml` lists every page (`public/robots.txt` points to it), and `dist/race-pages.json` maps Strava ids to pages (used by the Running list, the photo carousels and old `/running?activity=<id>` links, which redirect).
- If the API can't be reached during the build, the site still builds, without race pages (everything falls back to the popup).

**The pages only change when the site is rebuilt, so redeploy after each Strava export import.** Either push any commit to `main`, use "Retry deployment" in the Cloudflare Pages dashboard, or (suggested, not set up) create a deploy hook in Pages (Settings > Builds > Deploy hooks) and call it at the end of the import:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/<hook id>"
```

Keep the hook URL out of git: it is enough to trigger a deploy.
