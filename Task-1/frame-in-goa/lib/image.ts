/**
 * Photo intake: decode anything a phone throws at us, then work out where the
 * subject actually is so an off-centre snapshot still crops well without the
 * user cropping first.
 */

export type Drawable = ImageBitmap | HTMLImageElement;
export type Subject = { fx: number; fy: number };

const isHeic = (file: File) =>
  /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

async function viaImgElement(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Keep the object URL alive: revoking it can blank the element in Safari.
    return img;
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

async function bitmap(blob: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      // 'from-image' applies the EXIF rotation iPhones bake in, so portraits
      // don't arrive sideways.
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      /* fall through to the <img> path */
    }
  }
  return viaImgElement(blob);
}

/** Decode a user file to something drawable, converting HEIC/HEIF when the browser can't. */
export async function decodeImage(file: File): Promise<Drawable> {
  if (!isHeic(file)) return bitmap(file);

  // Safari decodes HEIC natively — try that before pulling in the wasm decoder.
  try {
    return await bitmap(file);
  } catch {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const jpeg = Array.isArray(out) ? out[0] : out;
    return bitmap(jpeg as Blob);
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Cheap subject finder: skin-tone mass first (faces), edge energy as a fallback,
 * blended toward centre so it degrades to a sane crop on landscapes and objects.
 * Runs on a 72px thumbnail, so it costs well under a frame.
 */
export function findSubject(img: Drawable): Subject {
  const S = 72;
  const off = document.createElement("canvas");
  off.width = S;
  off.height = S;
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { fx: 0.5, fy: 0.42 };

  ctx.drawImage(img as CanvasImageSource, 0, 0, S, S);
  let px: Uint8ClampedArray;
  try {
    px = ctx.getImageData(0, 0, S, S).data;
  } catch {
    return { fx: 0.5, fy: 0.42 };
  }

  const luma = new Float32Array(S * S);
  const skin = new Uint8Array(S * S);

  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    luma[p] = 0.299 * r + 0.587 * g + 0.114 * b;

    // Kovac et al. skin rule — coarse, but it reliably finds a face in a selfie.
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (r > 95 && g > 40 && b > 20 && mx - mn > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
      skin[p] = 1;
    }
  }

  const edge = new Float32Array(S * S);
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const p = y * S + x;
      edge[p] = Math.abs(luma[p + 1] - luma[p - 1]) + Math.abs(luma[p + S] - luma[p - S]);
    }
  }

  // Sand, timber and beige walls all pass the skin rule, and on a beach photo
  // they outweigh the face by area. Faces carry detail, flat surfaces don't, so
  // only textured skin votes — and each vote is weighted by how textured it is.
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const p = y * S + x;
      if (!skin[p] || edge[p] < 8) continue;
      const w = 1 + Math.min(edge[p], 120) / 40;
      sx += x * w;
      sy += y * w;
      sw += w;
    }
  }

  if (sw > 12) {
    const fx = sx / sw / S;
    // Aim a little above the skin centroid: the mass includes neck and chest,
    // the face sits above it.
    const fy = sy / sw / S - 0.04;
    return { fx: clamp(fx, 0.16, 0.84), fy: clamp(fy, 0.14, 0.8) };
  }

  // No face found: fall back to gradient energy, pulled halfway to centre so an
  // object shot or a landscape still crops sensibly.
  let ex = 0;
  let ey = 0;
  let ew = 0;
  for (let p = 0; p < edge.length; p++) {
    ex += (p % S) * edge[p];
    ey += ((p / S) | 0) * edge[p];
    ew += edge[p];
  }
  if (ew < 1) return { fx: 0.5, fy: 0.42 };
  return {
    fx: clamp((ex / ew / S) * 0.5 + 0.25, 0.25, 0.75),
    fy: clamp((ey / ew / S) * 0.5 + 0.25, 0.22, 0.72),
  };
}
