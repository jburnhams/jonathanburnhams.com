#!/usr/bin/env node
// Full-screen background photos from Jonathan's Strava, made small enough to load fast.
//
//   node scripts/backgrounds/backgrounds.mjs review
//     Fetches every photo strava-sync serves (the ~1200 px copies), scores each for use as a
//     full-screen background (shape, sharpness, exposure, colour) and writes a numbered contact
//     sheet of the best to .photo-review/, to choose from by eye.
//
//   node scripts/backgrounds/backgrounds.mjs build [--originals <Strava export dir>]
//     For each photo in backgrounds/selection.json: AVIF and WebP at several widths (none wider
//     than the source), a tiny blurred placeholder, and a colour scheme taken from the photo
//     (ux-research palette.mjs, contrast-checked). Writes public/backgrounds/*.{avif,webp},
//     src/backgrounds/backgrounds.json and src/backgrounds/palettes.css.
//     With --originals it reads the full-size files from a Strava bulk export (activities.csv's
//     Media column, the same ids strava-sync uses: <activity id>_<position>), so the large sizes
//     exist; without it, the strava-sync copies, which stop at ~1200 px.
//
// Why these choices: AVIF is about half the bytes of WebP at the same look and every current
// browser decodes it; WebP is the fallback for the rest. Widths step by about 1.5x so a screen
// downloads at most ~1.5x the pixels it shows. The placeholder is the photo at 32 px, inlined in
// the manifest, so the page shows the photo's colours on the first frame.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { contrast, hexToOklch, oklabToOklch, oklchToHex, rgbToOklab } from "./color.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const API = "https://stravasync.jonathanburnhams.com";
const CACHE = join(ROOT, ".cache/backgrounds");
const REVIEW = join(ROOT, ".photo-review");
const SELECTION = join(ROOT, "backgrounds/selection.json");
const OUT_IMG = join(ROOT, "public/backgrounds");
const OUT_SRC = join(ROOT, "src/backgrounds");

export const WIDTHS = [640, 960, 1440, 1920, 2560, 3200];
const AVIF = { quality: 52, effort: 6, chromaSubsampling: "4:2:0" };
const WEBP = { quality: 74, effort: 6, smartSubsample: true };

// ---------------------------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return { data: await res.json(), headers: res.headers };
}

/** Every photo strava-sync has, once each (one pass of a fixed shuffle, paged 100 at a time). */
export async function listPhotos() {
  const all = [];
  for (let offset = 0, total = Infinity; offset < total; offset += 100) {
    const { data, headers } = await getJson(`${API}/api/photos/random?seed=backgrounds&offset=${offset}&limit=100`);
    total = Number(headers.get("x-total-count") ?? data.length);
    all.push(...data.slice(0, Math.max(0, total - offset)));
  }
  return all;
}

