// A page's photo as a band under the header: the same three layers as the homepage (Backdrop),
// the page's title and finding on the photo's ink at the bottom start, and the photo's caption at
// the bottom end. Its palette colours the rest of the page (usePhotoPalette).
import type { ReactNode } from 'react';
import type { Background } from '../backgrounds';
import { Backdrop } from './home/Backdrop';
import { PhotoCaption } from './home/PhotoCaption';

export function PhotoBand({ photo, title, children }: { photo: Background; title: string; children?: ReactNode }) {
  return (
    <div className="dark">
      <section data-photo={photo.id} aria-labelledby="page-title" className="relative grid min-h-80 content-end bg-ink text-ink-foreground md:min-h-96">
        <Backdrop photo={photo} className="absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="grid max-w-2xl gap-2 rounded-surface bg-ink p-5">
            <h1 id="page-title" className="type-title text-balance">{title}</h1>
            {children && <div className="type-body text-ink-muted">{children}</div>}
          </div>
          <PhotoCaption photo={photo} className="md:max-w-sm" />
        </div>
      </section>
    </div>
  );
}

/** The same place without a photo (none in the set yet): the title on the page's own ground. */
export function PlainBand({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="page-title" className="mx-auto grid max-w-6xl gap-2 px-4 pt-8 md:px-8">
      <h1 id="page-title" className="type-title text-balance">{title}</h1>
      {children && <div className="type-body text-muted-foreground">{children}</div>}
    </section>
  );
}
