/** Dates are stored UTC and shown in Pacific/Auckland, dd/mm/yyyy (CLAUDE.md rule 5). */
export const NZ_TZ = "Pacific/Auckland";

const dateFmt = new Intl.DateTimeFormat("en-NZ", { timeZone: NZ_TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-NZ", { timeZone: NZ_TZ, hour: "numeric", minute: "2-digit", hour12: true });

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  return `${dateFmt.format(x)} ${timeFmt.format(x).replace(/\s/g, "").toLowerCase()}`;
}
