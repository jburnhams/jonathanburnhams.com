// Shared by the homepage photo carousel and its tests

export const PHOTOS_API = 'https://stravasync.jonathanburnhams.com/api/photos/random';
export const THUMB_WIDTH = 160; // px, keep in step with .photo-carousel-thumb in the CSS
export const THUMB_GAP = 8;

export interface CarouselPhoto {
  id: string;
  width: number;
  height: number;
  caption?: string;
  url: string;
  thumb_url: string;
  activity: { id: number; name: string | null; date: string | null };
}

// How many whole thumbnails fit in a width
export function slotsFor(width: number): number {
  return Math.max(1, Math.floor((width + THUMB_GAP) / (THUMB_WIDTH + THUMB_GAP)));
}
