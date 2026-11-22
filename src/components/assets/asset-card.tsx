import Link from "next/link";
import { Truck } from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { STATUS_LABELS, STATUS_TONE, formatReading } from "@/lib/assets/labels";
import type { AssetRow } from "@/lib/assets/queries";

/** Phone-first asset card: photo, code + name, status colour (docs/10). */
export function AssetCard({ a, photo }: { a: AssetRow; photo?: string }) {
  return (
    <Link
      href={`/assets/${a.id}`}
      className="flex min-h-20 items-center gap-3 surface p-2 pr-4 hover:bg-accent"
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
        <span className="truncate text-lg font-bold">
          {a.code} <span className="font-normal">{a.name}</span>
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {a.type_name} · {formatReading(a.current_reading, a.tracking_unit)}
          {a.crew_name ? ` · ${a.crew_name}` : ""}
        </span>
      </div>
      <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
    </Link>
  );
}
