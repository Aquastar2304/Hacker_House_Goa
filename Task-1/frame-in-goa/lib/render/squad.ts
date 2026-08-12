import { BRAND, EVENT } from "../brand";
import type { Scene } from "./index";
import {
  bezelTicks,
  coverDraw,
  displayText,
  drawMark,
  fitMono,
  grain,
  measureTracked,
  palm,
  setMono,
  sparkle,
  sunburst,
  trackedMono,
} from "./primitives";

const ACCENTS = [BRAND.yellow, BRAND.pink, BRAND.cream];

/**
 * Team frame — the event brief asks for a way to "bring your teammates into one
 * combined frame", so up to four photos share a single 16:9 card.
 */
export function drawSquad({ ctx, w, h, goa, input }: Scene) {
  const accent = ACCENTS[input.variant % ACCENTS.length];
  const photos = input.photos.slice(0, 4);
  const n = Math.max(photos.length, 1);

  ctx.fillStyle = BRAND.green;
  ctx.fillRect(0, 0, w, h);
  sunburst(ctx, w * 0.5, -h * 0.3, w * 1.1, 32, BRAND.yellow, 0.09);
  palm(ctx, 62, h + 10, 120, "rgba(0,0,0,0.28)");
  palm(ctx, w - 54, h + 24, 140, "rgba(0,0,0,0.22)", true);

  /* ---------------------------------------------------------- header */
  trackedMono(ctx, `SQUAD ROSTER · ${EVENT.dates}`, 60, 68, {
    size: 20,
    color: BRAND.cream,
    tracking: 6,
  });
  displayText(ctx, EVENT.wordmark, 60, 158, { size: 104, color: BRAND.yellow, offset: 5 });

  const team = (input.teamName || "").trim().toUpperCase();
  if (team) {
    // Cream, not the brand pink: pink at caption size on green loses too much contrast.
    trackedMono(ctx, `TEAM ${team}`, 60, 196, { size: 24, color: BRAND.cream, tracking: 5 });
  }
  drawMark(ctx, goa, w - 108, 118, 128);

  ctx.fillStyle = accent;
  ctx.fillRect(60, 222, w - 120, 5);

  /* ---------------------------------------------------------- ports */
  const r = n <= 2 ? 130 : n === 3 ? 116 : 100;
  const gap = n <= 2 ? 60 : 34;
  const total = n * 2 * r + (n - 1) * gap;
  const cy = 392;
  let x = (w - total) / 2 + r;

  for (let i = 0; i < n; i++) {
    const p = photos[i];
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pr = r - Math.max(8, r * 0.075);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, cy, pr, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = BRAND.greenInk;
    ctx.fillRect(x - pr, cy - pr, pr * 2, pr * 2);
    if (p) coverDraw(ctx, p.img, x - pr, cy - pr, pr * 2, pr * 2, p.fx, p.fy, p.zoom);
    ctx.restore();

    bezelTicks(ctx, x, cy, r + 8, 48, 7, "rgba(255,255,255,0.35)", 2);

    const label = (p?.label || `BUILDER 0${i + 1}`).toUpperCase();
    const size = fitMono(ctx, label, r * 2.3, 24, 3);
    trackedMono(ctx, label, x, cy + r + 44, {
      size,
      color: BRAND.cream,
      tracking: 3,
      align: "center",
    });
    sparkle(ctx, x, cy + r + 70, 5, BRAND.pink);

    x += 2 * r + gap;
  }

  /* ---------------------------------------------------------- footer */
  const fy = h - 66;
  ctx.fillStyle = BRAND.yellow;
  ctx.fillRect(0, fy, w, h - fy);

  trackedMono(ctx, EVENT.locus, 60, fy + 42, { size: 20, color: BRAND.green, tracking: 5 });

  setMono(ctx, 36, 700);
  const tagW = measureTracked(ctx, EVENT.hashtag, 3);
  trackedMono(ctx, EVENT.hashtag, w / 2 - tagW / 2, fy + 44, {
    size: 36,
    color: BRAND.green,
    weight: 700,
    tracking: 3,
  });

  trackedMono(ctx, EVENT.site.toUpperCase(), w - 60, fy + 42, {
    size: 20,
    color: BRAND.green,
    tracking: 5,
    align: "right",
  });

  grain(ctx, w, h, 0.05);
}
