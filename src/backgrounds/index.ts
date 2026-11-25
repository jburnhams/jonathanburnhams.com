// The background photos and their colour schemes, built by scripts/backgrounds/backgrounds.mjs
// (see DESIGN.md). backgrounds.json and palettes.css are generated; this is the code that uses them.
import { useEffect } from 'react';
import manifest from './backgrounds.json';

export interface Background {
  id: string;
  width: number;
  height: number;
  source: 'strava-sync' | 'export';
  /** object-position, so the subject survives the crop */
  focus: string;
  caption?: string;
  activity: {
    id: number;
    name: string | null;
    date: string | null;
    type?: string | null;
    distance?: number | null; // metres
    elevation?: number | null; // metres
    /** the route in a 100 x 100 box, as SVG path data */
    route?: string | null;
  };
  sizes: { width: number; avif: number; webp: number }[];
  placeholder: string;
  colours: { mean: string; ink: string; inkText: string; primary: string; secondary: string };
}

export const backgrounds = manifest as unknown as Background[];

/** `srcset` for one format: every width that was built. */
export function srcSet(b: Background, format: 'avif' | 'webp'): string {
  return b.sizes.map(s => `/backgrounds/${b.id}-${s.width}.${format} ${s.width}w`).join(', ');
}

/** The largest WebP, for a plain `src` and for Open Graph. */
export function largest(b: Background): string {
  return `/backgrounds/${b.id}-${b.sizes[b.sizes.length - 1].width}.webp`;
}

/** A background from the given race, if one of its photos is in the set. */
export function backgroundFor(activityId: number | undefined): Background | undefined {
  return activityId === undefined ? undefined : backgrounds.find(b => b.activity.id === activityId);
}

/**
 * The order the homepage shows them in: a fresh shuffle per visit, so a returning visitor sees a
 * different race first. `random` is for tests.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Puts the photo's palette on the page: `data-photo` on <body> selects its block in palettes.css
 * (on body, not a wrapper, so dialogs and popovers portalled to body take it too). Removed when
 * the page that set it goes, so a page without a photo is back on strata's default look.
 */
export function usePhotoPalette(b: Background | undefined) {
  useEffect(() => {
    if (!b) return;
    document.body.dataset.photo = b.id;
    return () => {
      if (document.body.dataset.photo === b.id) delete document.body.dataset.photo;
    };
  }, [b]);
}
