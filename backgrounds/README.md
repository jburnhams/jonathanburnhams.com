# Background photos

`selection.json` lists the Strava photos used as full-screen backgrounds (ids are strava-sync's,
`<activity id>_<position>`), chosen by eye from the contact sheets that
`node scripts/backgrounds/backgrounds.mjs review` writes to `.photo-review/`. Each entry may add
`focus` (a CSS `object-position`, so the subject survives the crop) and `primary` / `secondary`
(hex seeds, to override the colours taken from the photo).

Change this file and the **Background photos** workflow rebuilds them on the branch (it can reach
strava-sync; it commits `public/backgrounds/`, `src/backgrounds/backgrounds.json` and
`src/backgrounds/palettes.css`). Those copies stop at ~1200 px. For full size, run the build
against a Strava bulk export on a machine that has it:

```bash
node scripts/backgrounds/backgrounds.mjs build --originals ~/Downloads/strava-export
```

A photo built from the export is kept on later workflow runs (they have no export), so the
full-size files are not replaced by the small ones.
