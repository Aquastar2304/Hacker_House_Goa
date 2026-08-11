import Studio from "@/components/Studio";
import { EVENT } from "@/lib/brand";

export default function Home() {
  return (
    <>
      <header className="shell">
        <div className="topbar">
          <div className="topbar__mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/goa.svg" alt="" aria-hidden="true" />
            <span>HH GOA 2026</span>
          </div>
          <p className="label">
            {EVENT.locus} · {EVENT.dates}
          </p>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div className="hero__kicker">
            <span className="chip chip--pink">Task #1 · Builder ID</span>
            <span className="chip chip--yellow">{EVENT.strap}</span>
            <span className="chip">No login · no upload</span>
          </div>
          <h1>
            FRAME
            <br />
            IN GOA
          </h1>
          <p className="hero__sub">
            Drop in a photo and walk out with an unmistakably <em>Hacker House Goa 2026</em> profile
            frame, builder ID or squad card. Rendered in your browser with the event&apos;s own type
            and palette — download the PNG or fire it straight at X with <em>{EVENT.hashtag}</em>{" "}
            already written.
          </p>
        </section>

        <Studio />

        <section className="steps" aria-label="How it works">
          <div>
            <p className="label label--key">01</p>
            <h3>Any photo, no cropping</h3>
            <p>
              JPG, PNG or an iPhone HEIC. Portrait, landscape, rotated or badly centred — the
              subject is found automatically and the crop is built around it. Drag to fine-tune.
            </p>
          </div>
          <div>
            <p className="label label--key">02</p>
            <h3>Drawn, not pasted</h3>
            <p>
              The frame is generated on canvas in the event&apos;s exact greens, yellow and pink,
              set in Imbue and Victor Mono. Three colourways, and a builder class minted from your
              name.
            </p>
          </div>
          <div>
            <p className="label label--key">03</p>
            <h3>Straight to the timeline</h3>
            <p>
              A real full-resolution PNG lands in your downloads, or the share sheet hands the image
              to X with the caption and {EVENT.hashtag} pre-filled. Nothing leaves your device
              unless you choose to share.
            </p>
          </div>
        </section>
      </main>

      <footer className="shell">
        <div className="foot">
          <span>Built for the HH Goa 2026 shortlisting task</span>
          <span>
            <a href="https://hhgoa.com" target="_blank" rel="noreferrer noopener">
              hhgoa.com
            </a>{" "}
            · {EVENT.hashtag}
          </span>
        </div>
      </footer>
    </>
  );
}
