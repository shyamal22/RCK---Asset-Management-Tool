"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Home, Settings, UserRound } from "lucide-react";

const ICONS = { home: Home, clients: Building2, setup: Settings, me: UserRound } as const;
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
          ? "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-sm"
          : "flex h-12 items-center gap-3 rounded-md px-3 text-base",
        active ? "font-bold text-steel" : "text-ink",
        variant === "side" && active && "bg-accent",
      )}
    >
      <Icon className={variant === "bottom" ? "size-7" : "size-5"} aria-hidden />
      {label}
    </Link>
  );
}
