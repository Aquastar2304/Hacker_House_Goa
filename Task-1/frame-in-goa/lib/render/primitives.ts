/**
 * Canvas drawing kit for the HH Goa graphics.
 *
 * Everything here is procedural (no raster assets beyond the event's own SVG
 * marks) so output stays crisp at any export size and the whole render happens
 * client-side in a couple of frames.
 */
import { BRAND, DISPLAY, MONO } from "../brand";
import type { Drawable } from "../image";

export type Ctx = CanvasRenderingContext2D;

/* ------------------------------------------------------------------ fonts */

let fontsPromise: Promise<void> | null = null;

/**
 * Canvas ignores CSS @font-face until the face is actually loaded, so register
 * the two brand faces up front and await them before any draw.
 */
export function ensureFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (typeof document === "undefined" || typeof FontFace === "undefined") return;
    const faces: Array<[string, string, string, string]> = [
      [DISPLAY, "/fonts/imbue-latin.woff2", "100 900", "normal"],
      [MONO, "/fonts/victormono-latin.woff2", "100 700", "normal"],
      [MONO, "/fonts/victormono-italic-latin.woff2", "100 700", "italic"],
    ];
    await Promise.all(
      faces.map(async ([family, url, weight, style]) => {
        const face = new FontFace(family, `url(${url}) format("woff2")`, { weight, style });
        try {
          await face.load();
          document.fonts.add(face);
        } catch {
          /* a missing brand font must never block the render */
        }
      }),
    );
  })();
  return fontsPromise;
}

/* ------------------------------------------------------------------ maths */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** mulberry32 — tiny seeded PRNG so every graphic is reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ shapes */

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/**
 * Cover-fit a photo into a rect around a focus point, clamped so the rect is
 * always fully covered — this is what makes odd aspect ratios safe.
 */
export function coverDraw(
  ctx: Ctx,
  img: Drawable,
  x: number,
  y: number,
  w: number,
  h: number,
  fx = 0.5,
  fy = 0.5,
  zoom = 1,
) {
  const iw = img.width;
  const ih = img.height;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih) * Math.max(1, zoom);
  const dw = iw * s;
  const dh = ih * s;
  let dx = x + w / 2 - fx * dw;
  let dy = y + h / 2 - fy * dh;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.drawImage(img as CanvasImageSource, dx, dy, dw, dh);
}

/* ------------------------------------------------------------------ texture */

let grainTile: HTMLCanvasElement | null = null;

/** Filmic noise, overlay-blended. Keeps the flat brand greens from looking dead. */
export function grain(ctx: Ctx, w: number, h: number, opacity = 0.07) {
  if (!grainTile) {
    const t = 192;
    const c = document.createElement("canvas");
    c.width = t;
    c.height = t;
    const g = c.getContext("2d")!;
    const img = g.createImageData(t, t);
    const r = rng(0x51ce);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + r() * 165;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
  }
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "overlay";
  for (let y = 0; y < h; y += grainTile.height) {
    for (let x = 0; x < w; x += grainTile.width) ctx.drawImage(grainTile, x, y);
  }
  ctx.restore();
}

/** The site's sunrise motif: alternating wedges radiating from a point. */
export function sunburst(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  rays = 24,
  color: string = BRAND.yellow,
  alpha = 0.1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const step = (Math.PI * 2) / rays;
  for (let i = 0; i < rays; i += 2) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, i * step, (i + 1) * step);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Palm silhouette — trunk plus fronds, drawn as strokes so it scales cleanly. */
