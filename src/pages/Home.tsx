// The homepage (Experience mode, DESIGN.md). One job: say who this is and send the visitor to the
// races, training, films or code. A photo from one of his races fills the window and sets the
// colours of everything on it; his name and the five places to go sit on one solid panel made
// from the photo's main colour; the photo's caption (which race, when, its route) is the only
// other text, and "Another photo" changes the photo and with it the colours.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { backgrounds, rememberPhoto, usePhotoPalette, visitOrder, type Background } from '../backgrounds';
import { Backdrop } from '../components/home/Backdrop';
import { PhotoCaption, placeClass } from '../components/home/PhotoCaption';
import BuildTimestampBadge from '../components/BuildTimestampBadge/BuildTimestampBadge';

declare global {
  // Chosen by the inline script in <head> (scripts/backgrounds/first-photo.mjs), which has already asked for it
  interface Window { __FIRST_PHOTO__?: string }
}

const PLACES: { label: string; to?: string; href?: string }[] = [
  { label: 'Running', to: '/running' },
  { label: 'Training', to: '/training' },
  { label: 'Strava', href: 'https://www.strava.com/athletes/jburnhams' },
  { label: 'YouTube', href: 'https://www.youtube.com/@JonathanBurnhams' },
  { label: 'GitHub', href: 'https://github.com/jburnhams' },
];

const Home = ({ order: given }: { order?: Background[] }) => {
  const order = useMemo(() => given ?? visitOrder(backgrounds, window.__FIRST_PHOTO__), [given]);
  const [index, setIndex] = useState(0);
  const photo = order.length ? order[index % order.length] : undefined;
  usePhotoPalette(photo);
  useEffect(() => rememberPhoto(photo), [photo]);
  // Warm the next photo once this one is up, so "Another photo" is instant
  useEffect(() => {
    const next = order[(index + 1) % order.length];
    if (!next || order.length < 2) return;
    const t = setTimeout(() => {
      const img = new Image();
      img.sizes = '100vw';
      img.srcset = next.sizes.map(s => `/backgrounds/${next.id}-${s.width}.avif ${s.width}w`).join(', ');
    }, 1500);
    return () => clearTimeout(t);
  }, [order, index]);

  return (
    // The panel is in the photo palette's dark scheme whatever the device's, because it is always
    // a deep tone of the photo: `dark` here makes strata's controls inside it use their dark roles.
    <div className="dark">
      <main data-photo={photo?.id} className="relative flex min-h-dvh flex-col bg-ink text-ink-foreground md:block">
        {photo && <Backdrop photo={photo} className="photo-band relative shrink-0 md:absolute md:inset-0 md:h-auto" />}
        <div className="relative flex flex-1 flex-col justify-end gap-4 p-4 md:absolute md:inset-x-0 md:bottom-0 md:flex-row md:items-end md:justify-between md:p-8">
          <section aria-labelledby="name" className="grid gap-5 rounded-surface bg-ink md:max-w-2xl md:p-8">
            <h1 id="name" className="type-name text-balance">Jonathan Burnhams</h1>
            <nav aria-label="Elsewhere">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {PLACES.map(p => (
                  <li key={p.label}>
                    {p.to
                      ? <Link to={p.to} className={placeClass}>{p.label}</Link>
                      : <a href={p.href} className={placeClass}>{p.label}</a>}
                  </li>
                ))}
              </ul>
            </nav>
          </section>
          <div className="grid gap-2 md:max-w-md">
            {photo && <PhotoCaption photo={photo} canChange={order.length > 1} onNext={() => setIndex(i => (i + 1) % order.length)} />}
            <BuildTimestampBadge />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
