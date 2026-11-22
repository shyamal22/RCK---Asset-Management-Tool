"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Photo = { src: string; alt: string };

/**
 * Photo grid that opens a full-screen viewer inside the app. Never links to the photo's own address:
 * on an installed iPhone app that would leave the app (Safari sheet showing a supabase.co URL).
 * Swipe or use the arrows to move between photos; pinch to zoom; X, Esc or swipe-down closes.
 */
export function PhotoViewer({ photos, label = "Photos" }: { photos: Photo[]; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();
  if (!photos.length) return null;
  const n = photos.length;
  const go = (d: number) => setIndex((i) => (i + d + n) % n);
  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const p = photos[index];

  return (
    <>
      <ul aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((ph, i) => (
          <li key={ph.src}>
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={`View ${ph.alt.toLowerCase()}`}
              className="press surface block aspect-square w-full overflow-hidden p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img
                src={ph.src}
                alt={ph.alt}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={p.alt}
        className="photo-viewer m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && n > 1) go(dx < 0 ? 1 : -1);
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- same signed URL as the thumbnail, already cached */}
        <img
          src={p.src}
          alt={p.alt}
          className="size-full object-contain"
          style={{ touchAction: "pinch-zoom" }}
          onError={() => router.refresh()}
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close photo"
          className="press absolute left-4 flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur"
          style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          <X className="size-6" aria-hidden />
        </button>
        {n > 1 ? (
          <>
            <p
              className="absolute inset-x-0 text-center text-sm font-semibold tabular-nums"
              style={{ top: "calc(env(safe-area-inset-top) + 1.6rem)" }}
            >
              {index + 1} of {n}
            </p>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="press absolute top-1/2 left-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="press absolute top-1/2 right-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        ) : null}
      </dialog>
    </>
  );
}
