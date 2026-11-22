import { can, scopeFor, type Actor } from "@/lib/permissions/check";

/** Everything configurable lives behind the Setup gear (docs/10). Visibility per user type. */
export type SetupSection = { href: string; label: string };

const SECTIONS: { href: string; label: string; visible: (a: Actor) => boolean }[] = [
  { href: "/setup/company", label: "Company", visible: (a) => can(a, "settings", "edit") },
  // docs/10 lists Workshop; docs/05 lets Office edit assets too, so the permission decides (PROGRESS Q34).
  { href: "/setup/assets", label: "Assets", visible: (a) => can(a, "assets", "create") },
  { href: "/setup/yards-crews", label: "Yards and crews", visible: (a) => can(a, "settings", "edit") },
  { href: "/setup/users", label: "Users", visible: (a) => can(a, "users", "view") || can(a, "users", "view_pending") },
  { href: "/setup/signup-link", label: "Sign-up link", visible: (a) => can(a, "settings", "edit") },
  { href: "/setup/audit", label: "Audit log", visible: (a) => scopeFor(a, "audit_log", "view") === "all" },
];

export function setupSections(actor: Actor): SetupSection[] {
  return SECTIONS.filter((s) => s.visible(actor)).map(({ href, label }) => ({ href, label }));
}
