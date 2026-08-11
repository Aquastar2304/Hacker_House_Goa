import type { Metadata } from "next";
import Link from "next/link";
import { EVENT } from "@/lib/brand";

type Search = { [key: string]: string | string[] | undefined };

/**
 * Only ever echo an image URL that came from our own blob store. The URL arrives
 * in a query string, so without this check anyone could point the card at
 * arbitrary content and borrow this domain's link preview.
 */
function safeImage(raw: string | string[] | undefined): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!/(^|\.)public\.blob\.vercel-storage\.com$/i.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const asName = (raw: string | string[] | undefined) =>
  typeof raw === "string" ? raw.replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 40) : "";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const image = safeImage(sp.i);
  const name = asName(sp.n);
  const title = name
    ? `${name} is going to Hacker House Goa 2026`
    : "Hacker House Goa 2026 — #FrameInGoa";
  const description = `${EVENT.locus} · ${EVENT.dates}. Make your own frame or builder ID in seconds.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const image = safeImage(sp.i);
  const name = asName(sp.n);

  return (
    <main className="shell">
      <div className="sharepage">
        <p className="label label--pink">
          {EVENT.locus} · {EVENT.dates}
        </p>
        <h1 className="display" style={{ fontSize: "clamp(3rem, 11vw, 6rem)" }}>
          {name ? `${name} is in.` : "Framed in Goa."}
        </h1>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`${name || "A builder"}'s Hacker House Goa 2026 graphic`} />
        ) : (
          <p className="label">That frame link has expired or is malformed.</p>
        )}
        <Link className="btn" href="/" style={{ width: "auto" }}>
          Make yours →
        </Link>
        <p className="label">{EVENT.hashtag}</p>
      </div>
    </main>
  );
}
