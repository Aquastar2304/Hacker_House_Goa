/**
 * HH Goa 2026 brand tokens.
 *
 * Values lifted verbatim from the CSS custom properties served by hhgoa.com
 * (--primary / --secondary / --accent / --font-imbue / --font-victor-mono) so the
 * generated graphics are colour-exact against the event site, not eyeballed.
 */
export const BRAND = {
  green: "#0B6839",
  greenDeep: "#064A28",
  greenInk: "#032F1A",
  yellow: "#FEE101",
  yellowDeep: "#EDD723",
  pink: "#FF0080",
  cream: "#FFFBE8",
  white: "#FFFFFF",
  ink: "#000000",
} as const;

export const DISPLAY = "Imbue";
export const MONO = "Victor Mono";

export const EVENT = {
  name: "HACKER HOUSE",
  place: "GOA",
  year: "2026",
  wordmark: "HACKER HOUSE GOA",
  dates: "28 – 31 OCT 2026",
  locus: "GOA, INDIA",
  strap: "LESS NOISE. MORE SIGNAL",
  hashtag: "#FrameInGoa",
  site: "hhgoa.com",
  cohort: "247",
} as const;

/** Aspect-correct output sizes, picked for how X actually renders each surface. */
export const CANVAS = {
  /** Square avatar. X masks avatars to a circle, so nothing vital sits in the corners. */
  pfp: { w: 1024, h: 1024 },
  /** 4:5 — the tallest ratio X shows uncropped in-timeline, so the badge reads big. */
  card: { w: 1080, h: 1350 },
  /** 16:9 — the ratio X previews without cropping for a wide team shot. */
  squad: { w: 1200, h: 675 },
} as const;

export type Format = keyof typeof CANVAS;
