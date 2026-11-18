type Json = Record<string, unknown> | null | undefined;
const HIDDEN = new Set(["updated_at", "created_at", "id", "company_id"]);

export type Change = { field: string; from: string; to: string };

const show = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Field-level changes between before/after snapshots, for the audit viewer. */
export function diff(before: Json, after: Json): Change[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: Change[] = [];
  for (const k of keys) {
    if (HIDDEN.has(k)) continue;
    const a = show(before?.[k]);
    const b = show(after?.[k]);
    if (a !== b) out.push({ field: k.replace(/_/g, " "), from: a, to: b });
  }
  return out;
}

export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // no formula injection in Excel
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
