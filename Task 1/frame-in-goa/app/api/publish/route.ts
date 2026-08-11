import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function originOf(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/**
 * Optional third share route: park the finished PNG on Vercel Blob and hand back
 * a page URL whose og:image is that PNG, so an X post made of a *link* still
 * previews the real graphic. Without a blob token the client silently falls back
 * to download-plus-composer, so the app works with zero configuration.
 */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "link-sharing-not-configured" }, { status: 501 });
  }

  if (!(req.headers.get("content-type") ?? "").startsWith("image/png")) {
    return NextResponse.json({ error: "png-only" }, { status: 415 });
  }

  const body = await req.arrayBuffer();
  if (body.byteLength < 1024 || body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "bad-size" }, { status: 413 });
  }

  const head = new Uint8Array(body.slice(0, 8));
  if (PNG_MAGIC.some((b, i) => head[i] !== b)) {
    return NextResponse.json({ error: "not-a-png" }, { status: 415 });
  }

  try {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`frames/${crypto.randomUUID()}.png`, body, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });

    const name = (req.headers.get("x-frame-name") ?? "").slice(0, 120);
    const page = new URL("/f", originOf(req));
    page.searchParams.set("i", url);
    if (name) page.searchParams.set("n", decodeURIComponent(name));

    return NextResponse.json({ pageUrl: page.toString(), imageUrl: url });
  } catch {
    return NextResponse.json({ error: "upload-failed" }, { status: 502 });
  }
}