async function cached(id, url) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${id}.jpg`);
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(file);
}

// ---------------------------------------------------------------------------------------------
// Scoring: is it a good full-screen background?
// ---------------------------------------------------------------------------------------------

/** Sharpness (variance of the Laplacian at 512 px), exposure and colourfulness of one image. */
export async function analyse(input) {
  const img = sharp(input).rotate();
  const { width, height } = await img.metadata().then((m) => (m.orientation >= 5 ? { width: m.height, height: m.width } : m));
  const W = 512;
  const g = await sharp(input).rotate().resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data: px, info } = g;
  let sum = 0, sum2 = 0, n = 0, dark = 0, bright = 0, luma = 0;
  for (let y = 1; y < info.height - 1; y++) for (let x = 1; x < info.width - 1; x++) {
    const i = y * info.width + x;
    const lap = 4 * px[i] - px[i - 1] - px[i + 1] - px[i - info.width] - px[i + info.width];
    sum += lap; sum2 += lap * lap; n++;
  }
  for (const v of px) { luma += v; if (v < 10) dark++; if (v > 245) bright++; }
  const sharpness = sum2 / n - (sum / n) ** 2;
  const c = await sharp(input).rotate().resize({ width: 128 }).removeAlpha().raw().toBuffer();
  let rgS = 0, rgS2 = 0, ybS = 0, ybS2 = 0, m = 0;
  for (let i = 0; i < c.length; i += 3) {
    const rg = c[i] - c[i + 1], yb = (c[i] + c[i + 1]) / 2 - c[i + 2];
    rgS += rg; rgS2 += rg * rg; ybS += yb; ybS2 += yb * yb; m++;
  }
  const sd = (s, s2) => Math.sqrt(Math.max(0, s2 / m - (s / m) ** 2));
  // Hasler & Süsstrunk 2003
  const colourfulness = Math.hypot(sd(rgS, rgS2), sd(ybS, ybS2)) + 0.3 * Math.hypot(rgS / m, ybS / m);
  return {
    width, height,
    sharpness: Math.round(sharpness),
    luma: +(luma / px.length / 255).toFixed(3),
    clipped: +((dark + bright) / px.length).toFixed(3),
    colourfulness: +colourfulness.toFixed(1),
  };
}

/** One number to sort by. Landscape, sharp, well exposed and colourful scores high. */
export function score(a) {
  const ratio = a.width / a.height;
  const shape = ratio >= 1.3 ? 1 : ratio >= 1.0 ? 0.6 : 0.25; // a desktop screen is landscape
  const sharp = Math.min(1, Math.log10(Math.max(1, a.sharpness)) / 3.2);
  const exposure = 1 - Math.min(1, Math.abs(a.luma - 0.45) / 0.45) * 0.7 - Math.min(0.5, a.clipped * 2);
  const colour = Math.min(1, a.colourfulness / 60);
  const size = Math.min(1, Math.max(a.width, a.height) / 1200);
  return +(shape * (0.4 * sharp + 0.3 * exposure + 0.3 * colour) * size).toFixed(3);
}

async function review() {
  const photos = await listPhotos();
  console.log(`${photos.length} photos`);
  const rows = [];
  for (const p of photos) {
    try {
      const buf = await cached(p.id, p.url);
      const a = await analyse(buf);
      rows.push({ id: p.id, activity: p.activity, caption: p.caption, ...a, score: score(a) });
    } catch (e) {
      console.warn(`skip ${p.id}: ${e.message}`);
    }
  }
  rows.sort((a, b) => b.score - a.score);
  rmSync(REVIEW, { recursive: true, force: true });
  mkdirSync(REVIEW, { recursive: true });
  rows.forEach((r, i) => (r.n = i + 1));
  writeFileSync(join(REVIEW, "candidates.json"), JSON.stringify(rows, null, 1) + "\n");
  // Contact sheets: 48 per sheet, 6 across, numbered in score order
  const PER = 48, COLS = 6, TW = 420, TH = 280, LABEL = 26;
  const top = rows.filter((r) => r.width / r.height >= 1.2).slice(0, 144);
  for (let s = 0; s * PER < top.length; s++) {
    const page = top.slice(s * PER, (s + 1) * PER);
    const rowsN = Math.ceil(page.length / COLS);
    const tiles = await Promise.all(page.map(async (r, i) => {
      const img = await sharp(readFileSync(join(CACHE, `${r.id}.jpg`))).rotate().resize(TW, TH, { fit: "cover" }).jpeg().toBuffer();
      const label = Buffer.from(`<svg width="${TW}" height="${LABEL}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="19" font-family="DejaVu Sans, sans-serif" font-size="16" fill="#fff">${r.n}  ${r.id}  ${(r.activity?.name ?? "").replace(/[<&>]/g, "").slice(0, 32)}</text></svg>`);
      return [
        { input: img, left: (i % COLS) * TW, top: Math.floor(i / COLS) * (TH + LABEL) },
        { input: label, left: (i % COLS) * TW, top: Math.floor(i / COLS) * (TH + LABEL) + TH },
      ];
    }));
    await sharp({ create: { width: COLS * TW, height: rowsN * (TH + LABEL), channels: 3, background: "#222" } })
      .composite(tiles.flat()).jpeg({ quality: 70 }).toFile(join(REVIEW, `sheet-${s + 1}.jpg`));
  }
  console.log(`wrote ${REVIEW}`);
}

// ---------------------------------------------------------------------------------------------
// Colour: a scheme for the page from the photo
// ---------------------------------------------------------------------------------------------

/** k-means in OKLab on the photo at 96 px: the photo's main colours and how much of it each covers. */
export async function photoColours(input, k = 8) {
  const raw = await sharp(input).rotate().resize({ width: 96 }).removeAlpha().raw().toBuffer();
  const pts = [];
  for (let i = 0; i < raw.length; i += 3) pts.push(rgbToOklab([raw[i] / 255, raw[i + 1] / 255, raw[i + 2] / 255]));
  // deterministic k-means++ start (seeded from the pixels themselves)
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const centres = [pts[Math.floor(rand() * pts.length)]];
  while (centres.length < k) {
    const ds = pts.map((p) => Math.min(...centres.map((c) => d2(p, c))));
    let r = rand() * ds.reduce((s, d) => s + d, 0);
    let i = 0;
    for (; i < ds.length - 1 && r > ds[i]; i++) r -= ds[i];
    centres.push(pts[i]);
  }
  let assign = new Array(pts.length).fill(0);
  for (let it = 0; it < 16; it++) {
    assign = pts.map((p) => centres.reduce((best, c, j) => (d2(p, c) < d2(p, centres[best]) ? j : best), 0));
    for (let j = 0; j < k; j++) {
      const mine = pts.filter((_, i) => assign[i] === j);
      if (mine.length) centres[j] = [0, 1, 2].map((d) => mine.reduce((s, p) => s + p[d], 0) / mine.length);
    }
  }
  const counts = centres.map((_, j) => assign.filter((a) => a === j).length);
  const mean = [0, 1, 2].map((d) => pts.reduce((s, p) => s + p[d], 0) / pts.length);
  return {
    clusters: centres.map((c, j) => ({ lch: oklabToOklch(c), share: counts[j] / pts.length }))
      .filter((c) => c.share > 0).sort((a, b) => b.share - a.share),
    mean: oklabToOklch(mean),
  };
}

