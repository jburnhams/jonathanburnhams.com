// The caption every background carries (DESIGN.md, signature move): the pictured race's route in
// the photo's accent, its name (a link to its page when it has one), when and how far, and, where
// the visitor can change it, "Another photo". Drawn on the photo's ink.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, cn, format } from 'strata-react';
import type { Background } from '../../backgrounds';
import { getRacePages, racePageUrl } from '../../utils/racePages';
import { RouteTrace } from './RouteTrace';

/** A link on the ink: its own ink, underlined in the photo's accent on hover. */
export const placeClass = 'type-heading underline decoration-transparent decoration-2 underline-offset-4 transition-state hover:decoration-ink-accent';

export function PhotoCaption({ photo, onNext, canChange = false, className }: { photo: Background; onNext?: () => void; canChange?: boolean; className?: string }) {
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  useEffect(() => { getRacePages().then(setSlugs); }, []);
  const a = photo.activity;
  const slug = slugs[String(a.id)];
  const facts = [
    a.date ? format.date(a.date) : null,
    a.distance ? format.distance(a.distance) : null,
    a.elevation ? `${format.integer(Math.round(a.elevation))} m climb` : null,
  ].filter(Boolean);
  return (
    <figure className={cn('flex items-center gap-4 rounded-surface bg-ink p-4 text-ink-foreground', className)}>
      {a.route && <RouteTrace path={a.route} className="size-14" />}
      <figcaption className="grid min-w-0 gap-0.5">
        {a.name && (
          slug
            ? <Link to={racePageUrl(slug)} className={cn(placeClass, 'type-label underline decoration-ink-accent')}>{a.name}</Link>
            : <span className="type-label">{a.name}</span>
        )}
        {facts.length > 0 && <span className="type-caption text-ink-muted">{facts.join(', ')}</span>}
        {photo.caption && <span className="type-caption text-ink-muted">{photo.caption}</span>}
      </figcaption>
      {canChange && onNext && (
        <Button variant="outline" size="sm" onPress={onNext} className="ms-auto shrink-0">
          Another photo
        </Button>
      )}
    </figure>
  );
}
