// Vendored from jburnhams/ux-research ux-design/skill/scripts/lib/color.mjs at 4aa1657.
// Zero-dependency colour maths for slop-lint and palette.
// sRGB <-> linear <-> OKLab/OKLCH (Ottosson 2020 matrices), WCAG 2 contrast,
// gamut mapping by chroma reduction (CSS Color 4 style, simplified),
// CVD simulation (Machado, Oliveira & Fernandes 2009, severity 1.0).

export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export const toHex = (rgb) =>
  "#" + rgb.map((c) => Math.round(clamp(c) * 255).toString(16).padStart(2, "0")).join("");

export function rgbToOklab([r, g, b]) {
  const [R, G, B] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export const oklabToRgb = (lab) => oklabToLinear(lab).map(toGam);

export function oklchToOklab([L, C, h]) {
  const r = (h * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}

export function oklabToOklch([L, a, b]) {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, C, C < 1e-4 ? 0 : h];
}

export const hexToOklch = (hex) => oklabToOklch(rgbToOklab(parseHex(hex)));

const inGamut = (lin) => lin.every((c) => c >= -1e-5 && c <= 1 + 1e-5);

/** Map an OKLCH colour into sRGB by reducing chroma at constant L and h. */
export function gamutMap([L, C, h]) {
  L = clamp(L);
  if (inGamut(oklabToLinear(oklchToOklab([L, C, h])))) return [L, C, h];
  let lo = 0, hi = C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear(oklchToOklab([L, mid, h])))) lo = mid;
    else hi = mid;
  }
  return [L, lo, h];
}

export const oklchToHex = (lch) => toHex(oklabToRgb(oklchToOklab(gamutMap(lch))));

export function luminance(rgb) {
  const [r, g, b] = rgb.map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(hexA, hexB) {
  const a = luminance(parseHex(hexA)), b = luminance(parseHex(hexB));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** OKLab Euclidean distance x100 (the scale Claude's dataviz validator uses). */
export function deltaE(hexA, hexB) {
  const x = rgbToOklab(parseHex(hexA)), y = rgbToOklab(parseHex(hexB));
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

// Machado et al. 2009, severity 1.0, applied in linear RGB.
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

export function simulateCvd(hex, type) {
  const lin = parseHex(hex).map(toLin);
  const M = CVD[type];
  const out = M.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
  return toHex(out.map((c) => toGam(clamp(c))));
}

/** Smallest OKLCH lightness (searching up or down from `from`) meeting a contrast target. */
export function solveLightness({ C, h, against, target, direction }) {
  // direction: "darker" finds the lightest L below `against` meeting target;
  // "lighter" finds the darkest L above it.
  let lo = 0, hi = 1, best = null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const hex = oklchToHex([mid, C, h]);
    const ok = contrast(hex, against) >= target;
    if (direction === "darker") {
      if (ok) { best = mid; lo = mid; } else hi = mid;
    } else {
      if (ok) { best = mid; hi = mid; } else lo = mid;
    }
  }
  return best;
}

/** Material HCT-style dislike check, approximated in OKLCH: dark, non-neutral yellow-green. */
export function isDisliked(hex) {
  const [L, C, h] = hexToOklch(hex);
  return h >= 95 && h <= 130 && C > 0.05 && L < 0.62;
}
