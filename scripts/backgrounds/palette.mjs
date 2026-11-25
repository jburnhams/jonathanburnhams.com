#!/usr/bin/env node
// Vendored unchanged (but for the import path) from jburnhams/ux-research ux-design/skill/scripts/palette.mjs at 4aa1657.
// palette.mjs: one or two seed colours -> contrast-solved OKLCH ramps -> shadcn/Tailwind v4
// theme tokens (light + dark) -> mechanical validation report.
//
//   node palette.mjs --primary "#2f5d50" [--secondary "#c8553d"] [--contrast 0|0.5|1]
//                    [--ground white|tinted] [--out globals.css] [--json report.json]
//
// Zero dependencies. Exit 1 if any FAIL check. See ux-colour-science.md for the method.

import { writeFileSync } from "node:fs";
import {
  hexToOklch, oklchToHex, contrast, deltaE, simulateCvd, solveLightness, isDisliked, parseHex,
} from "./color.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, [])
);

if (!args.primary || !parseHex(String(args.primary))) {
  console.error('usage: palette.mjs --primary "#rrggbb" [--secondary "#rrggbb"] [--contrast 0|0.5|1] [--ground white|tinted] [--out file.css] [--json file.json]');
  process.exit(2);
}

const level = Number(args.contrast ?? 0);
const TEXT = level >= 1 ? { low: 9, high: 18 } : level >= 0.5 ? { low: 7, high: 15 } : { low: 4.5, high: 12 };

const seed1 = hexToOklch(String(args.primary));
const seed2 = args.secondary ? hexToOklch(String(args.secondary)) : null;

// ---------------------------------------------------------------------------
// Ramps: 12 functional steps (Radix-style jobs), each solved against the ground.
//   1-2 grounds · 3-5 component fills (rest/hover/active) · 6-8 borders (subtle/default/strong)
//   9-10 solid fill (seed/hover) · 11-12 text (low/high)
// ---------------------------------------------------------------------------
const CHROMA_SHAPE = [0.06, 0.1, 0.18, 0.26, 0.34, 0.42, 0.52, 0.66, 1, 1, 0.85, 0.45];

function ramp([L0, C0, h], mode, { neutral = false } = {}) {
  const light = mode === "light";
  const C = (i) => (neutral ? Math.min(0.02, Math.max(0.006, C0 * 0.09)) * (i >= 10 ? 1.4 : 1) : C0 * CHROMA_SHAPE[i]);
  const ground = light ? 0.99 : 0.17;
  const groundHex = oklchToHex([ground, C(0), h]);
  const steps = [];
  const fillL = light ? [0.99, 0.975, 0.95, 0.925, 0.9] : [0.17, 0.2, 0.235, 0.265, 0.295];
  for (let i = 0; i < 5; i++) steps.push([fillL[i], C(i), h]);
  const borderTargets = [1.35, 1.75, 3.05]; // 3.05 not 3: oklch->hex rounding can land at 2.99
  for (let k = 0; k < 3; k++) {
    const L = solveLightness({ C: C(5 + k), h, against: groundHex, target: borderTargets[k], direction: light ? "darker" : "lighter" });
    steps.push([L ?? (light ? 0.6 : 0.6), C(5 + k), h]);
  }
  if (neutral) {
    const L9 = solveLightness({ C: C(8), h, against: groundHex, target: 4.6, direction: light ? "darker" : "lighter" });
    steps.push([L9, C(8), h], [light ? L9 - 0.05 : L9 + 0.05, C(9), h]);
  } else {
    // Step 9 keeps the brand seed's lightness in light mode; in dark mode lift it if it sinks.
    let L9 = L0;
    if (!light && contrast(oklchToHex([L9, C0, h]), groundHex) < 3) {
      L9 = solveLightness({ C: C0, h, against: groundHex, target: 3, direction: "lighter" }) ?? L0;
    }
    steps.push([L9, C0, h], [light ? L9 - 0.05 : L9 + 0.05, C0, h]);
  }
  // Text steps are solved against the busiest fill they sit on (step 3), so they also pass on the ground.
  const fillHex = oklchToHex(steps[2]);
  for (const [k, t] of [[10, TEXT.low], [11, TEXT.high]]) {
    const L = solveLightness({ C: C(k), h, against: fillHex, target: t, direction: light ? "darker" : "lighter" });
    steps.push([L ?? (light ? 0.2 : 0.95), C(k), h]);
  }
  return steps.map(oklchToHex);
}

const groundTinted = args.ground !== "white";

