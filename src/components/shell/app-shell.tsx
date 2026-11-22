import type { ActiveUser } from "@/lib/auth/session";
import { setupSections } from "@/lib/nav/setup";
import { NavLink, type IconName } from "./nav-link";
import { DoneButton } from "./done-button";

type Item = { href: string; label: string; icon: IconName };

export function navItems(me: ActiveUser): Item[] {
  const items: Item[] = [{ href: "/", label: "Home", icon: "home" }];
  if (me.isPlatformAdmin) items.push({ href: "/kre", label: "Clients", icon: "clients" });
  if (setupSections(me.actor).length) items.push({ href: "/setup", label: "Setup", icon: "setup" });
  items.push({ href: "/me", label: "Me", icon: "me" });
  return items;
}

/** Phone: bottom nav. Desktop: side nav. Same items. */
export function AppShell({ me, shared, children }: { me: ActiveUser; shared: boolean; children: React.ReactNode }) {
  const items = navItems(me);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="hidden border-r bg-card md:flex md:flex-col md:gap-1 md:p-3">
        <div className="mb-4 px-3 pt-2">
          <div className="text-lg font-bold leading-tight">{me.companyName || "KRE Asset Management"}</div>
          <div className="text-sm text-muted-foreground">{me.name}</div>
        </div>
        <nav aria-label="Main" className="grid gap-1">
          {items.map((i) => (
            <NavLink key={i.href} {...i} variant="side" />
          ))}
        </nav>
        {shared ? <DoneButton className="mt-auto" /> : null}
      </aside>
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <span className="font-bold">{me.companyName || "KRE Asset Management"}</span>
          {shared ? <DoneButton /> : null}
        </header>
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {items.map((i) => (
            <NavLink key={i.href} {...i} variant="bottom" />
          ))}
        </nav>
      </div>
    </div>
  );
}
