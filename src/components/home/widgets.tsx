import Link from "next/link";
import { ChevronRight, Truck, Wrench, TriangleAlert, CircleCheck, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/status-dot";
import { FlagBadge } from "@/components/assets/flag-badge";
import { STATUS_LABELS, STATUS_TONE, formatReading, type AssetStatus } from "@/lib/assets/labels";
import { SEVERITY, ago } from "@/lib/breakdowns/labels";
import type { ReportRow } from "@/lib/breakdowns/queries";
import type { AttentionRow, FleetSummary, ReadingAlert, TypeRow } from "@/lib/home/queries";
import type { AssetRow } from "@/lib/assets/queries";

/** Today's date in NZ: the only thing above the dashboard (Sam, 22/11/2026: no greeting, no summary line). */
export function Greeting() {
  const today = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <header>
      <h1 className="text-2xl font-bold md:text-3xl">
        <span className="sr-only">Home, </span>
        {today}
      </h1>
    </header>
  );
}

/** Section card with a heading and an optional "See all" link. Region name = title (tests, screen readers). */
export function Panel({ title, href, children, className }: { title: string; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("surface grid content-start gap-3 p-4 md:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-semibold text-[var(--indigo)]">
            See all <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const TILES = [
  { key: "allWorking", label: "All working", icon: CircleCheck, tone: "green", href: "/assets?type=all" },
  { key: "damaged", label: "Damaged", icon: Wrench, tone: "yellow", href: "/reports" },
  { key: "unusableAny", label: "Unusable", icon: TriangleAlert, tone: "red", href: "/assets?status=unusable" },
] as const;

/**
 * Headline numbers: three tiles washed in their status colour (green / yellow / red), each with an
 * icon and a label so colour is never the only signal. No machine is counted twice: All working = working with
 * no open report; Damaged = open report but still usable; Unusable = status unusable or a red report.
 */
export function FleetTiles({ s }: { s: FleetSummary }) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3" role="list" aria-label="Fleet at a glance">
      {TILES.map((t) => (
        <Link key={t.key} role="listitem" href={t.href} data-tone={t.tone} className="press status-tile grid gap-2 rounded-[1.25rem] border p-3 md:p-4">
          <span className="flex items-center gap-1.5 text-sm font-semibold md:gap-2">
            <span className="status-tile-icon flex size-6 shrink-0 items-center justify-center rounded-full text-white">
              <t.icon className="size-3.5" aria-hidden />
            </span>
            <span className="leading-tight">{t.label}</span>
          </span>
          <span className="text-4xl leading-none font-bold tabular-nums">{s[t.key]}</span>
        </Link>
      ))}
    </div>
  );
}

/** Horizontal strip of machines that need a look (photo cards, scroll sideways). */
export function AttentionStrip({ rows, photos, empty = "Nothing needs attention." }: { rows: AttentionRow[]; photos: Record<string, string>; empty?: string }) {
  if (!rows.length)
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <CircleCheck className="size-5 text-status-green" aria-hidden /> {empty}
      </p>
    );
  return (
    <ul className="bay-rail -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:-mx-5 md:px-5">
      {rows.map((a) => (
        <li key={a.id} className="w-40 shrink-0 snap-start">
          <Link href={`/assets/${a.id}`} aria-label={`${a.code} ${a.name}`} className="press block overflow-hidden rounded-2xl border border-border bg-card hover:-translate-y-0.5">
            <span className="relative block aspect-[4/3] bg-muted">
              {a.photo_path && photos[a.photo_path] ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL
                <img src={photos[a.photo_path]} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                  <Truck className="size-7 text-white/80" aria-hidden />
                </span>
              )}
              {a.flag ? <FlagBadge flag={a.flag} n={a.open_reports} className="absolute top-2 left-2 shadow" /> : null}
            </span>
            <span className="grid gap-0.5 p-2.5">
              <span className="truncate text-sm font-bold">
                {a.code} <span className="font-normal">{a.name}</span>
              </span>
              <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Crew / Supervisor: their machines as a sideways strip with reading + status. */
export function MachineStrip({ items, photos }: { items: AssetRow[]; photos: Record<string, string> }) {
  if (!items.length) return <p className="text-muted-foreground">No machines assigned to your crew yet.</p>;
  return (
    <ul className="bay-rail -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:-mx-5 md:px-5">
      {items.map((a) => (
        <li key={a.id} className="w-36 shrink-0 snap-start">
          <Link href={`/assets/${a.id}`} aria-label={`${a.code} ${a.name}`} className="press block overflow-hidden rounded-2xl border border-border bg-card">
            <span className="relative block aspect-square bg-muted">
              {a.photo_path && photos[a.photo_path] ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL
                <img src={photos[a.photo_path]} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                  <Truck className="size-7 text-white/80" aria-hidden />
                </span>
              )}
            </span>
            <span className="grid gap-0.5 p-2.5">
              <span className="truncate text-sm font-bold">{a.code}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{formatReading(a.current_reading, a.tracking_unit)}</span>
              <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Latest open damage reports, red first. */
export function ReportFeed({ reports, photos, empty = "No open damage reports." }: { reports: ReportRow[]; photos: Record<string, string>; empty?: string }) {
  if (!reports.length)
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <CircleCheck className="size-5 text-status-green" aria-hidden /> {empty}
      </p>
    );
  return (
    <ul className="grid gap-1">
      {reports.map((r) => {
        const thumb = photos[r.photo_paths[0] ?? ""];
        return (
          <li key={r.id}>
            <Link href={`/reports/${r.id}`} className="press flex items-center gap-3 rounded-xl p-1.5 hover:bg-accent" aria-label={`${r.code} ${r.title}`}>
              <span className={cn("size-12 shrink-0 overflow-hidden rounded-lg border-l-4 bg-muted", r.severity === "unusable" ? "border-status-red" : "border-status-yellow")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                {thumb ? <img src={thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : null}
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-bold">
                  {r.code} <span className="font-normal">{r.title}</span>
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {r.raised_by_name ?? "Someone"} · {ago(r.created_at)}
                </span>
              </span>
              <StatusDot tone={SEVERITY[r.severity].tone} label={SEVERITY[r.severity].label} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Readings lower than the last one (likely a typo or a new meter). */
export function ReadingAlerts({ rows }: { rows: ReadingAlert[] }) {
  if (!rows.length)
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <CircleCheck className="size-5 text-status-green" aria-hidden /> All readings look right.
      </p>
    );
  return (
    <ul className="grid gap-1">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/assets/${r.asset_id}`} className="press flex items-center gap-3 rounded-xl p-1.5 hover:bg-accent">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-[var(--indigo)]">
              <Gauge className="size-5" aria-hidden />
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-bold">
                {r.code} <span className="font-normal">{r.name}</span>
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {formatReading(r.reading, r.unit)} is lower than before · {r.entered_by ?? "someone"} · {ago(r.read_at)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const BAR: { key: AssetStatus[]; label: string; cls: string }[] = [
  { key: ["available", "in_use"], label: "Working", cls: "bg-status-green" },
  { key: ["in_workshop", "at_subcontractor"], label: "In workshop", cls: "bg-status-yellow" },
  { key: ["unusable"], label: "Unusable", cls: "bg-status-red" },
  { key: ["parked", "disposed"], label: "Parked", cls: "bg-[#9a98ab]" },
];

/**
 * Fleet status by machine type: one 100% bar per type, status segments with 2px gaps and
 * rounded ends; legend with totals (status is never colour alone); hover title per segment;
 * table for screen readers.
 */
export function FleetByType({ rows }: { rows: TypeRow[] }) {
  const types = [...new Set(rows.map((r) => r.type_name))];
  if (!types.length) return <p className="text-muted-foreground">No machines yet.</p>;
  const count = (t: string, keys: AssetStatus[]) => rows.filter((r) => r.type_name === t && keys.includes(r.status)).reduce((n, r) => n + Number(r.n), 0);
  const totals = BAR.map((b) => types.reduce((n, t) => n + count(t, b.key), 0));
  return (
    <div className="grid gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legend">
        {BAR.map((b, i) => (
          <li key={b.label} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", b.cls)} aria-hidden />
            {b.label} <span className="font-bold tabular-nums">{totals[i]}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-2.5" aria-hidden>
        {types.map((t) => {
          const total = BAR.reduce((n, b) => n + count(t, b.key), 0);
          return (
            <div key={t} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
              <span className="truncate text-muted-foreground">{t}</span>
              <span className="flex h-3.5 gap-0.5">
                {BAR.map((b) => {
                  const n = count(t, b.key);
                  return n ? (
                    <span key={b.label} title={`${t}: ${n} ${b.label.toLowerCase()}`} className={cn("h-full rounded-[4px] transition-opacity hover:opacity-80", b.cls)} style={{ flexGrow: n }} />
                  ) : null;
                })}
              </span>
              <span className="text-right font-bold tabular-nums">{total}</span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Machines by type and status</caption>
        <thead>
          <tr>
            <th>Type</th>
            {BAR.map((b) => (
              <th key={b.label}>{b.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t}>
              <th>{t}</th>
              {BAR.map((b) => (
                <td key={b.label}>{count(t, b.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
