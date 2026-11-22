"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { FlagBadge } from "./flag-badge";
import { STATUS_LABELS, STATUS_TONE, formatReading, type AssetStatus, type TrackingUnit } from "@/lib/assets/labels";

export type ShowItem = {
  id: string;
  code: string;
  name: string;
  type_name: string;
  status: AssetStatus;
  current_reading: string | null;
  tracking_unit: TrackingUnit;
  crew_name: string | null;
  site_name: string | null;
  photo?: string;
  flag?: { flag: "yellow" | "red"; n: number };
};

/**
 * Showroom: machines in a swipeable row of tall photo bays. The one in the middle is in focus
 * (full size), its neighbours shrink and fade; details below follow the focused machine.
 */
export function Showroom({ items }: { items: ShowItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(0);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const card = c as HTMLElement;
      const center = card.offsetLeft + card.offsetWidth / 2;
      const d = Math.min(1, Math.abs(center - mid) / card.offsetWidth);
      card.style.setProperty("--d", d.toFixed(3));
      if (Math.abs(center - mid) < bestD) {
        bestD = Math.abs(center - mid);
        best = i;
      }
    });
    setFocus(best);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [update, items]);

  const go = (i: number) => {
    const el = track.current;
    const card = el?.children[Math.max(0, Math.min(items.length - 1, i))] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: "smooth" });
  };

  const a = items[focus];
  if (!a) return null;
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-5" aria-label="Showroom">
      <div className="relative min-w-0">
        <div
          ref={track}
          tabIndex={0}
          aria-label="Machines, swipe or use the arrow keys"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(focus + 1);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(focus - 1);
            }
          }}
          className="showroom -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[calc(50%-min(36vw,10.5rem))] py-4 md:px-[calc(50%-8rem)] outline-none md:-mx-10"
        >
          {items.map((it, i) => (
            <Link
              key={it.id}
              href={`/assets/${it.id}`}
              aria-label={`${it.code} ${it.name}`}
              aria-current={i === focus ? "true" : undefined}
              className="showroom-card surface relative aspect-[3/4] w-[min(72vw,21rem)] shrink-0 md:w-[16rem] snap-center overflow-hidden rounded-[2rem]"
            >
              {it.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                <img src={it.photo} alt="" className="size-full object-cover" draggable={false} />
              ) : (
                <span className="flex size-full items-center justify-center bg-muted">
                  <Truck className="size-16 text-muted-foreground" aria-hidden />
                </span>
              )}
              <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 backdrop-blur">
                <StatusDot tone={STATUS_TONE[it.status]} label={STATUS_LABELS[it.status]} />
              </span>
              {it.flag ? <FlagBadge {...it.flag} className="absolute top-3.5 right-3 shadow" /> : null}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-4 text-left text-white">
                <span className="block text-2xl leading-none font-bold">{it.code}</span>
                <span className="block truncate text-base opacity-90">{it.name}</span>
              </span>
            </Link>
          ))}
        </div>
        {items.length > 1 ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="absolute top-1/2 left-0 hidden -translate-y-1/2 shadow md:inline-flex"
              disabled={focus === 0}
              onClick={() => go(focus - 1)}
            >
              <ChevronLeft aria-hidden />
              <span className="sr-only">Previous machine</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="absolute top-1/2 right-0 hidden -translate-y-1/2 shadow md:inline-flex"
              disabled={focus === items.length - 1}
              onClick={() => go(focus + 1)}
            >
              <ChevronRight aria-hidden />
              <span className="sr-only">Next machine</span>
            </Button>
          </>
        ) : null}
      </div>

      <div className="showroom-detail mx-auto grid w-full max-w-md gap-3 text-center" aria-live="polite" key={a.id}>
        <p className="text-sm tabular-nums text-muted-foreground">
          {focus + 1} of {items.length}
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
