# Design: jonathanburnhams.com

Built on [strata-react](https://github.com/jburnhams/strata-react) and the procedure in
[ux-research](https://github.com/jburnhams/ux-research) (`ux-design/skill/SKILL.md`). This file
records the decisions and the reason for each, so a later change keeps them or changes them on
purpose.

## Overview

- **Subject:** Jonathan Burnhams, who runs mountain ultras (Tor des Géants and the like), films
  them, and writes software. **Audience:** people who met him, raced with him or found a race
  write-up. **The homepage's one job:** say who this is and send the visitor to the races,
  training, videos or code.
- **Modes:** the homepage is **Experience** (the photo leads, the interface recedes). Running and
  Training are **Operate** (tables, a map, a chart), a race page is **Read**.
- **Inventory** (facts only this site has): photos he took during races, often from a mountain
  pass at an odd hour; each photo belongs to a race with a name, a date, a distance and a route
  shape; distances in hundreds of km and climbs in thousands of metres; the race pages built from
  his Strava export; an anonymised training log since 2018; a YouTube channel of race films;
  GitHub.

### Reference sentences

1. **Chosen:** *On the homepage, a photo from one of his races becomes the page: the photo is the
   ground, its colours set the colours of everything on it, and its caption (which race, when,
   that race's route shape) is the only text besides his name and where to go.* Competitor test:
   another runner's site would need his photos and his races, so it does not transfer.
2. Alternate: *the race bib becomes the name plate* (his name set like bib numerals). Rejected as
   costume: a bib is an object of the race, not of him.
3. Alternate: *the elevation profile becomes the rule under the name.* Rejected for now: the API
   has route shapes but no elevation series.

### Signature move

The caption. Every background says what it is: the race (a link to its page), the date and the
route traced as a small line in the photo's own accent colour. "Another photo" changes the photo
and, with it, the colours of the whole page. On Running, Training and race pages the same photo
(the race's own one, where there is one) sets the palette, so the site is one family of colours
per visit rather than one colour forever.

## Colours

Each background photo carries its own palette, made at build time by
`scripts/backgrounds/backgrounds.mjs` and written to `src/backgrounds/palettes.css`:

- **Seeds** come from the photo (k-means in OKLab on a 96 px copy): **primary** is the photo's
  strongest colour that covers a real part of the frame (chroma weighted by share^0.3: a red
  jacket beats a pale sky); **secondary** is the colour the photo is mostly made of (rock, grass,
  snow), lifted to a usable chroma. A grey photo (nothing above C 0.05) takes the complement of
  its main hue, so the page still has a colour.
- The seeds go through ux-research's `palette.mjs` (vendored in `scripts/backgrounds/`), which
  solves the 12-step ramps against WCAG contrast for light and dark and fails the build if a role
  pair falls short (it retries at contrast level 1 before failing).
- The **ink** is the photo's main colour taken down to L 0.2: the solid panel the words sit on
  over the photo. Solid, not glass: blur as decoration is a wave-1 tell, and a solid panel keeps
  text contrast independent of what is behind it.
- Without a photo (first paint before the manifest, tests) the site falls back to strata's
  default look.

## Typography

One family, Instrument Sans (bundled with strata-react): text at normal width; his name at the
condensed end of its width axis (75%) and weight 700, very large on the homepage, the way race
signage sets names. No second face: the contrast is width and weight inside one family. No
display serif, no mono labels as decoration.

## Layout

- **Homepage:** the photo fills the window (`object-fit: cover`, with a focus point chosen per
  photo so the subject is not cropped). The ink panel sits at the bottom start: name, then the five
  places to go as plain text links. The caption sits at the bottom end. On a phone the photo takes
  the top of the screen and the panel runs full width under it, so the photo is never covered by
  text it cannot fit.
- **Other pages:** strata's `AppShell` is not used (five links do not need a sidebar). A slim
  header with the name and the same links; content on the palette's ground; the page's photo as a
  short band at the top of Running and of race pages that have one.

## Images and speed

- AVIF (about half the bytes of WebP at the same look) and WebP fallback, at widths 640, 960,
  1440, 1920, 2560 and 3200 where the source is that big, in a `<picture>` with `sizes="100vw"`,
  so a phone downloads a ~640 px file and a 4K screen the large one.
- A 32 px WebP of the photo is inlined in the manifest and drawn blurred underneath, and the
  photo's mean colour is the page's background colour, so the first frame already shows the photo's
  colours. The real image fades in once decoded (250 ms; none with reduced motion).
- The current strava-sync copies stop at ~1200 px, which is soft on a large screen. The script
  takes `--originals <Strava export dir>` to rebuild the same selection from the full-size files.

## Motion

Character by frequency: the homepage is visited, not worked, so the one movement is the
crossfade when the photo changes (250 ms, opacity only). Nothing loops, nothing rises into view.

## Do / don't

- Do let the photo lead; one panel, one caption.
- Don't add a hero badge, gradient text, emoji icons, arrow glyphs on links, a "Hi, I'm" greeting
  or invented stats. Copy says what is there: "Running", "Training", "Another photo".
- Don't hand-edit `src/backgrounds/*`; change `backgrounds/selection.json` and rebuild.
