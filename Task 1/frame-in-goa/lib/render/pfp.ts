import { BRAND, EVENT } from "../brand";
import type { Scene } from "./index";
import {
  bezelTicks,
  coverDraw,
  curvedText,
  drawMark,
  grain,
  measureTracked,
  palm,
  setMono,
  sparkle,
  sunburst,
  trackedMono,
} from "./primitives";

/**
 * Three colourways of the same ring. All of them keep every piece of branding
 * inside the inscribed circle, because X masks profile pictures to a circle —
 * a rectangular badge would simply lose its corners.
 */
const RINGS = [
  { band: BRAND.yellow, text: BRAND.green, tick: BRAND.pink, edge: BRAND.pink },
  { band: BRAND.pink, text: BRAND.cream, tick: BRAND.yellow, edge: BRAND.yellow },
  { band: BRAND.cream, text: BRAND.green, tick: BRAND.pink, edge: BRAND.green },
];

export function drawPfp({ ctx, w, h, goa, input }: Scene) {
  const ring = RINGS[input.variant % RINGS.length];
  const cx = w / 2;
  const cy = h / 2;
  const outer = w * 0.488;
  const inner = w * 0.409;
  const mid = (outer + inner) / 2;
  const band = outer - inner;

  /* ---------------------------------------------------------- backdrop */
  ctx.fillStyle = BRAND.green;
  ctx.fillRect(0, 0, w, h);
  sunburst(ctx, cx, -h * 0.14, w * 1.5, 30, BRAND.yellow, 0.1);

  palm(ctx, w * 0.11, h * 1.02, w * 0.17, "rgba(0,0,0,0.3)");
  palm(ctx, w * 0.89, h * 1.04, w * 0.2, "rgba(0,0,0,0.24)", true);

  const vignette = ctx.createRadialGradient(cx, cy, w * 0.3, cx, cy, w * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  /* ---------------------------------------------------------- ring band */
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = w * 0.03;
  ctx.shadowOffsetY = w * 0.008;
  ctx.fillStyle = ring.band;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = ring.edge;
  ctx.lineWidth = band * 0.09;
  ctx.beginPath();
  ctx.arc(cx, cy, outer - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  /* ---------------------------------------------------------- the photo */
  const photo = input.photos[0];
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = BRAND.greenInk;
  ctx.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);
  if (photo) {
    coverDraw(
      ctx,
      photo.img,
      cx - inner,
      cy - inner,
      inner * 2,
      inner * 2,
      photo.fx,
      photo.fy,
      photo.zoom,
    );
  }

  // Broadcast-style lower third: it sits inside the circle, so it survives the
  // avatar mask, and it never covers the face.
  const scrim = ctx.createLinearGradient(0, cy + inner * 0.1, 0, cy + inner);
  scrim.addColorStop(0, "rgba(3,47,26,0)");
  scrim.addColorStop(1, "rgba(3,47,26,0.9)");
  ctx.fillStyle = scrim;
  ctx.fillRect(cx - inner, cy + inner * 0.1, inner * 2, inner);

  const tagSize = inner * 0.135;
  const markSize = inner * 0.27;
  setMono(ctx, tagSize, 600);
  const tagTracking = tagSize * 0.1;
  const tagW = measureTracked(ctx, EVENT.hashtag, tagTracking);
  const gap = inner * 0.07;
  const rowW = markSize + gap + tagW;
  const rowY = cy + inner * 0.6;
  drawMark(ctx, goa, cx - rowW / 2 + markSize / 2, rowY - markSize * 0.06, markSize);
  trackedMono(ctx, EVENT.hashtag, cx - rowW / 2 + markSize + gap, rowY + tagSize * 0.36, {
    size: tagSize,
    color: BRAND.yellow,
    weight: 600,
    tracking: tagTracking,
  });
  ctx.restore();

  /* ---------------------------------------------------------- ring furniture */
  ctx.strokeStyle = ring.edge;
  ctx.lineWidth = band * 0.07;
  ctx.beginPath();
  ctx.arc(cx, cy, inner + ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Kept tight against the inner ring so the ticks read as a bezel scale rather
  // than crowding the arc text at mid-band.
  bezelTicks(ctx, cx, cy, inner + band * 0.13, 72, band * 0.09, ring.tick, band * 0.03);

  const ringSize = band * 0.5;
  curvedText(ctx, EVENT.wordmark, cx, cy, mid, -Math.PI / 2, {
    size: ringSize,
    color: ring.text,
    weight: 700,
    tracking: ringSize * 0.36,
  });
  curvedText(ctx, EVENT.dates, cx, cy, mid, Math.PI / 2, {
    size: ringSize * 0.88,
    color: ring.text,
    weight: 500,
    tracking: ringSize * 0.34,
    flip: true,
  });

  for (const a of [0, Math.PI]) {
    sparkle(ctx, cx + Math.cos(a) * mid, cy + Math.sin(a) * mid, band * 0.2, ring.tick);
  }

  grain(ctx, w, h, 0.05);
}
