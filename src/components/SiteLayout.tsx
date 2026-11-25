// The frame of every page but the homepage: his name (home), the same five places, and the
// colour-scheme choice (the site has no settings page, so it is the compact one in the header).
// No sidebar: five links do not need an app shell. The page's own photo, where it has one, is a
// band under this header (PhotoBand), and its palette colours the page.
import { Link, NavLink, Outlet } from 'react-router';
import { ColorSchemeChoice, cn } from 'strata-react';

const PLACES = [
  { label: 'Running', to: '/running' },
  { label: 'Training', to: '/training' },
];
const ELSEWHERE = [
  { label: 'Strava', href: 'https://www.strava.com/athletes/jburnhams' },
  { label: 'YouTube', href: 'https://www.youtube.com/@JonathanBurnhams' },
  { label: 'GitHub', href: 'https://github.com/jburnhams' },
];

const link = 'type-label text-muted-foreground underline decoration-transparent decoration-2 underline-offset-4 transition-state hover:text-foreground hover:decoration-primary';

export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 md:px-8">
          <Link to="/" className="type-name-sm">Jonathan Burnhams</Link>
          <nav aria-label="Site" className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
            {PLACES.map(p => (
              <NavLink key={p.to} to={p.to} className={({ isActive }) => cn(link, isActive && 'text-foreground decoration-primary')}>
                {p.label}
              </NavLink>
            ))}
            {ELSEWHERE.map(p => <a key={p.href} href={p.href} className={link}>{p.label}</a>)}
          </nav>
          <ColorSchemeChoice compact />
        </div>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
