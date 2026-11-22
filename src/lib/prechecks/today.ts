/** True when a pre-check time falls on today's date in New Zealand. */
export function checkedToday(at: string | Date | null | undefined, now = new Date()): boolean {
  if (!at) return false;
  const nz = (d: Date) => new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return nz(new Date(at)) === nz(now);
}
