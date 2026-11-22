"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_TONE, formatReading } from "@/lib/assets/labels";
import { FlagBadge } from "./flag-badge";
import { nearest, pose, relativeAngle, targetFor, WRAP_MAX } from "./orbit-math";
import type { ShowItem } from "./showroom";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Drag-to-orbit wheel: machines sit on a ring; dragging spins it. Every frame of the drag each
 * card's angle → sin/cos → one CSS matrix() (orbit-math.ts), written straight to the DOM.
 * Release snaps the nearest machine to the front; its details show below.
 */
export function Orbit({ items }: { items: ShowItem[] }) {
  const n = items.length;
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLAnchorElement | null)[]>([]);
  const pos = useRef(0);
  const raf = useRef(0);
  const drag = useRef<{ x: number; start: number; moved: boolean; samples: { x: number; t: number }[] } | null>(null);
  const moving = useRef(false);
  const aim = useRef(0); // where the wheel is heading; quick repeated taps build on it
  const focusRef = useRef(0);
  const [focus, setFocus] = useState(0);

  const draw = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    // Wide, shallow ellipse: neighbours fan out to the sides, the back of the ring lifts up.
    const rx = Math.min(el.clientWidth * 0.42, 420);
    const ry = el.clientWidth < 600 ? 70 : 90;
    cards.current.forEach((card, i) => {
      if (!card) return;
      const p = pose(relativeAngle(i, pos.current, n), rx, ry);
      card.style.transform = p.matrix;
      card.style.zIndex = String(p.z);
      card.style.opacity = String(p.opacity);
      card.style.visibility = p.hidden ? "hidden" : "visible";
      card.style.pointerEvents = p.front > 0.45 ? "auto" : "none";
      card.tabIndex = i === focusRef.current ? 0 : -1;
    });
    focusRef.current = nearest(pos.current, n);
    // Re-rendering the details panel mid-spin makes the wheel stutter on phones: only sync once it rests.
    if (!moving.current) setFocus(focusRef.current);
  }, [n]);

  const animateTo = useCallback(
    (target: number) => {
      cancelAnimationFrame(raf.current);
      aim.current = target;
      if (reduced()) {
        pos.current = target;
        moving.current = false;
        return draw();
      }
      const from = pos.current;
      const t0 = performance.now();
      // Longer travel gets a little more time, so a flick glides instead of jumping.
      const dur = Math.min(720, 280 + 140 * Math.abs(target - from));
      moving.current = true;
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - (1 - k) ** 3; // ease-out
        pos.current = from + (target - from) * e;
        if (k >= 1) moving.current = false;
        draw();
        if (k < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [draw],
  );

  /** Arrow buttons / keys: one machine on from where the wheel is heading (not where it is mid-spin). */
  const nudge = useCallback(
    (dir: 1 | -1) => {
      let t = Math.round(aim.current) + dir;
      if (n > WRAP_MAX) t = Math.max(0, Math.min(n - 1, t));
      animateTo(t);
    },
    [animateTo, n],
  );

  const go = useCallback((i: number) => animateTo(targetFor(n > WRAP_MAX ? Math.max(0, Math.min(n - 1, i)) : ((i % n) + n) % n, pos.current, n)), [animateTo, n]);

  useLayoutEffect(() => {
    pos.current = 0;
    aim.current = 0;
    focusRef.current = 0;
    setFocus(0);
    draw();
  }, [items, draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf.current);
    };
  }, [draw]);

  const a = items[focus];
  if (!a) return null;
  const step = n <= WRAP_MAX ? (2 * Math.PI) / n : Math.PI / 5;

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4" aria-label="Showroom">
      <div className="relative isolate min-w-0">
        <div
          ref={stage}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Machines, drag to spin or use the arrow keys"
          className="orbit-stage relative mx-auto h-[23rem] w-full touch-pan-y outline-none select-none md:h-[27rem]"
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            cancelAnimationFrame(raf.current);
            moving.current = false;
            aim.current = pos.current;
            drag.current = { x: e.clientX, start: pos.current, moved: false, samples: [{ x: e.clientX, t: e.timeStamp }] };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            const el = stage.current;
            if (!d || !el) return;
            const dx = e.clientX - d.x;
            if (!d.moved && Math.abs(dx) > 6) {
              d.moved = true;
              moving.current = true;
              el.setPointerCapture(e.pointerId);
            }
            if (!d.moved) return;
            d.samples.push({ x: e.clientX, t: e.timeStamp });
            if (d.samples.length > 6) d.samples.shift();
            const rx = Math.min(el.clientWidth * 0.42, 420);
            let next = d.start - dx / rx / step;
            if (n > WRAP_MAX) next = Math.max(-0.4, Math.min(n - 0.6, next));
            pos.current = next;
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(draw);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (d?.moved && stage.current) {
              // Flick: carry the finger's speed over the last ~100 ms forward, then land on the nearest machine.
              const recent = d.samples.filter((s) => e.timeStamp - s.t < 100);
              const first = recent[0] ?? d.samples[0];
              const v = recent.length > 1 ? (e.clientX - first.x) / Math.max(16, e.timeStamp - first.t) : 0; // px per ms
              const rx = Math.min(stage.current.clientWidth * 0.42, 420);
              // Slow drags (under 0.4 px/ms) land where the finger left them; a flick adds up to two machines.
              const fling = Math.abs(v) < 0.4 ? 0 : Math.max(-2, Math.min(2, -(v * 240) / rx / step));
              let landing = Math.round(pos.current + fling);
              if (n > WRAP_MAX) landing = Math.max(0, Math.min(n - 1, landing));
              animateTo(landing);
            }
            setTimeout(() => (drag.current = null), 0);
          }}
          onPointerCancel={() => {
            drag.current = null;
            moving.current = false;
            animateTo(targetFor(nearest(pos.current, n), pos.current, n));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              nudge(1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              nudge(-1);
            }
          }}
        >
          <div className="orbit-floor" aria-hidden />
          {items.map((it, i) => (
            <Link
              key={it.id}
              ref={(el) => {
                cards.current[i] = el;
              }}
              href={`/assets/${it.id}`}
              aria-label={`${it.code} ${it.name}`}
              aria-current={i === focus ? "true" : undefined}
              draggable={false}
              onClick={(e) => {
                if (drag.current?.moved) return e.preventDefault();
                if (i !== focusRef.current) {
                  e.preventDefault();
                  go(i);
                }
              }}
              className="orbit-card surface absolute top-1/2 left-1/2 -mt-[calc(var(--card-h)/2)] -ml-[calc(var(--card-w)/2)] aspect-[3/4] w-[var(--card-w)] overflow-hidden rounded-[1.75rem]"
            >
              {it.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                <img src={it.photo} alt="" className="pointer-events-none size-full object-cover" draggable={false} />
              ) : (
                <span className="flex size-full items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                  <Truck className="size-14 text-white/80" aria-hidden />
                </span>
              )}
              {it.flag ? <FlagBadge {...it.flag} className="absolute top-3 right-3 shadow" /> : null}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-10 pb-3 text-left text-white">
                <span className="block text-xl leading-none font-bold">{it.code}</span>
                <span className="block truncate text-sm opacity-90">{it.name}</span>
              </span>
            </Link>
          ))}
        </div>
        {n > 1 ? (
          <>
            <Button type="button" variant="outline" size="icon-lg" className="absolute top-1/2 left-0 z-[1001] -translate-y-1/2 shadow" onClick={() => nudge(-1)}>
              <ChevronLeft aria-hidden />
              <span className="sr-only">Previous machine</span>
            </Button>
            <Button type="button" variant="outline" size="icon-lg" className="absolute top-1/2 right-0 z-[1001] -translate-y-1/2 shadow" onClick={() => nudge(1)}>
              <ChevronRight aria-hidden />
              <span className="sr-only">Next machine</span>
            </Button>
          </>
        ) : null}
      </div>

      <div className="showroom-detail mx-auto grid w-full max-w-md gap-3 text-center" aria-live="polite" key={a.id}>
        <p className="text-sm tabular-nums text-muted-foreground">
          {focus + 1} of {n}
        </p>
        <h2 className="text-3xl leading-tight font-bold">
          {a.code} <span className="font-normal">{a.name}</span>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-base">
          <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
          {a.flag ? <FlagBadge {...a.flag} /> : null}
          <span className="font-bold tabular-nums">{formatReading(a.current_reading, a.tracking_unit)}</span>
          <span className="text-muted-foreground">{[a.type_name, a.crew_name, a.site_name].filter(Boolean).join(" · ")}</span>
        </div>
        <Button asChild size="lg" className="mx-auto h-12 w-[min(100%,16rem)]">
          <Link href={`/assets/${a.id}`} aria-label="Open asset page">
            Open
          </Link>
        </Button>
      </div>
    </section>
  );
}
