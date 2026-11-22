import type { ActiveUser } from "@/lib/auth/session";
import { setupSections } from "@/lib/nav/setup";
import { can } from "@/lib/permissions/check";
import { NavLink, type IconName } from "./nav-link";
import { DoneButton } from "./done-button";
import { StatusBarBackdrop } from "./status-bar";
import { SideFrame } from "./side-frame";

type Item = { href: string; label: string; icon: IconName };

export function navItems(me: ActiveUser): Item[] {
  const items: Item[] = [{ href: "/", label: "Home", icon: "home" }];
  if (can(me.actor, "assets", "view")) items.push({ href: "/assets", label: "Assets", icon: "assets" });
  if (can(me.actor, "defects", "view")) items.push({ href: "/reports", label: "Reports", icon: "reports" });
  if (me.isPlatformAdmin) items.push({ href: "/kre", label: "Clients", icon: "clients" });
  if (setupSections(me.actor).length) items.push({ href: "/setup", label: "Setup", icon: "setup" });
  items.push({ href: "/me", label: "Me", icon: "me" });
  return items;
}

function Brand({ me }: { me: ActiveUser }) {
  return (
    <div className="grid gap-0.5">
      <p className="flex items-center gap-2 text-sm text-white/75">
        <span className="size-2 rounded-full bg-[var(--tangerine)]" aria-hidden />
        <span className="font-bold tracking-wide text-white">KRE</span> Asset Management Tool
      </p>
      <p className="text-xl leading-tight font-bold text-white">{me.companyName || "KRE Asset Management"}</p>
      <p className="text-sm text-white/70">{me.name}</p>
    </div>
  );
}

/**
 * Same family as the sign-in screens: onyx → indigo gradient behind everything.
 * Phone: header on the gradient, content on a white sheet with big rounded top corners, white bottom nav.
 * Desktop: nav on the gradient, content in a rounded white panel.
 */
export function AppShell({
  me,
  shared,
  sideCollapsed = false,
  children,
}: {
  me: ActiveUser;
  shared: boolean;
  sideCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const items = navItems(me);
  return (
    <SideFrame
      initialCollapsed={sideCollapsed}
      aside={
        <>
          <Brand me={me} />
          <nav aria-label="Main" className="grid gap-1">
            {items.map((i) => (
              <NavLink key={i.href} {...i} variant="side" />
            ))}
          </nav>
          {shared ? <DoneButton className="mt-auto" /> : null}
        </>
      }
    >
      <StatusBarBackdrop />
      <div className="flex min-h-dvh min-w-0 flex-col md:p-3 md:pl-0 md:group-data-[collapsed=true]/side:pl-3">
        <header className="flex items-end justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-8 md:hidden">
          <Brand me={me} />
          {shared ? <DoneButton /> : null}
        </header>
        <main className="flex-1 rounded-t-[2.5rem] bg-background px-5 pt-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:rounded-[2rem] md:px-10 md:pt-10 md:pb-10 md:group-data-[collapsed=true]/side:pt-16">
          {children}
        </main>
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-20px_rgba(11,11,16,.35)] md:hidden"
        >
          {items.map((i) => (
            <NavLink key={i.href} {...i} variant="bottom" />
          ))}
        </nav>
      </div>
    </SideFrame>
  );
}
