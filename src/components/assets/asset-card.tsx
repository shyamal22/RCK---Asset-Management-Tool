import Link from "next/link";
import { Truck } from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { STATUS_LABELS, STATUS_TONE, formatReading } from "@/lib/assets/labels";
import type { AssetRow } from "@/lib/assets/queries";
import { FlagBadge } from "./flag-badge";

/** Phone-first asset card: photo, code + name, status colour (docs/10). */
export function AssetCard({ a, photo, href, flag }: { a: AssetRow; photo?: string; href?: string; flag?: { flag: "yellow" | "red"; n: number } }) {
  return (
    <Link
      href={href ?? `/assets/${a.id}`}
      className="press surface flex min-h-20 items-center gap-3 p-2 pr-4"
      aria-label={`${a.code} ${a.name}`}
    >
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <Truck className="size-7 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-body font-bold">
          {a.code} <span className="font-normal">{a.name}</span>
        </span>
        <span className="truncate text-footnote text-muted-foreground">
          {a.type_name} · {formatReading(a.current_reading, a.tracking_unit)}
          {a.crew_name ? ` · ${a.crew_name}` : ""}
        </span>
      </div>
      <span className="grid shrink-0 justify-items-end gap-1">
        <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
        {flag ? <FlagBadge {...flag} /> : null}
      </span>
    </Link>
  );
}