// Categorical chart palette. Equal L and C across hues (the Claude Design canvas accent rule)
// collapses under protan/deutan simulation, so charts need lightness variation too. Greedy
// farthest-point search over a hue x lightness grid, seeded with the brand hue(s), maximising
// the worst of (normal-vision ΔE, protan ΔE, deutan ΔE) while keeping >= 3:1 against the ground.
function chartPalette(mode, groundHex) {
  const Ls = mode === "light" ? [0.42, 0.5, 0.58, 0.66] : [0.6, 0.68, 0.76, 0.84];
  const cands = [];
  for (let h = 0; h < 360; h += 10) for (const L of Ls) {
    const hex = oklchToHex([L, 0.17, h]);
    if (contrast(hex, groundHex) >= 3 && hexToOklch(hex)[1] >= 0.1) cands.push(hex);
  }
  // Score a pair against both gates at once: normal vision >= 15, CVD >= 8.
  const dist = (a, b) => Math.min(
    deltaE(a, b) / 15,
    deltaE(simulateCvd(a, "protan"), simulateCvd(b, "protan")) / 8,
    deltaE(simulateCvd(a, "deutan"), simulateCvd(b, "deutan")) / 8
  );
  const pick = [];
  for (const s of [seed1, seed2].filter(Boolean)) {
    const near = cands.slice().sort((a, b) => Math.abs(hexToOklch(a)[2] - s[2]) - Math.abs(hexToOklch(b)[2] - s[2]) || Math.abs(hexToOklch(a)[0] - Ls[1]) - Math.abs(hexToOklch(b)[0] - Ls[1]))[0];
    if (near && !pick.includes(near) && pick.every((p) => dist(near, p) >= 1)) pick.push(near);
  }
  while (pick.length < 5) {
    let best = null, bestD = -1;
    for (const c of cands) {
      if (pick.includes(c)) continue;
      const d = Math.min(...pick.map((p) => dist(c, p)));
      if (d > bestD) { bestD = d; best = c; }
    }
    pick.push(best);
  }
  return pick;
}
const neutralSeed = [seed1[0], seed1[1], seed1[2]];
const themes = {};
for (const mode of ["light", "dark"]) {
  const neutral = ramp(neutralSeed, mode, { neutral: true });
  if (mode === "light" && !groundTinted) neutral[0] = "#ffffff";
  const primary = ramp(seed1, mode);
  const secondary = seed2 ? ramp(seed2, mode) : null;
  const best = (bg, ...cands) => cands.sort((a, b) => contrast(b, bg) - contrast(a, bg))[0];
  const danger = ramp([0.58, 0.19, 27], mode);
  const chart = chartPalette(mode, neutral[0]);
  themes[mode] = {
    ramps: { neutral, primary, ...(secondary ? { secondary } : {}) },
    roles: {
      background: neutral[0],
      foreground: neutral[11],
      card: mode === "light" ? neutral[0] : neutral[1],
      "card-foreground": neutral[11],
      popover: mode === "light" ? neutral[0] : neutral[1],
      "popover-foreground": neutral[11],
      primary: primary[8],
      "primary-foreground": best(primary[8], "#ffffff", neutral[11], neutral[0], "#000000"),
      secondary: secondary ? secondary[2] : neutral[2],
      "secondary-foreground": secondary ? secondary[11] : neutral[11],
      muted: neutral[2],
      "muted-foreground": neutral[10],
      accent: primary[2],
      "accent-foreground": primary[11],
      destructive: danger[8],
      "destructive-foreground": best(danger[8], "#ffffff", "#000000"),
      border: neutral[5],
      input: neutral[7],
      ring: primary[7],
      ...Object.fromEntries(chart.map((c, i) => [`chart-${i + 1}`, c])),
    },
  };
}

// ---------------------------------------------------------------------------
// Validation (see ux-colour-science.md §5)
// ---------------------------------------------------------------------------
const checks = [];
const add = (sev, id, msg, pass) => checks.push({ severity: pass ? "PASS" : sev, id, msg });
for (const [mode, t] of Object.entries(themes)) {
  const r = t.roles;
  const pair = (fg, bg, min, sev, id) => {
    const c = contrast(r[fg] ?? fg, r[bg] ?? bg);
    add(sev, `${mode}:${id}`, `${fg} on ${bg} = ${c.toFixed(2)}:1 (need ${min})`, c >= min);
  };
  pair("foreground", "background", 4.5, "FAIL", "body-text");
  pair("muted-foreground", "background", 4.5, "FAIL", "muted-text");
  pair("muted-foreground", "muted", 4.5, "FAIL", "muted-text-on-muted");
  pair("primary-foreground", "primary", 4.5, "FAIL", "primary-label");
  pair("accent-foreground", "accent", 4.5, "FAIL", "accent-label");
  pair("destructive-foreground", "destructive", 4.5, "FAIL", "destructive-label");
  pair("input", "background", 3, "FAIL", "input-boundary (WCAG 1.4.11)");
  pair("ring", "background", 3, "FAIL", "focus-ring (WCAG 1.4.11)");
  pair("primary", "background", 3, "WARN", "primary-fill-visible");

  const chart = [1, 2, 3, 4, 5].map((i) => r[`chart-${i}`]);
  let worstN = Infinity, worstCvd = Infinity;
  for (let i = 0; i < chart.length; i++)
    for (let j = i + 1; j < chart.length; j++) {
      worstN = Math.min(worstN, deltaE(chart[i], chart[j]));
      const cv = Math.min(
        deltaE(simulateCvd(chart[i], "protan"), simulateCvd(chart[j], "protan")),
        deltaE(simulateCvd(chart[i], "deutan"), simulateCvd(chart[j], "deutan"))
      );
      worstCvd = Math.min(worstCvd, cv);
    }
  add("FAIL", `${mode}:chart-normal-vision`, `worst chart pair ΔE×100 = ${worstN.toFixed(1)} (need ≥ 15)`, worstN >= 15);
  add(worstCvd >= 6 ? "WARN" : "FAIL", `${mode}:chart-cvd`, `worst chart pair under protan/deutan ΔE×100 = ${worstCvd.toFixed(1)} (target ≥ 8, floor 6; below 8 needs direct labels or texture)`, worstCvd >= 8);
  for (const [i, c] of chart.entries())
    add("WARN", `${mode}:chart-${i + 1}-contrast`, `chart-${i + 1} on background = ${contrast(c, r.background).toFixed(2)}:1 (want ≥ 3)`, contrast(c, r.background) >= 3);
}