export function palm(ctx: Ctx, x: number, y: number, s: number, color: string, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";

  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.12, -0.55, 0.05, -1);
  ctx.stroke();

  const fronds: Array<[number, number, number, number]> = [
    [-0.62, -1.16, -0.86, -0.9],
    [-0.5, -1.42, -0.78, -1.4],
    [0.6, -1.16, 0.86, -0.92],
    [0.48, -1.42, 0.78, -1.42],
    [-0.06, -1.62, -0.3, -1.72],
    [0.16, -1.6, 0.42, -1.7],
  ];
  ctx.lineWidth = 0.055;
  for (const [cxp, cyp, ex, ey] of fronds) {
    ctx.beginPath();
    ctx.moveTo(0.05, -1);
    ctx.quadraticCurveTo(cxp, cyp, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0.05, -1.02, 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ type */

export function setDisplay(ctx: Ctx, size: number, weight = 600) {
  ctx.font = `${weight} ${size}px "${DISPLAY}", "Times New Roman", serif`;
}

export function setMono(ctx: Ctx, size: number, weight = 500, italic = false) {
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px "${MONO}", ui-monospace, monospace`;
}

type Align = "left" | "center" | "right";

/**
 * Display type in the event's wordmark treatment: a hard black offset copy
 * behind a yellow face, exactly how "HACKER HOUSE" is set on hhgoa.com.
 */
export function displayText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: {
    size: number;
    weight?: number;
    color?: string;
    shadow?: string | null;
    offset?: number;
    align?: Align;
    tracking?: number;
  },
) {
  const {
    size,
    weight = 600,
    color = BRAND.yellow,
    shadow = BRAND.ink,
    offset = size * 0.045,
    align = "left",
    tracking = 0,
  } = opts;
  setDisplay(ctx, size, weight);
  const w = measureTracked(ctx, text, tracking);
  const startX = align === "left" ? x : align === "center" ? x - w / 2 : x - w;
  if (shadow) drawTracked(ctx, text, startX + offset, y + offset, tracking, shadow);
  drawTracked(ctx, text, startX, y, tracking, color);
  return w;
}

/** Uppercase tracked mono — the site's label voice. */
export function trackedMono(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: {
    size: number;
    color?: string;
    weight?: number;
    tracking?: number;
    align?: Align;
    italic?: boolean;
  },
) {
  const {
    size,
    color = BRAND.cream,
    weight = 500,
    tracking = size * 0.18,
    align = "left",
    italic = false,
  } = opts;
  setMono(ctx, size, weight, italic);
  const w = measureTracked(ctx, text, tracking);
  const startX = align === "left" ? x : align === "center" ? x - w / 2 : x - w;
  drawTracked(ctx, text, startX, y, tracking, color);
  return w;
}

/**
 * Manual letter-spacing. ctx.letterSpacing exists in newer Chrome/Safari only,
 * so spacing is applied per glyph to keep every browser pixel-identical.
 */
function drawTracked(ctx: Ctx, text: string, x: number, y: number, tracking: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (!tracking) {
    ctx.fillText(text, x, y);
  } else {
    let cx = x;
    for (const ch of text) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + tracking;
    }
  }
  ctx.restore();
}

export function measureTracked(ctx: Ctx, text: string, tracking: number) {
  if (!tracking) return ctx.measureText(text).width;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - tracking;
}

/** Shrink `size` until `text` fits `maxWidth`. */
export function fitDisplay(ctx: Ctx, text: string, maxWidth: number, size: number, weight = 600) {
  let s = size;
  setDisplay(ctx, s, weight);
  while (ctx.measureText(text).width > maxWidth && s > 12) {
    s *= 0.94;
    setDisplay(ctx, s, weight);
  }
  return s;
}

export function fitMono(ctx: Ctx, text: string, maxWidth: number, size: number, tracking: number) {
  let s = size;
  setMono(ctx, s, 500);
  while (measureTracked(ctx, text, tracking * (s / size)) > maxWidth && s > 8) {
    s *= 0.94;
    setMono(ctx, s, 500);
  }
  return s;
}

/**
 * Text laid along a circular arc — used for the ring on the PFP frame, where
 * flat type would be clipped by X's circular avatar mask.
 */
export function curvedText(
  ctx: Ctx,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  opts: { size: number; color?: string; tracking?: number; weight?: number; flip?: boolean },
) {
  const { size, color = BRAND.green, tracking = size * 0.22, weight = 500, flip = false } = opts;
  setMono(ctx, size, weight);
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  const dir = flip ? -1 : 1;
  let angle = centerAngle - (dir * total) / (2 * radius);

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  // 'middle' keeps both the top and the bottom arc optically centred in the ring
  // band, whatever the glyph's ascender/descender does.
  ctx.textBaseline = "middle";
  chars.forEach((ch, i) => {
    const step = widths[i] / radius;
    const a = angle + (dir * step) / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += dir * step;
  });
  ctx.restore();
}

/* ------------------------------------------------------------------ badge bits */

/** Deterministic barcode strip for the ID card footer. */
export function barcode(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  color: string = BRAND.ink,
) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.round(r() * 6);
    if (r() > 0.32) ctx.fillRect(cx, y, Math.min(bw, x + w - cx), h);
    cx += bw + 2 + Math.round(r() * 4);
  }
  ctx.restore();
}

/** Tick marks around a circle — the "instrument bezel" detail on the frame. */
export function bezelTicks(
  ctx: Ctx,
  cx: number,
  cy: number,
  radius: number,
  count: number,
  len: number,
  color: string,
  width = 3,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const long = i % 6 === 0 ? len * 1.9 : len;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.lineTo(cx + Math.cos(a) * (radius + long), cy + Math.sin(a) * (radius + long));
    ctx.stroke();
  }
  ctx.restore();
}

/** Four-pointed sparkle — the site uses ✦ as its bullet. */
export function sparkle(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ marks */

const markCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Load one of the event's own SVG marks (same-origin, so the canvas stays untainted). */
export function loadMark(src: string): Promise<HTMLImageElement | null> {
  const hit = markCache.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  markCache.set(src, p);
  return p;
}

/** The Devanagari गोवा mark from hhgoa.com. */
export const loadGoaMark = () => loadMark("/brand/goa.svg");

export function drawMark(
  ctx: Ctx,
  mark: HTMLImageElement | null,
  cx: number,
  cy: number,
  size: number,
  alpha = 1,
) {
  if (!mark || !mark.width) return;
  const s = size / Math.max(mark.width, mark.height);
  const w = mark.width * s;
  const h = mark.height * s;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(mark, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}
