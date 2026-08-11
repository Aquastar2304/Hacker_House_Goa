import { CANVAS, type Format } from "../brand";
import type { Drawable } from "../image";
import { ensureFonts, loadGoaMark, type Ctx } from "./primitives";
import { drawPfp } from "./pfp";
import { drawCard } from "./card";
import { drawSquad } from "./squad";

/** One uploaded photo plus how the user has framed it. */
export type PhotoSlot = {
  img: Drawable;
  /** Focus point in 0..1 image space — seeded by the subject finder, then draggable. */
  fx: number;
  fy: number;
  zoom: number;
  label?: string;
};

export type RenderInput = {
  format: Format;
  photos: PhotoSlot[];
  name: string;
  stack: string;
  title: string;
  clearance: string;
  serial: string;
  teamName?: string;
  /** Colourway index — the "restyle" button cycles this. */
  variant: number;
};

export type Scene = {
  ctx: Ctx;
  w: number;
  h: number;
  goa: HTMLImageElement | null;
  input: RenderInput;
};

/**
 * Draw `input` into `canvas` at full export resolution.
 * Fonts and the brand mark are cached after the first call, so repeat renders
 * (every drag frame, every field keystroke) are pure synchronous canvas work.
 */
export async function renderGraphic(canvas: HTMLCanvasElement, input: RenderInput) {
  const { w, h } = CANVAS[input.format];
  const [, goa] = await Promise.all([ensureFonts(), loadGoaMark()]);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";

  const scene: Scene = { ctx, w, h, goa, input };
  if (input.format === "pfp") drawPfp(scene);
  else if (input.format === "card") drawCard(scene);
  else drawSquad(scene);
}
