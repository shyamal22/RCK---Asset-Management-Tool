"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Home, Settings, TriangleAlert, Truck, UserRound } from "lucide-react";

const ICONS = { home: Home, assets: Truck, reports: TriangleAlert, clients: Building2, setup: Settings, me: UserRound } as const;
export type IconName = keyof typeof ICONS;

export function NavLink({ href, label, icon, variant }: { href: string; label: string; icon: IconName; variant: "bottom" | "side" }) {
  const Icon = ICONS[icon];
  const path = usePathname();
  // Editing or adding a machine lives under /setup/assets but belongs to the Assets tab.
  const section = path.startsWith("/setup/assets") ? "/assets" : path;
  const active = href === "/" ? section === "/" : section === href || section.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "bottom"
          ? "group relative flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-sm transition-colors"
          : "relative flex h-12 items-center gap-3 rounded-full px-4 text-base transition-colors active:scale-[0.98]",
        variant === "bottom" && (active ? "font-bold text-[var(--indigo)]" : "text-muted-foreground"),
        variant === "side" && (active ? "bg-white font-bold text-[var(--indigo)]" : "text-white/80 hover:bg-white/10 hover:text-white"),
      )}
    >
      <Pending variant={variant} active={active} />
      <Icon className={variant === "bottom" ? "size-6 transition-transform group-active:scale-90" : "size-5"} aria-hidden />
      {label}
    </Link>
  );
}

/** Tangerine dot over the current tab; while the tapped tab loads it pulses there straight away. */
function Pending({ variant, active }: { variant: "bottom" | "side"; active: boolean }) {
  const { pending } = useLinkStatus();
  if (variant === "side")
    return pending ? <span className="absolute right-4 size-2 animate-pulse rounded-full bg-[var(--tangerine)]" aria-hidden /> : null;
  if (!active && !pending) return null;
  return <span className={cn("absolute top-1.5 size-1.5 rounded-full bg-[var(--tangerine)]", pending && "animate-ping")} aria-hidden />;
}
