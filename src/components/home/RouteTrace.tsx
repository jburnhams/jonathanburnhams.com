// The pictured race's route as a small line in the photo's own accent (the signature move in
// DESIGN.md): its shape is the race's, so it says which race this is before the words do.
// Decorative beside the race's name, so hidden from screen readers.
import { cn } from 'strata-react';

export function RouteTrace({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="-4 -4 108 108" aria-hidden className={cn('shrink-0 text-ink-accent', className)} data-testid="route-trace">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
