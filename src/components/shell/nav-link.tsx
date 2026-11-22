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
  const section = path.startsWith("/setup/assets/") ? "/assets" : path;
  const active = href === "/" ? section === "/" : section === href || section.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "bottom"
          ? "group relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-sm transition-colors"
          : "press relative flex h-12 items-center gap-3 rounded-full px-4 text-base",
        variant === "bottom" && (active ? "font-bold text-[var(--indigo)]" : "text-muted-foreground"),
        variant === "side" && (active ? "bg-white font-bold text-[var(--indigo)]" : "text-white/80 hover:bg-white/10 hover:text-white"),
      )}
    >
      {variant === "bottom" ? (
        <BottomIcon Icon={Icon} active={active} />
      ) : (
        <>
          <Pending />
          <Icon className="size-5" aria-hidden />
        </>
      )}
      {label}
    </Link>
  );
}

/**
 * Bottom tab icon on a soft indigo pill (the current tab). The tapped tab lights up straight away,
 * before its screen has loaded, and its tangerine dot pulses until it arrives. Sinks when pressed.
 */
function BottomIcon({ Icon, active }: { Icon: (typeof ICONS)[IconName]; active: boolean }) {
  const { pending } = useLinkStatus();
  const lit = active || pending;
  return (
    <span
      className={cn(
        "relative flex h-8 w-16 items-center justify-center rounded-full transition-[background-color,box-shadow,scale] duration-[240ms] ease-[cubic-bezier(.23,1,.32,1)] group-data-[pressed]:scale-[0.86] group-data-[pressed]:bg-[color-mix(in_srgb,var(--indigo)_20%,transparent)] group-data-[pressed]:duration-[60ms]",
        lit && "bg-[color-mix(in_srgb,var(--indigo)_13%,transparent)] text-[var(--indigo)] shadow-[inset_0_1px_3px_rgb(11_11_16/.10)]",
      )}
    >
      <Icon className="size-6" aria-hidden />
      {lit ? <span className={cn("absolute -top-0.5 right-3.5 size-1.5 rounded-full bg-[var(--tangerine)]", pending && "animate-ping")} aria-hidden /> : null}
    </span>
  );
}

/** Side menu: a tangerine dot pulses on the tapped item while its screen loads. */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="absolute right-4 size-2 animate-pulse rounded-full bg-[var(--tangerine)]" aria-hidden /> : null;
}
