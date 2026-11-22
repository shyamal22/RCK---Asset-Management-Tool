import { can, scopeFor, type Actor } from "@/lib/permissions/check";

/**
 * Everything configurable lives behind the Setup gear (docs/10). Sam (22/11/2026): only the Director
 * sees Setup. Others reach the few setup screens they need from their own pages (Add/Edit asset from
 * Assets, approving sign-ups from the home count); each page still checks its own permission.
 */
export type SetupSection = { href: string; label: string };

const SECTIONS: { href: string; label: string; visible: (a: Actor) => boolean }[] = [
  { href: "/setup/company", label: "Company", visible: (a) => can(a, "settings", "edit") },
  { href: "/setup/assets", label: "Assets", visible: (a) => can(a, "assets", "create") },
  { href: "/setup/yards-crews", label: "Yards and crews", visible: (a) => can(a, "settings", "edit") },
  { href: "/setup/users", label: "Users", visible: (a) => can(a, "users", "view") || can(a, "users", "view_pending") },
  { href: "/setup/signup-link", label: "Sign-up link", visible: (a) => can(a, "settings", "edit") },
  { href: "/setup/audit", label: "Audit log", visible: (a) => scopeFor(a, "audit_log", "view") === "all" },
];

export function setupSections(actor: Actor): SetupSection[] {
  if (actor.userType !== "director") return [];
  return SECTIONS.filter((s) => s.visible(actor)).map(({ href, label }) => ({ href, label }));
}