const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/**
 * The two seeds for palette.mjs. Primary is the photo's own strongest colour (a jacket, a sky, a
 * race flag): the most chromatic colour that covers a real part of the frame. Secondary is the
 * colour the photo is mostly made of (rock, grass, snow), which tints the grounds. A grey photo
 * (nothing above C 0.05) takes the complement of its main hue, so the page still has a colour.
 */
export function seedsFrom({ clusters }) {
  const usable = clusters.filter((c) => c.share >= 0.02 && c.lch[0] > 0.3 && c.lch[0] < 0.9);
  const vivid = usable.slice().sort((a, b) => b.lch[1] * b.share ** 0.3 - a.lch[1] * a.share ** 0.3)[0];
  const main = clusters[0];
  let primary;
  if (vivid && vivid.lch[1] >= 0.05) {
    primary = [Math.min(0.68, Math.max(0.45, vivid.lch[0])), Math.max(0.1, vivid.lch[1]), vivid.lch[2]];
  } else {
    primary = [0.55, 0.13, (main.lch[2] + 180) % 360];
  }
  const second = clusters.find((c) => c.share >= 0.08 && hueGap(c.lch[2], primary[2]) >= 40 && c.lch[1] >= 0.02);
  const secondary = second
    ? [0.72, Math.max(0.09, Math.min(0.15, second.lch[1] * 1.5)), second.lch[2]]
    : [0.72, 0.12, (primary[2] + 150) % 360];
  return { primary: oklchToHex(primary), secondary: oklchToHex(secondary), from: vivid && vivid.lch[1] >= 0.05 ? "photo" : "complement" };
}

/** palette.mjs (vendored from ux-research), its JSON: light and dark roles and ramps, plus its checks. */
function palette(primary, secondary) {
  const json = join(CACHE, `palette-${createHash("sha1").update(primary + secondary).digest("hex").slice(0, 10)}.json`);
  mkdirSync(CACHE, { recursive: true });
  for (const level of ["0.5", "1"]) {
    try {
      execFileSync(process.execPath, [join(HERE, "palette.mjs"), "--primary", primary, "--secondary", secondary, "--contrast", level, "--json", json, "--out", "/dev/null"], { stdio: ["ignore", "ignore", "pipe"] });
      return { ...JSON.parse(readFileSync(json, "utf8")), level };
    } catch (e) {
      if (level === "1") throw new Error(`palette for ${primary}/${secondary} fails its checks:\n${e.stderr}`);
    }
  }
}

