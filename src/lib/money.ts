/** Money is integer cents, NZD, ex GST (CLAUDE.md rule 2). */
export const GST_RATE = 0.15;

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return nzd.format(cents / 100);
}

/** "1,234.5" / "$1234.50" → 123450. Returns null for empty, throws for junk. */
export function parseDollars(input: string): number | null {
  const s = input.replace(/[$,\s]/g, "");
  if (s === "") return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error("Enter an amount like 1250 or 1250.50");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return s.startsWith("-") ? -cents : cents;
}

export function gstOn(centsExGst: number): number {
  return Math.round(centsExGst * GST_RATE);
}
