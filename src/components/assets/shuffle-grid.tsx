"use client";
import Link from "next/link";
import { useState } from "react";
import { Shuffle, Truck } from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { STATUS_LABELS, STATUS_TONE, formatReading } from "@/lib/assets/labels";
import { Toggle } from "@/components/ui/toggle";
import { FlagBadge } from "./flag-badge";
import { reorder, type SortKey } from "./shuffle";
import type { ShowItem } from "./showroom";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "problems", label: "Problems first" },
  { key: "code", label: "A–Z" },
  { key: "reading", label: "Most hours / km" },
  { key: "shuffle", label: "Shuffle" },
];

/** Shuffle grid: a button click re-sorts the array; the grid simply renders the new order. */
export function ShuffleGrid({ items }: { items: ShowItem[] }) {
  const [sort, setSort] = useState<SortKey>("code");
  const [order, setOrder] = useState(() => reorder(items, "code"));
  return (
    <section className="grid gap-4" aria-label="Machines">
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Sort machines">
        {SORTS.map((s) => (
          <Toggle
            key={s.key}
            variant="outline"
            pressed={sort === s.key}
            onPressedChange={() => {
              setSort(s.key);
              setOrder(reorder(items, s.key));
            }}
            className="h-11 rounded-full px-4 text-sm font-semibold data-[state=on]:border-[var(--onyx)] data-[state=on]:bg-[var(--onyx)] data-[state=on]:text-white"
          >
            {s.key === "shuffle" ? <Shuffle aria-hidden /> : null}
            {s.label}
          </Toggle>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {order.map((a) => (
          <li key={a.id}>
            <Link href={`/assets/${a.id}`} aria-label={`${a.code} ${a.name}`} className="press surface group block overflow-hidden hover:shadow-lg">
              <span className="relative block aspect-[4/3] bg-muted">
                {a.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                  <img src={a.photo} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                    <Truck className="size-8 text-white/80" aria-hidden />
                  </span>
                )}
                {a.flag ? <FlagBadge {...a.flag} className="absolute top-2 right-2 shadow" /> : null}
              </span>
              <span className="grid gap-0.5 p-3">
                <span className="truncate font-bold">
                  {a.code} <span className="font-normal">{a.name}</span>
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatReading(a.current_reading, a.tracking_unit)}</span>
                <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
