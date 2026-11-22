import type { ActiveUser } from "@/lib/auth/session";
import { setupSections } from "@/lib/nav/setup";
import { can } from "@/lib/permissions/check";
import { NavLink, type IconName } from "./nav-link";
import { DoneButton } from "./done-button";
import { StatusBarBackdrop } from "./status-bar";
import { SideFrame } from "./side-frame";
import { PhoneHeader } from "./phone-header";
import { BackButton, ScreenTracker } from "./back-bar";

type Item = { href: string; label: string; icon: IconName };

export function navItems(me: ActiveUser): Item[] {
  const items: Item[] = [{ href: "/", label: "Home", icon: "home" }];
  if (can(me.actor, "assets", "view")) items.push({ href: "/assets", label: "Assets", icon: "assets" });
  if (can(me.actor, "prechecks", "view")) items.push({ href: "/prechecks", label: "Checks", icon: "checks" });
  if (can(me.actor, "defects", "view")) items.push({ href: "/reports", label: "Reports", icon: "reports" });
  if (me.isPlatformAdmin) items.push({ href: "/kre", label: "Clients", icon: "clients" });
  if (setupSections(me.actor).length) items.push({ href: "/setup", label: "Setup", icon: "setup" });
  items.push({ href: "/me", label: "Me", icon: "me" });
  return items;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "Me";
}

/** Phone tab header (Konsta/iOS large-title feel): just the company, one line, so the screen starts high. */
function PhoneBrand({ me }: { me: ActiveUser }) {
  return (
    <p className="flex min-w-0 items-center gap-2.5 text-title2 leading-tight font-bold text-white">
      <span className="size-2.5 shrink-0 rounded-full bg-[var(--tangerine)] shadow-[0_0_10px_var(--tangerine)]" aria-hidden />
      <span className="truncate">{me.companyName || "KRE Asset Management"}</span>
    </p>
  );
}

function Brand({ me }: { me: ActiveUser }) {
  return (
    // Signed in: just the company (CLAUDE.md); KRE branding is for sign-in screens and emails.
    <p className="flex min-w-0 items-center gap-2.5 text-title3 font-bold text-white">
      <span className="size-2.5 shrink-0 rounded-full bg-[var(--tangerine)] shadow-[0_0_10px_var(--tangerine)]" aria-hidden />
      <span className="truncate">{me.companyName || "KRE Asset Management"}</span>
    </p>
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
  const hasSetup = items.some((i) => i.href === "/setup");
  return (
    <SideFrame
      initialCollapsed={sideCollapsed}
      aside={
        <>
          <Brand me={me} />
          <nav aria-label="Main" data-press-instant className="grid gap-1">
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
        <PhoneHeader brand={<PhoneBrand me={me} />} initials={initials(me.name)} companyName={me.companyName || "KRE Asset Management"} done={shared ? <DoneButton /> : null} hasSetup={hasSetup} />
        <ScreenTracker />
        <main className="min-w-0 flex-1 overflow-x-clip rounded-t-[2rem] bg-[var(--paper)] px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:rounded-[2rem] md:px-10 md:pt-10 md:pb-10 md:group-data-[collapsed=true]/side:pt-16">
          <div className="-mt-3 mb-3 hidden md:block md:empty:hidden">
            <BackButton hasSetup={hasSetup} className="-ml-2 text-[var(--indigo)]" />
          </div>
          {children}
        </main>
        <nav
          aria-label="Main"
          data-press-instant
          className="nav-pill fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 flex h-[4.25rem] rounded-full px-1.5 md:hidden"
        >
          {items.filter((i) => i.href !== "/me").map((i) => (
            <NavLink key={i.href} {...i} variant="bottom" />
          ))}
        </nav>
      </div>
    </SideFrame>
  );
}
