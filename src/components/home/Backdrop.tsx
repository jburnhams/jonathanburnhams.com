// The photo that fills the homepage. Three layers, so the first frame already has the photo's
// colours and nothing jumps (DESIGN.md, Images and speed): the photo's mean colour as the ground,
// the 32 px placeholder from the manifest stretched and blurred over it, then the real image in a
// <picture> (AVIF, else WebP, every built width, sizes="100vw" so the browser takes the one it
// needs), faded in once it has decoded. Changing photo keeps the old one underneath until the new
// one is ready, so a slow connection never shows a blank.
import { useState } from 'react';
import { cn } from 'strata-react';
import { largest, srcSet, type Background } from '../../backgrounds';

function Layer({ photo, onReady, ready, priority }: { photo: Background; onReady: () => void; ready: boolean; priority: boolean }) {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: photo.colours.mean }}>
      <img src={photo.placeholder} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-2xl" style={{ objectPosition: photo.focus }} />
      <picture>
        <source type="image/avif" srcSet={srcSet(photo, 'avif')} sizes="100vw" />
        <source type="image/webp" srcSet={srcSet(photo, 'webp')} sizes="100vw" />
        <img
          src={largest(photo)}
          alt={photo.caption ?? `A photo from ${photo.activity.name ?? 'a race'}`}
          width={photo.width}
          height={photo.height}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={onReady}
          ref={img => { if (img?.complete && img.naturalWidth) onReady(); }}
          className={cn('photo-fade absolute inset-0 size-full object-cover', ready ? 'opacity-100' : 'opacity-0')}
          style={{ objectPosition: photo.focus }}
        />
      </picture>
    </div>
  );
}

/** The photo, full-bleed in its positioned parent. */
export function Backdrop({ photo, className }: { photo: Background; className?: string }) {
  const [shown, setShown] = useState<Background>(photo); // the one fully drawn
  const [ready, setReady] = useState<Record<string, boolean>>({});
  // Swap once the new photo has loaded: state adjusted while rendering, not in an effect
  if (ready[photo.id] && shown.id !== photo.id) setShown(photo);
  const markReady = (id: string) => setReady(r => (r[id] ? r : { ...r, [id]: true }));
  const layers = shown.id === photo.id ? [photo] : [shown, photo];
  return (
    <div className={cn('overflow-hidden', className)} data-testid="backdrop">
      {layers.map(p => (
        <Layer key={p.id} photo={p} ready={!!ready[p.id]} onReady={() => markReady(p.id)} priority={p.id === photo.id} />
      ))}
    </div>
  );
}
