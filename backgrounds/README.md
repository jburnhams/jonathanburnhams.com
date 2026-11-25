# Background photos

`selection.json` lists the Strava photos used as full-screen backgrounds (ids are strava-sync's,
`<activity id>_<position>`), chosen by eye from the contact sheets that
`node scripts/backgrounds/backgrounds.mjs review` writes to `.photo-review/`. Each entry may add
`focus` (a CSS `object-position`, so the subject survives the crop) and `primary` / `secondary`
(hex seeds, to override the colours taken from the photo).

Change this file and the **Background photos** workflow rebuilds them on the branch (it can reach
strava-sync; it commits `public/backgrounds/`, `src/backgrounds/backgrounds.json` and
`src/backgrounds/palettes.css`). Those copies stop at ~1200 px. For full size,
run the build on a machine that has the originals:

```bash
UV_THREADPOOL_SIZE=12 node scripts/backgrounds/backgrounds.mjs build \
  --photos <camera originals, named <id>.jpg> --originals <Strava export dir>
```

- `--photos` wins: the files as the camera made them (3456 to 4618 px). They must be JPEG, PNG
  or TIFF (sharp cannot read real HEIC; convert it first). Links work, so a folder of symlinks
  into a photo archive is enough.
- `--originals` covers the rest: a Strava bulk export, which keeps 2048 px at most.
- The colours come from strava-sync's copy whatever the source, so a rebuild does not change them.

A photo built from a better source is kept on later workflow runs (they have no originals), so the
full-size files are not replaced by the small ones. `source` in `backgrounds.json` says which each
one used. To add a photo at full size, rebuild with its original; without the other originals the
rest are kept as they are.
