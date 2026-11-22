import Link from "next/link";
import { Truck } from "lucide-react";
import { BayRail } from "./bay-rail";

export type RailItem = { key: string; label: string; n: number; href: string; active: boolean; photo: string | null };

const GAP = 96; // px between items along the curve
const H = 200;

/** Point on the quadratic curve P0 → P2 bowed down through P1, at t ∈ [0,1]. */
function at(t: number, w: number) {
  const p0 = { x: 48, y: 46 };
  const p1 = { x: w / 2, y: 250 };
  const p2 = { x: w - 48, y: 46 };
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

/**
 * Curved SVG rail (no canvas): machine types sit along a bowed line. Hovering one scales and
 * spotlights it while the rest dim (CSS in globals.css); the selected one stays lit.
 */
export function TypeRail({ items }: { items: RailItem[] }) {
  const w = Math.max(360, items.length * GAP + 96);
  const pts = items.map((_, i) => at(items.length === 1 ? 0.5 : (i + 0.5) / items.length, w));
  const d = `M 48 46 Q ${w / 2} 250 ${w - 48} 46`;
  return (
    <BayRail label="Asset types" className="type-rail bay-rail -mx-5 overflow-x-auto px-5 md:-mx-10 md:px-10">
      <div className="relative mx-auto" style={{ width: w, height: H }}>
        <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="absolute inset-0" aria-hidden>
          <defs>
            <linearGradient id="rail-grad" x1="0" x2="1">
              <stop offset="0" stopColor="var(--indigo)" stopOpacity="0.05" />
              <stop offset="0.5" stopColor="var(--indigo)" stopOpacity="0.45" />
              <stop offset="1" stopColor="var(--indigo)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={d} fill="none" stroke="url(#rail-grad)" strokeWidth="3" strokeLinecap="round" />
          <path d={d} fill="none" stroke="var(--indigo)" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 10" transform="translate(0 14)" />
        </svg>
        {items.map((it, i) => (
          <Link
            key={it.key}
            href={it.href}
            aria-current={it.active ? "true" : undefined}
            aria-label={`${it.label}, ${it.n}`}
            className="rail-item absolute flex w-[5.5rem] flex-col items-center gap-1.5 text-center"
            style={{ left: pts[i].x, top: pts[i].y }}
          >
            <span className="rail-photo relative block size-16 overflow-hidden rounded-full border-[3px] border-white bg-muted shadow-[0_10px_22px_-12px_var(--indigo)]">
              {it.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                <img src={it.photo} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                  <Truck className="size-6 text-white/85" aria-hidden />
                </span>
              )}
            </span>
            <span className="text-xs leading-tight font-bold">{it.label}</span>
            <span className="-mt-1 text-[0.7rem] text-muted-foreground tabular-nums">{it.n}</span>
          </Link>
        ))}
      </div>
    </BayRail>
  );
}
