import type { Format } from "./brand";

export type ShareRoute = "native" | "link" | "download";
export type ShareOutcome = { route: ShareRoute; url?: string };

const HASHTAG = "#FrameInGoa";

const CAPTION: Record<Format, (name: string) => string> = {
  pfp: () =>
    "New profile picture, same terminal. Locked in for Hacker House Goa 2026 — 28–31 Oct, Goa. 🌴",
  card: (name) =>
    `${name ? `${name} — ` : ""}Builder ID generated. Hacker House Goa 2026, 28–31 Oct, Goa. Less noise, more signal. 🌴`,
  squad: () => "Squad assembled for Hacker House Goa 2026 — 28–31 Oct, Goa. 🌴",
};

export function captionFor(format: Format, name: string) {
  return CAPTION[format](name.trim());
}

/**
 * Assemble the tweet. The call-to-action link is only ever promised when there
 * really is one — either the og:image share page, or this tool's own URL.
 */
function compose(caption: string, cta: string | null) {
  return [caption, cta ? `Make your own in 10 seconds: ${cta}` : null, HASHTAG]
    .filter(Boolean)
    .join("\n\n");
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the image"))),
      "image/png",
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function toFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: "image/png" });
}

/**
 * True when handing the PNG to the OS share sheet is genuinely the best route:
 * a touch device, where the sheet lists the X app and attaches the image itself.
 * Desktop Chrome also implements Web Share, but the Windows/macOS sheet usually
 * has no X target — there the web composer wins, so we don't use it.
 */
export function canShareImage(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (!coarse || !navigator.maxTouchPoints) return false;
  try {
    return navigator.canShare({ files: [toFile(new Blob([], { type: "image/png" }), "p.png")] });
  } catch {
    return false;
  }
}

/** Upload for the link route. Resolves to null whenever blob storage isn't configured. */
async function publish(blob: Blob, name: string): Promise<string | null> {
  try {
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "content-type": "image/png",
        "x-frame-name": encodeURIComponent(name.slice(0, 40)),
      },
      body: blob,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { pageUrl?: string };
    return data.pageUrl ?? null;
  } catch {
    return null;
  }
}

function openIntent(text: string) {
  const params = new URLSearchParams({ text });
  window.open(`https://x.com/intent/post?${params.toString()}`, "_blank", "noopener,noreferrer");
}

/**
 * Share, best route first:
 *  1. native share sheet with the PNG attached (phones — what most people use);
 *  2. an og:image link, so X's preview shows the real graphic;
 *  3. download the PNG and open a pre-filled composer to attach it.
 * Every route ends with the caption and #FrameInGoa already written.
 */
export async function shareResult(opts: {
  blob: Blob;
  filename: string;
  format: Format;
  name: string;
}): Promise<ShareOutcome> {
  const caption = captionFor(opts.format, opts.name);
  const file = toFile(opts.blob, opts.filename);
  const site = typeof window !== "undefined" ? window.location.origin : null;

  if (canShareImage() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: compose(caption, site),
        title: "Hacker House Goa 2026",
      });
      return { route: "native" };
    } catch (err) {
      // AbortError means the user dismissed the sheet — don't fall through and spam them.
      if (err instanceof DOMException && err.name === "AbortError") return { route: "native" };
    }
  }

  const pageUrl = await publish(opts.blob, opts.name);
  if (pageUrl) {
    openIntent(compose(caption, pageUrl));
    return { route: "link", url: pageUrl };
  }

  downloadBlob(opts.blob, opts.filename);
  openIntent(compose(caption, site));
  return { route: "download" };
}
