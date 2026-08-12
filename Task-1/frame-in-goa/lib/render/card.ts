import { BRAND, EVENT } from "../brand";
import { hash32 } from "../titles";
import type { Scene } from "./index";
import {
  barcode,
  coverDraw,
  displayText,
  drawMark,
  fitDisplay,
  fitMono,
  grain,
  measureTracked,
  palm,
  roundRect,
  setMono,
  sparkle,
  sunburst,
  trackedMono,
} from "./primitives";

/**
 * Colourways: the site's green, its cream, and a night variant.
 * `accent` (the brand pink) is reserved for rules, brackets and notches — at
 * caption size on green it vibrates, so small type uses `label` instead.
 */
const SKINS = [
  {
    bg: BRAND.green,
    ink: BRAND.yellow,
    sub: BRAND.cream,
    label: "rgba(255,251,232,0.72)",
    accent: BRAND.pink,
    panel: BRAND.greenDeep,
    bar: BRAND.yellow,
    barInk: BRAND.green,
  },
  {
    bg: BRAND.cream,
    ink: BRAND.green,
    sub: BRAND.greenInk,
    label: "rgba(3,47,26,0.62)",
    accent: BRAND.pink,
    panel: "#EFE3C2",
    bar: BRAND.green,
    barInk: BRAND.yellow,
  },
  {
    bg: BRAND.greenInk,
    ink: BRAND.yellow,
    sub: BRAND.cream,
    label: "rgba(255,251,232,0.7)",
    accent: BRAND.pink,
    panel: "#021A0F",
    bar: BRAND.pink,
    barInk: BRAND.cream,
  },
];

export function drawCard({ ctx, w, h, goa, input }: Scene) {
  const s = SKINS[input.variant % SKINS.length];
  const M = 64;
  const cx = w / 2;
  const inner = w - M * 2;

  /* ---------------------------------------------------------- backdrop */
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, w, h);
  sunburst(ctx, w * 0.86, -h * 0.06, w * 1.3, 28, s.ink, 0.1);

  /* ---------------------------------------------------------- lanyard slot */
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, cx - 96, 40, 192, 26, 13);
  ctx.fill();
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  /* ---------------------------------------------------------- top data row */
  trackedMono(ctx, `ID ${input.serial}`, M, 126, { size: 20, color: s.sub, tracking: 3 });
  trackedMono(ctx, `CLEARANCE · ${input.clearance}`, w - M, 126, {
    size: 20,
    color: s.ink,
    tracking: 3,
    align: "right",
  });

  /* ---------------------------------------------------------- wordmark */
  displayText(ctx, EVENT.name, M, 226, { size: 96, color: s.ink, offset: 5 });
  displayText(ctx, `${EVENT.place} ${EVENT.year}`, M, 350, { size: 154, color: s.ink, offset: 7 });
  drawMark(ctx, goa, w - M - 74, 274, 150);

  ctx.fillStyle = s.accent;
  ctx.fillRect(M, 380, inner, 7);

  /* ---------------------------------------------------------- photo panel */
  const py = 406;
  const ph = 538;
  ctx.save();
  ctx.beginPath();
  ctx.rect(M, py, inner, ph);
  ctx.clip();
  ctx.fillStyle = s.panel;
  ctx.fillRect(M, py, inner, ph);
  const photo = input.photos[0];
  if (photo) coverDraw(ctx, photo.img, M, py, inner, ph, photo.fx, photo.fy, photo.zoom);

  // Faint scanlines: reads as a printed credential rather than a pasted selfie.
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#000";
  for (let y = py; y < py + ph; y += 4) ctx.fillRect(M, y, inner, 1);
  ctx.restore();

  ctx.strokeStyle = s.ink;
  ctx.lineWidth = 8;
  ctx.strokeRect(M + 4, py + 4, inner - 8, ph - 8);

  // Registration brackets in the corners.
  const bl = 54;
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = 10;
  const corners: Array<[number, number, number, number]> = [
    [M + 18, py + 18, 1, 1],
    [w - M - 18, py + 18, -1, 1],
    [M + 18, py + ph - 18, 1, -1],
    [w - M - 18, py + ph - 18, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * bl, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * bl);
    ctx.stroke();
  }

  /* ---------------------------------------------------------- identity block */
  const base = py + ph;
  trackedMono(ctx, "NAME", M, base + 42, { size: 20, color: s.label, tracking: 6 });

  const name = (input.name || "YOUR NAME").toUpperCase();
  const nameSize = fitDisplay(ctx, name, inner, 92);
  displayText(ctx, name, M, base + 118, { size: nameSize, color: s.ink, offset: 5 });

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = s.sub;
  ctx.fillRect(M, base + 140, inner, 2);
  ctx.globalAlpha = 1;

  const colY = base + 182;
  const colW = inner * 0.55;

  trackedMono(ctx, "BUILDER CLASS", M, colY, { size: 20, color: s.label, tracking: 6 });
  const classSize = fitDisplay(ctx, input.title, colW, 56);
  displayText(ctx, input.title, M, colY + 56, { size: classSize, color: s.ink, offset: 4 });

  const col2 = M + inner * 0.6;
  trackedMono(ctx, "STACK / ROLE", col2, colY, { size: 20, color: s.label, tracking: 6 });
  const stack = (input.stack || "BUILDER").toUpperCase();
  const stackSize = fitMono(ctx, stack, inner * 0.4, 28, 3);
  trackedMono(ctx, stack, col2, colY + 48, { size: stackSize, color: s.sub, tracking: 3 });

  /* ---------------------------------------------------------- side strap */
  ctx.save();
  ctx.translate(34, py + ph / 2);
  ctx.rotate(-Math.PI / 2);
  trackedMono(ctx, EVENT.strap, 0, 0, {
    size: 20,
    color: s.sub,
    tracking: 8,
    align: "center",
  });
  ctx.restore();

  /* ---------------------------------------------------------- footer */
  const fy = h - 108;
  ctx.setLineDash([12, 12]);
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, fy - 14);
  ctx.lineTo(w, fy - 14);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = s.bar;
  ctx.fillRect(0, fy, w, h - fy);

  // Ticket notches.
  ctx.fillStyle = s.bg;
  for (const nx of [0, w]) {
    ctx.beginPath();
    ctx.arc(nx, fy, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  barcode(ctx, M, fy + 30, 236, 48, hash32(input.serial), s.barInk);

  palm(ctx, cx - 214, fy + 82, 26, s.barInk);
  palm(ctx, cx + 214, fy + 82, 26, s.barInk, true);

  setMono(ctx, 40, 700);
  const tagW = measureTracked(ctx, EVENT.hashtag, 3);
  trackedMono(ctx, EVENT.hashtag, cx - tagW / 2, fy + 68, {
    size: 40,
    color: s.barInk,
    weight: 700,
    tracking: 3,
  });

  trackedMono(ctx, EVENT.locus, w - M, fy + 46, {
    size: 20,
    color: s.barInk,
    tracking: 4,
    align: "right",
  });
  trackedMono(ctx, EVENT.site.toUpperCase(), w - M, fy + 80, {
    size: 20,
    color: s.barInk,
    tracking: 4,
    align: "right",
  });

  sparkle(ctx, M + 268, fy + 54, 10, s.barInk);

  grain(ctx, w, h, 0.05);
}
