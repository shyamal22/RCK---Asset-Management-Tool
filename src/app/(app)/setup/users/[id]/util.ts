/** yyyy-mm-dd for a date input, `days` from today in NZ. */
export function formDate(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d);
}
