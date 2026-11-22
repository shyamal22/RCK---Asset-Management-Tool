"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

type Photo = { src: string; alt: string };

const zoomed = () => (typeof window !== "undefined" ? (window.visualViewport?.scale ?? 1) > 1.01 : false);

/** Undo a leftover pinch-zoom (iOS keeps the whole app zoomed after the viewer closes). */
function resetZoom() {
  if (!zoomed()) return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const original = meta.content;
  meta.content = `${original}, maximum-scale=1`;
  requestAnimationFrame(() => requestAnimationFrame(() => (meta.content = original)));
}

/**
 * Photo grid that opens a full-screen viewer inside the app. Never links to the photo's own address:
 * on an installed iPhone app that would leave the app (Safari sheet showing a supabase.co URL).
 * Swipe or the arrows move between photos, pinch zooms (one finger then pans, and swipes pause),
 * X, Esc or a downward swipe closes.
 */
export function PhotoViewer({ photos, label = "Photos" }: { photos: Photo[]; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const retried = useRef(new Set<string>());
  const touch = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();

  // Track pinch-zoom while open, and keep the page behind still.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const onZoom = () => setIsZoomed(zoomed());
    vv?.addEventListener("resize", onZoom);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      vv?.removeEventListener("resize", onZoom);
      html.style.overflow = prevOverflow;
    };
  }, [open]);

  const n = photos.length;
  if (!n) return null;
  const i = Math.min(index, n - 1); // the list can shrink after a refresh
  const p = photos[i];
  const go = (d: number) => setIndex((i + d + n) % n);
  const show = (k: number) => {
    setIndex(k);
    setOpen(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <ul aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((ph, k) => (
          <li key={ph.src}>
            <button
              type="button"
              onClick={() => show(k)}
              aria-label={`View ${ph.alt.toLowerCase()}`}
              className="press surface block aspect-square w-full overflow-hidden p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img src={ph.src} alt={ph.alt} loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={p.alt}
        className="photo-viewer m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
        onClose={() => {
          setOpen(false);
          setIsZoomed(false);
          resetZoom();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = e.touches.length === 1 && !zoomed() ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s || zoomed()) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && n > 1) go(dx < 0 ? 1 : -1);
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
        }}
      >
        {/* The full-size image only loads once the viewer is open (not in the background on page load). */}
        {open ? (
          failed === p.src ? (
            <p className="flex size-full flex-col items-center justify-center gap-3 text-body">
              <ImageOff className="size-8 opacity-70" aria-hidden />
              Couldn&apos;t load this photo
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- same signed URL as the thumbnail, already cached
            <img
              src={p.src}
              alt={p.alt}
              className="size-full object-contain"
              style={{ touchAction: isZoomed ? "pan-x pan-y pinch-zoom" : "pinch-zoom" }}
              onError={() => {
                // An expired link: fetch fresh ones once. Never loop, never while offline.
                if (dialog.current?.open && navigator.onLine && !retried.current.has(p.src)) {
                  retried.current.add(p.src);
                  router.refresh();
                } else setFailed(p.src);
              }}
            />
          )
        ) : null}
        <button
          type="button"
          onClick={close}
          aria-label="Close photo"
          className="press absolute flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur"
          style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)", left: "max(1rem, env(safe-area-inset-left))" }}
        >
          <X className="size-6" aria-hidden />
        </button>
        {n > 1 ? (
          <>
            <p className="absolute inset-x-0 text-center text-footnote font-semibold tabular-nums" style={{ top: "calc(env(safe-area-inset-top) + 1.6rem)" }}>
              {i + 1} of {n}
            </p>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="press absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur"
              style={{ left: "max(.75rem, env(safe-area-inset-left))" }}
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="press absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur"
              style={{ right: "max(.75rem, env(safe-area-inset-right))" }}
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        ) : null}
      </dialog>
    </>
  );
}