const oklchCss = (hex) => {
  const [L, C, h] = hexToOklch(hex);
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(1)})`;
};

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f !== ""));
}

/** id (<activity id>_<position>) -> original file, from a Strava bulk export (as strava-sync numbers them). */
export function exportFiles(dir) {
  const [header, ...rows] = parseCsv(readFileSync(join(dir, "activities.csv"), "utf8"));
  const idCol = header.indexOf("Activity ID"), mediaCol = header.lastIndexOf("Media");
  const files = new Map();
  for (const row of rows) {
    const media = (row[mediaCol] ?? "").split("|").map((f) => f.trim())
      .filter((f) => [".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff"].includes(extname(f).toLowerCase()));
    media.forEach((f, pos) => files.set(`${row[idCol]}_${pos}`, join(dir, f)));
  }
  return files;
}

async function build(originals) {
  const selection = JSON.parse(readFileSync(SELECTION, "utf8"));
  const fromExport = originals ? exportFiles(originals) : null;
  const known = new Map((await listPhotos()).map((p) => [p.id, p]));
  mkdirSync(OUT_IMG, { recursive: true });
  mkdirSync(OUT_SRC, { recursive: true });
  const previous = existsSync(join(OUT_SRC, "backgrounds.json")) ? JSON.parse(readFileSync(join(OUT_SRC, "backgrounds.json"), "utf8")) : [];
  const manifest = [];
  const css = [];
  for (const pick of selection) {
    const meta = known.get(pick.id);
    if (!meta) throw new Error(`${pick.id} is not a photo strava-sync knows`);
    let input, source = "strava-sync";
    if (fromExport?.has(pick.id) && existsSync(fromExport.get(pick.id))) {
      input = readFileSync(fromExport.get(pick.id)); source = "export";
    } else {
      // Keep a full-size build already made from the export rather than replace it with the small copy
      const before = previous.find((p) => p.id === pick.id);
      if (before?.source === "export" && !fromExport) { manifest.push({ ...before, focus: pick.focus ?? "50% 50%" }); css.push(before.css); continue; }
      input = await cached(pick.id, meta.url);
    }
    const base = sharp(input).rotate();
    const m = await base.metadata();
    const [w, h] = m.orientation >= 5 ? [m.height, m.width] : [m.width, m.height];
    const widths = WIDTHS.filter((x) => x < w * 0.95);
    widths.push(Math.min(w, WIDTHS[WIDTHS.length - 1]));
    for (const old of readdirSync(OUT_IMG).filter((f) => f.startsWith(`${pick.id}-`))) rmSync(join(OUT_IMG, old));
    const files = [];
    for (const width of [...new Set(widths)]) {
      const r = sharp(input).rotate().resize({ width });
      const avif = await r.clone().avif(AVIF).toBuffer();
      const webp = await r.clone().webp(WEBP).toBuffer();
      writeFileSync(join(OUT_IMG, `${pick.id}-${width}.avif`), avif);
      writeFileSync(join(OUT_IMG, `${pick.id}-${width}.webp`), webp);
      files.push({ width, avif: avif.length, webp: webp.length });
    }
    const placeholder = await sharp(input).rotate().resize({ width: 32 }).webp({ quality: 50 }).toBuffer();
    const colours = await photoColours(input);
    const seeds = pick.primary ? { primary: pick.primary, secondary: pick.secondary ?? seedsFrom(colours).secondary, from: "chosen" } : seedsFrom(colours);
    const pal = palette(seeds.primary, seeds.secondary);
    // The panel the words sit on over the photo: the photo's main colour, taken down to a deep tone
    const main = colours.clusters[0].lch;
    const ink = oklchToHex([0.2, Math.min(0.045, main[1]), main[2]]);
    const meanHex = oklchToHex(colours.mean);
    const block = (sel, t) => `${sel} {\n${[
      ...Object.entries(t.roles).map(([k, v]) => `  --${k}: ${oklchCss(v)};`),
      ...Object.entries(t.ramps).flatMap(([n, s]) => s.map((v, i) => `  --${n}-${i + 1}: ${oklchCss(v)};`)),
      `  --accent: var(--secondary-3);`, `  --accent-foreground: var(--secondary-12);`,
    ].join("\n")}\n}`;
    const entryCss = [
      `/* ${pick.id}: ${meta.activity?.name ?? ""} (${meta.activity?.date ?? ""}). Seeds ${seeds.primary} / ${seeds.secondary} (${seeds.from}), contrast ${pal.level} */`,
      block(`[data-photo="${pick.id}"]`, pal.themes.light),
      block(`.dark [data-photo="${pick.id}"]`, pal.themes.dark),
    ].join("\n");
    css.push(entryCss);
    manifest.push({
      id: pick.id,
      width: w, height: h,
      source,
      focus: pick.focus ?? "50% 50%",
      activity: meta.activity,
      ...(meta.caption ? { caption: meta.caption } : {}),
      sizes: files,
      placeholder: `data:image/webp;base64,${placeholder.toString("base64")}`,
      colours: {
        mean: meanHex,
        ink,
        inkText: contrast(ink, "#ffffff") >= contrast(ink, "#000000") ? "#ffffff" : "#000000",
        primary: seeds.primary,
        secondary: seeds.secondary,
        from: seeds.from,
        main: colours.clusters.slice(0, 5).map((c) => ({ hex: oklchToHex(c.lch), share: +c.share.toFixed(3) })),
      },
      css: entryCss,
    });
    console.log(`${pick.id}: ${w}x${h} from ${source}, ${files.map((f) => `${f.width}w ${Math.round(f.avif / 1024)}k/${Math.round(f.webp / 1024)}k`).join(", ")}; seeds ${seeds.primary} ${seeds.secondary}`);
  }
  writeFileSync(join(OUT_SRC, "backgrounds.json"), JSON.stringify(manifest, null, 1) + "\n");
  writeFileSync(join(OUT_SRC, "palettes.css"), `/* Generated by scripts/backgrounds/backgrounds.mjs from each background photo; do not edit.\n   Every block is ux-research palette.mjs output for the photo's own colours (see seedsFrom). */\n\n${css.join("\n\n")}\n`);
}

// ---------------------------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const at = rest.indexOf("--originals");
  const run = cmd === "review" ? review() : cmd === "build" ? build(at >= 0 ? rest[at + 1] : undefined) : Promise.reject(new Error("usage: backgrounds.mjs review | build [--originals <export dir>]"));
  run.catch((e) => { console.error(e.message ?? e); process.exit(1); });
}
