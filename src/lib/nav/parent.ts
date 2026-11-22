/** Where "‹ Back" goes when there's no in-app history to return to (e.g. the app was just opened on this screen). */
export const TAB_ROOTS = ["/", "/assets", "/reports", "/kre", "/setup", "/me"] as const;

const START_STEPS = ["company", "yards", "link"] as const;

export function isTabRoot(path: string): boolean {
  return (TAB_ROOTS as readonly string[]).includes(path);
}

/** Parent screen for a path, or null on a tab root (and on the first step of first-run setup). */
export function parentOf(path: string, search: string, hasSetup: boolean): string | null {
  if (isTabRoot(path)) return null;
  const parts = path.split("/").filter(Boolean);

  if (path === "/setup/start") {
    const step = new URLSearchParams(search).get("step");
    const i = Math.max(0, START_STEPS.indexOf(step as (typeof START_STEPS)[number]));
    if (i > 0) return `/setup/start?step=${START_STEPS[i - 1]}`;
    return hasSetup ? "/setup" : null;
  }
  if (path === "/setup/assets/new") return "/assets";
  if (parts[0] === "setup" && parts[1] === "assets" && parts.length === 3) return `/assets/${parts[2]}`;
  if (parts[0] === "setup" && parts[1] === "users" && parts.length === 3) return "/setup/users";
  if (parts[0] === "setup") return hasSetup ? "/setup" : "/";
  return "/" + parts.slice(0, -1).join("/");
}
