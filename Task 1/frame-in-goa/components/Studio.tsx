"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CANVAS, EVENT, type Format } from "@/lib/brand";
import { clamp, decodeImage, findSubject } from "@/lib/image";
import { renderGraphic, type PhotoSlot } from "@/lib/render";
import { builderId, builderTitle, clearance } from "@/lib/titles";
import { canShareImage, canvasToPng, downloadBlob, shareResult } from "@/lib/share";

const FORMATS: Array<{ id: Format; label: string; note: string }> = [
  { id: "pfp", label: "PFP Frame", note: "1024×1024 · survives X's circular crop" },
  { id: "card", label: "Builder ID", note: "1080×1350 · event badge for the timeline" },
  { id: "squad", label: "Squad", note: "1200×675 · up to 4 teammates, one frame" },
];

const MAX_SLOTS = 4;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "builder";

export default function Studio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetSlot = useRef(0);

  const [format, setFormat] = useState<Format>("pfp");
  const [slots, setSlots] = useState<Array<PhotoSlot | null>>([null, null, null, null]);
  const [active, setActive] = useState(0);
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [team, setTeam] = useState("");
  const [spin, setSpin] = useState(0);
  const [variant, setVariant] = useState(0);
  const [status, setStatus] = useState("");
  const [warn, setWarn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);

  useEffect(() => setNativeShare(canShareImage()), []);

  const seed = `${name}|${stack}`;
  const title = useMemo(() => builderTitle(seed, spin), [seed, spin]);
  const clear = useMemo(() => clearance(seed, spin), [seed, spin]);
  const serial = useMemo(() => builderId(seed), [seed]);

  const photos = useMemo(
    () =>
      format === "squad" ? (slots.filter(Boolean) as PhotoSlot[]) : slots[0] ? [slots[0]] : [],
    [slots, format],
  );

  const hasPhoto = photos.length > 0;

  /* --------------------------------------------------------------- render */
  const blobRef = useRef<{ blob: Blob; key: string } | null>(null);
  const renderKey = `${format}|${variant}|${name}|${stack}|${team}|${title}|${clear}|${photos
    .map((p) => `${p.fx.toFixed(3)},${p.fy.toFixed(3)},${p.zoom.toFixed(3)},${p.label ?? ""}`)
    .join(";")}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void renderGraphic(canvas, {
        format,
        photos,
        name,
        stack,
        title,
        clearance: clear,
        serial,
        teamName: team,
        variant,
      });
    });
    // Encode shortly after the last change so "Share to X" has a PNG ready the
    // instant it's tapped — iOS only allows navigator.share inside a gesture.
    const encode = window.setTimeout(async () => {
      if (cancelled || !canvasRef.current) return;
      try {
        const blob = await canvasToPng(canvasRef.current);
        if (!cancelled) blobRef.current = { blob, key: renderKey };
      } catch {
        /* the share handler will encode on demand instead */
      }
    }, 260);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(encode);
    };
    // renderKey covers every visual input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey, serial]);

  /* --------------------------------------------------------------- upload */
  const ingest = useCallback(
    async (files: File[], startSlot: number) => {
      const many = format === "squad";
      const list = files.slice(0, many ? MAX_SLOTS : 1);
      if (!list.length) return;
      setBusy(list.length > 1 ? `Reading ${list.length} photos…` : "Reading photo…");
      setWarn(false);
      try {
        let idx = many ? startSlot : 0;
        for (const file of list) {
          const img = await decodeImage(file);
          const subject = findSubject(img);
          const at = idx;
          setSlots((prev) => {
            const next = [...prev];
            next[at] = { img, fx: subject.fx, fy: subject.fy, zoom: 1, label: prev[at]?.label };
            return next;
          });
          idx = Math.min(idx + 1, MAX_SLOTS - 1);
        }
        setActive(many ? startSlot : 0);
        setStatus("Framed. Drag the photo to reposition, pinch or scroll to zoom.");
      } catch {
        setWarn(true);
        setStatus("Couldn't read that file — try a JPG, PNG or HEIC.");
      } finally {
        setBusy(null);
      }
    },
    [format],
  );

  const pickFile = (slot: number) => {
    targetSlot.current = slot;
    fileRef.current?.click();
  };

  /* --------------------------------------------------------------- pan / zoom */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const patchActive = (fn: (p: PhotoSlot) => PhotoSlot) =>
    setSlots((prev) => {
      const next = [...prev];
      const p = next[active];
      if (p) next[active] = fn(p);
      return next;
    });

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasPhoto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = e.currentTarget.getBoundingClientRect();

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinch.current) {
        pinch.current = { dist, zoom: slots[active]?.zoom ?? 1 };
        return;
      }
      const ratio = dist / (pinch.current.dist || dist);
      const base = pinch.current.zoom;
      patchActive((p) => ({ ...p, zoom: clamp(base * ratio, 1, 4) }));
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    patchActive((p) => ({
      ...p,
      fx: clamp(p.fx - dx / (rect.width * p.zoom), 0, 1),
      fy: clamp(p.fy - dy / (rect.height * p.zoom), 0, 1),
    }));
  };

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!hasPhoto) return;
    patchActive((p) => ({ ...p, zoom: clamp(p.zoom * (e.deltaY > 0 ? 0.94 : 1.06), 1, 4) }));
  };

  /* --------------------------------------------------------------- output */
  const filename = `hhgoa26-${format}-${slug(name || team)}.png`;

  const currentBlob = async () => {
    const cached = blobRef.current;
    if (cached && cached.key === renderKey) return cached.blob;
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("no canvas");
    const blob = await canvasToPng(canvas);
    blobRef.current = { blob, key: renderKey };
    return blob;
  };

  const onDownload = async () => {
    try {
      setWarn(false);
      downloadBlob(await currentBlob(), filename);
      setStatus(`Saved ${filename} — ${CANVAS[format].w}×${CANVAS[format].h} PNG.`);
    } catch {
      setWarn(true);
      setStatus("Export failed. Try again, or take a screenshot as a fallback.");
    }
  };

  const onShare = async () => {
    setBusy("Opening X…");
    setWarn(false);
    try {
      const blob = await currentBlob();
      const outcome = await shareResult({ blob, filename, format, name: name || team });
      if (outcome.route === "native")
        setStatus("Share sheet open — pick X, the caption is already written.");
      else if (outcome.route === "link")
        setStatus("X composer open with a link that previews your graphic. Hit post.");
      else
        setStatus(
          `Downloaded ${filename} and opened X with the caption — attach the file and post.`,
        );
    } catch {
      setWarn(true);
      setStatus("Share failed — download the PNG and post it manually.");
    } finally {
      setBusy(null);
    }
  };

  /* --------------------------------------------------------------- view */
  const spec = FORMATS.find((f) => f.id === format)!;
  const aspect = `${CANVAS[format].w} / ${CANVAS[format].h}`;

  return (
    <section className="studio" id="studio">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple={format === "squad"}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void ingest(files, targetSlot.current);
        }}
      />

      {/* ------------------------------------------------ preview */}
      <div className="panel">
        <div className="panel__head">
          <p className="label label--key">[ 02 / Live preview ]</p>
          <p className="label">{spec.note}</p>
        </div>

        <div
          className={`stage${dragOver ? " stage--over" : ""}`}
          style={{ aspectRatio: aspect }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void ingest(Array.from(e.dataTransfer.files), active);
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS[format].w}
            height={CANVAS[format].h}
            aria-label={`${spec.label} preview`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={onWheel}
          />

          {!hasPhoto && (
            <button type="button" className="stage__drop" onClick={() => pickFile(0)}>
              <span className="label label--key">[ 01 / Upload ]</span>
              <strong>Drop a photo</strong>
              <span className="label">
                JPG · PNG · HEIC · any shape — tap to choose{busy ? ` · ${busy}` : ""}
              </span>
            </button>
          )}
        </div>

        {hasPhoto && (
          <>
            <div className="zoom">
              <span className="label">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={slots[active]?.zoom ?? 1}
                onChange={(e) => {
                  const zoom = Number(e.target.value);
                  patchActive((p) => ({ ...p, zoom }));
                }}
                aria-label="Zoom the photo"
              />
              <button type="button" className="btn btn--ghost" onClick={() => pickFile(active)}>
                Replace
              </button>
            </div>
            <div className="stage__hint">
              <span className="label">Drag to reposition · auto-centred on the subject</span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setVariant((v) => (v + 1) % 3)}
              >
                Restyle ↻
              </button>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------ controls */}
      <div className="panel">
        <div className="panel__head">
          <p className="label label--key">[ 03 / Format &amp; details ]</p>
          <p className="label">No login. Nothing uploaded.</p>
        </div>

        <div className="segment" role="group" aria-label="Output format">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={format === f.id}
              onClick={() => {
                setFormat(f.id);
                if (f.id !== "squad") setActive(0);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {format === "squad" ? (
          <>
            <label className="field">
              <span>Team name</span>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Segfault Beach Club"
                maxLength={24}
              />
            </label>
            <div className="slots">
              {slots.map((slot, i) => (
                <div className="slot" key={i} data-active={active === i}>
                  <button
                    type="button"
                    className="slot__thumb"
                    onClick={() => {
                      setActive(i);
                      pickFile(i);
                    }}
                    aria-label={`Photo for teammate ${i + 1}`}
                  >
                    {slot ? <Thumb slot={slot} /> : <span>+ ADD</span>}
                  </button>
                  <input
                    value={slot?.label ?? ""}
                    onChange={(e) => {
                      const label = e.target.value;
                      setSlots((prev) => {
                        const next = [...prev];
                        const p = next[i];
                        if (p) next[i] = { ...p, label };
                        return next;
                      });
                    }}
                    onFocus={() => slot && setActive(i)}
                    placeholder={`Builder 0${i + 1}`}
                    maxLength={16}
                    disabled={!slot}
                    aria-label={`Name for teammate ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid2">
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={26}
              />
            </label>
            {format === "card" && (
              <label className="field">
                <span>Stack / role</span>
                <input
                  value={stack}
                  onChange={(e) => setStack(e.target.value)}
                  placeholder="Rust · infra"
                  maxLength={26}
                />
              </label>
            )}
          </div>
        )}

        {format === "card" && (
          <div className="classline">
            <div>
              <p className="label label--key">Builder class</p>
              <b>{title}</b>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => setSpin((s) => s + 1)}>
              Re-roll
            </button>
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onDownload} disabled={!hasPhoto || !!busy}>
            ↓ Download PNG
          </button>
          <button
            type="button"
            className="btn btn--x"
            onClick={onShare}
            disabled={!hasPhoto || !!busy}
          >
            {nativeShare ? "Share to X" : "Share to X →"}
          </button>
        </div>

        <p className={`status${warn ? " status--warn" : ""}`} role="status">
          {busy ?? status}
        </p>

        <p className="label" style={{ marginTop: "0.9rem", lineHeight: 1.8 }}>
          Caption + {EVENT.hashtag} are pre-filled for you.
        </p>
      </div>
    </section>
  );
}

/** Square thumbnail for a squad slot, drawn from the already-decoded photo. */
function Thumb({ slot }: { slot: PhotoSlot }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const S = (c.width = c.height = 128);
    const { img, fx, fy } = slot;
    const s = Math.max(S / img.width, S / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(
      img as CanvasImageSource,
      Math.min(0, Math.max(S - dw, S / 2 - fx * dw)),
      Math.min(0, Math.max(S - dh, S / 2 - fy * dh)),
      dw,
      dh,
    );
  }, [slot]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
}