const TELLS = [
  ["terracotta accent (#D97757, Claude's own accent)", "#D97757", "primary"],
  ["Tailwind indigo-500", "#6366F1", "primary"],
  ["Tailwind violet-500", "#8B5CF6", "primary"],
  ["Tailwind purple-600", "#9333EA", "primary"],
  ["Tailwind blue-600 (the blue→purple gradient start)", "#2563EB", "primary"],
  ["emerald-500 (the 'purple escape' accent)", "#10B981", "primary"],
];
{
  const [L, C, h] = hexToOklch(themes.light.roles.background);
  const cream = L >= 0.9 && L <= 0.985 && C >= 0.008 && h >= 60 && h <= 105;
  add("WARN", "tell:cream ground", `light ground oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(0)}) is a warm cream/parchment (frontend-design cluster 1, Impeccable cream-palette); fine if the brief asked for it`, !cream);
}
for (const [name, hex, role] of TELLS) {
  const d = deltaE(themes.light.roles[role], hex);
  const dd = deltaE(themes.dark.roles[role], hex);
  add("WARN", `tell:${name}`, `${role} is ΔE×100 ${Math.min(d, dd).toFixed(1)} from ${name}; fine if the brief asked for it`, Math.min(d, dd) >= 6);
}
add("WARN", "dislike", `primary ${args.primary} is a dark yellow-green (Palmer & Schloss 2010; Material DislikeAnalyzer, approximated in OKLCH)`, !isDisliked(String(args.primary)));
if (seed2) {
  const dh = Math.abs(((seed1[2] - seed2[2] + 540) % 360) - 180);
  add("WARN", "second-job", `primary and secondary hues are ${dh.toFixed(0)}° apart (one hue pretending to be two if < 20° and similar lightness)`, dh >= 20 || Math.abs(seed1[0] - seed2[0]) > 0.15);
}
const lightNeutralC = hexToOklch(themes.light.roles.background)[1];
add("WARN", "neutral-chroma", `light ground chroma ${lightNeutralC.toFixed(3)} (≤ 0.02 keeps whites from reading as tinted paper)`, lightNeutralC <= 0.0205);

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const oklch = (hex) => {
  const [L, C, h] = hexToOklch(hex);
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(1)})`;
};
const block = (sel, t) => {
  const lines = [];
  for (const [k, v] of Object.entries(t.roles)) lines.push(`  --${k}: ${oklch(v)};`);
  for (const [name, steps] of Object.entries(t.ramps)) steps.forEach((v, i) => lines.push(`  --${name}-${i + 1}: ${oklch(v)};`));
  return `${sel} {\n${lines.join("\n")}\n}`;
};
const roleNames = Object.keys(themes.light.roles);
const rampNames = Object.entries(themes.light.ramps).flatMap(([n, s]) => s.map((_, i) => `${n}-${i + 1}`));
const css = `/* Generated by ux-design/skill/scripts/palette.mjs
   primary ${args.primary}${seed2 ? `, secondary ${args.secondary}` : ""}, contrast level ${level}
   Ramps: 1-2 grounds, 3-5 component fills, 6-8 borders, 9-10 solids, 11-12 text.
   Record the reason for these seeds in DESIGN.md; regenerate rather than hand-edit. */
${block(":root", themes.light)}

${block(".dark", themes.dark)}

@theme inline {
${[...roleNames, ...rampNames].map((n) => `  --color-${n}: var(--${n});`).join("\n")}
}
`;

if (args.out) writeFileSync(String(args.out), css);
else process.stdout.write(css);
if (args.json) writeFileSync(String(args.json), JSON.stringify({ themes, checks }, null, 2));

const order = { FAIL: 0, WARN: 1, PASS: 2 };
const shown = checks.filter((c) => c.severity !== "PASS" || args.verbose).sort((a, b) => order[a.severity] - order[b.severity]);
const log = (s) => process.stderr.write(s + "\n");
log(`\npalette checks: ${checks.filter((c) => c.severity === "PASS").length} pass, ${checks.filter((c) => c.severity === "WARN").length} warn, ${checks.filter((c) => c.severity === "FAIL").length} fail`);
for (const c of shown) log(`  ${c.severity.padEnd(4)} ${c.id}: ${c.msg}`);
process.exit(checks.some((c) => c.severity === "FAIL") ? 1 : 0);
