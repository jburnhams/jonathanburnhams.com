// Shared by the homepage photo carousel and its tests

export const PHOTOS_API = 'https://stravasync.jonathanburnhams.com/api/photos/random';
export const ROW_HEIGHT = 120; // px, keep in step with .photo-carousel in the CSS
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

// Width of a thumbnail at the row height, keeping the photo's shape
export function thumbWidth(p: CarouselPhoto, height = ROW_HEIGHT): number {
  const ratio = p.width > 0 && p.height > 0 ? p.width / p.height : 1.5;
  return Math.round(height * ratio);
}

// Width of a row of thumbnails, gaps included
export function rowWidth(photos: CarouselPhoto[], height = ROW_HEIGHT): number {
  return photos.reduce((w, p) => w + thumbWidth(p, height), 0) + THUMB_GAP * Math.max(0, photos.length - 1);
}

// Drop thumbnails from the end until the row fits (always keeping one, which then shrinks to the width)
export function trimToFit(photos: CarouselPhoto[], width: number, height = ROW_HEIGHT): CarouselPhoto[] {
  const out = photos.slice();
  while (out.length > 1 && rowWidth(out, height) > width) out.pop();
  return out;
}

// Whether one more photo fits at the end of the row (the first always does)
export function fitsAtEnd(row: CarouselPhoto[], photo: CarouselPhoto, width: number, height = ROW_HEIGHT): boolean {
  return row.length === 0 || rowWidth([...row, photo], height) <= width;
}

/**
 * Put `photo` into the row in place of one thumbnail. Prefer a slot where it fits
 * without changing how many are shown (random among those, not `avoid`); if it fits
 * nowhere, replace a random slot and drop thumbnails from the end until it fits.
 */
export function swapIn(row: CarouselPhoto[], photo: CarouselPhoto, width: number, random: () => number, avoid = -1, height = ROW_HEIGHT) {
  const total = rowWidth(row, height);
  const fitting = row.map((_, i) => i).filter(i => total - thumbWidth(row[i], height) + thumbWidth(photo, height) <= width);
  const choices = fitting.length > 1 ? fitting.filter(i => i !== avoid) : fitting;
  if (choices.length) {
    const slot = choices[Math.floor(random() * choices.length)];
    return { row: row.map((p, i) => (i === slot ? photo : p)), slot };
  }
  let slot = Math.floor(random() * row.length);
  if (row.length > 1 && slot === avoid) slot = (slot + 1) % row.length;
  const replaced = row.map((p, i) => (i === slot ? photo : p));
  // Drop from the end, but keep the new photo
  while (replaced.length > 1 && rowWidth(replaced, height) > width) {
    const last = replaced.length - 1;
    replaced.splice(last === slot ? last - 1 : last, 1);
    if (last === slot) slot--;
  }
  return { row: replaced, slot };
}
