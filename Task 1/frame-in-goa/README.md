# Frame in Goa — HH Goa 2026 frame & builder ID generator

Shortlisting task #1 for **Hacker House Goa 2026**. Upload a photo, get a branded
graphic back in about a second, download it or fire it at X with the caption and
**#FrameInGoa** already written. No login, no signup, no gate before the result.

Built with Next.js 15 + TypeScript. Every graphic is drawn on `<canvas>` in the
browser — the photo never leaves the device unless the user taps share.

---

## Three formats (the brief asked for one)

| Format | Size | Why that size |
| --- | --- | --- |
| **PFP frame** | 1024×1024 | X masks avatars to a **circle**, so all branding sits inside the inscribed circle — nothing is lost to the crop. |
| **Builder ID** | 1080×1350 | 4:5 is the tallest ratio X shows uncropped in-timeline, so the badge reads big. |
| **Squad** | 1200×675 | The event brief also asks for a way to "bring your teammates into one combined frame" — up to four photos on one 16:9 card. |

Each has three colourways (**Restyle ↻**).

## On-brand, not a logo pasted on a template

The palette and type are lifted from the CSS that hhgoa.com actually serves, not
eyeballed from a screenshot:

- `#0B6839` green, `#FEE101` yellow, `#FF0080` pink, `#FFFBE8` cream
  (the site's `--primary` / `--secondary` / `--accent` custom properties)
- **Imbue** display + **Victor Mono**, self-hosted — the site's `--font-imbue`
  and `--font-victor-mono`
- The site's own Devanagari **गोवा** mark
- The event's sunrise, palm and film-grain textures, redrawn procedurally so the
  output stays crisp at any size

Wordmarks use the site's signature hard black offset shadow.

## Handling real photos

The brief says not to assume anyone crops first, so:

- **HEIC/HEIF** from iPhone: decoded natively where the browser can (Safari),
  otherwise a wasm decoder is lazy-loaded *only* for those files.
- **EXIF rotation** applied via `createImageBitmap(..., { imageOrientation: "from-image" })`,
  so sideways phone portraits come in upright.
- **Any aspect ratio**: cover-fit around a focus point, clamped so the frame is
  never left with empty edges.
- **Off-centre subjects**: a subject finder runs on a 72px thumbnail — skin-tone
  mass first, gradient energy as fallback. Flat skin-coloured regions (sand,
  timber, beige walls) are excluded by an edge-energy test, because on a beach
  photo the sand otherwise outvotes the face.
- **Manual override**: drag to reposition, pinch / scroll / slider to zoom.

## The share flow

Three routes, best-first, all ending with the caption + `#FrameInGoa` pre-filled:

1. **Native share with the file attached** — phones only. The OS sheet lists X
   and the PNG is attached directly. Desktop Chrome also implements Web Share,
   but the desktop OS sheet usually has no X target, so it is deliberately
   skipped there.
2. **Link with a real OG image** — if blob storage is configured, the PNG is
   uploaded and X opens with a link whose `og:image` is that exact graphic
   (never a blank default thumbnail).
3. **Download + composer** — the PNG is saved and X opens with the caption
   written; attach and post.

Route 3 needs no configuration, so the app is fully functional out of the box.

The PNG is encoded shortly after each edit, so the share button has a file ready
the moment it is tapped — iOS only permits `navigator.share` inside a gesture.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploy (Vercel — about two minutes)

```bash
npm i -g vercel
vercel            # link/create the project
vercel --prod     # returns the live URL to submit
```

Or push the repo to GitHub and import it at vercel.com/new — no configuration
needed, no environment variables required.

### Optional: enable the og:image link route

Only needed if you want share route 2. In the Vercel dashboard create a **Blob**
store and connect it to the project; that injects `BLOB_READ_WRITE_TOKEN`.
Redeploy and `/api/publish` starts returning share links instead of `501`.

`/f` only renders images served from `*.public.blob.vercel-storage.com`, so the
image URL in the query string can't be pointed at arbitrary content to borrow
the domain's link preview.

## Layout

```
app/
  page.tsx              landing + studio
  layout.tsx            metadata, fonts, theme
  f/page.tsx            share landing that carries the og:image
  api/publish/route.ts  optional blob upload (501 without a token)
components/Studio.tsx   upload, crop, live preview, download, share
lib/
  brand.ts              palette, copy and canvas sizes
  image.ts              HEIC/EXIF decode + subject finder
  titles.ts             deterministic builder class, clearance, serial
  share.ts              caption + the three share routes
  render/               primitives, pfp, card, squad
```
