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
