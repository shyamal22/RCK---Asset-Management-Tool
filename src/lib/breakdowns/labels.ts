export type Severity = "usable" | "unusable";
export type ReportStatus = "open" | "dismissed" | "fixed";
export type Flag = "yellow" | "red";

export const SEVERITY: Record<Severity, { label: string; tone: Flag }> = {
  usable: { label: "Still usable", tone: "yellow" },
  unusable: { label: "Unusable", tone: "red" },
};

export const REPORT_STATUS: Record<ReportStatus, string> = { open: "Open", dismissed: "Dismissed", fixed: "Fixed" };

/** "Just now", "3 hours ago", "2 days ago" (NZ English). */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Postgres text[] literal for a parameter. */
export const pgTextArray = (xs: string[]) => `{${xs.map((x) => `"${x.replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
