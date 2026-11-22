"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Home, Settings, TriangleAlert, Truck, UserRound } from "lucide-react";

const ICONS = { home: Home, assets: Truck, reports: TriangleAlert, clients: Building2, setup: Settings, me: UserRound } as const;
export type IconName = keyof typeof ICONS;

export function NavLink({ href, label, icon, variant }: { href: string; label: string; icon: IconName; variant: "bottom" | "side" }) {
  const Icon = ICONS[icon];
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "bottom"
          ? "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-sm"
          : "flex h-12 items-center gap-3 rounded-full px-4 text-base transition-colors",
        variant === "bottom" && (active ? "font-bold text-[var(--indigo)]" : "text-muted-foreground"),
        variant === "side" && (active ? "bg-white font-bold text-[var(--indigo)]" : "text-white/80 hover:bg-white/10 hover:text-white"),
      )}
    >
      {active && variant === "bottom" ? <span className="absolute top-1.5 size-1.5 rounded-full bg-[var(--tangerine)]" aria-hidden /> : null}
      <Icon className={variant === "bottom" ? "size-6" : "size-5"} aria-hidden />
      {label}
    </Link>
  );
}
