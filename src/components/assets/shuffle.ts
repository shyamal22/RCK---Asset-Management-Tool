import type { ShowItem } from "./showroom";

export type SortKey = "shuffle" | "problems" | "code" | "reading";

/** Fisher–Yates. `rand` is injectable for tests. */
export function shuffle<T>(xs: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Red flags / Unusable first, then yellow, then in workshop / at subcontractor, then the rest. */
export function problemRank(a: Pick<ShowItem, "status" | "flag">): number {
  if (a.flag?.flag === "red" || a.status === "unusable") return 0;
  if (a.flag?.flag === "yellow") return 1;
  if (a.status === "in_workshop" || a.status === "at_subcontractor") return 2;
  return 3;
}

const byCode = (a: ShowItem, b: ShowItem) => a.code.localeCompare(b.code, "en-NZ", { numeric: true });

/** The reshuffle function: returns the new order, no animation involved. */
export function reorder(items: readonly ShowItem[], key: SortKey, rand?: () => number): ShowItem[] {
  switch (key) {
    case "shuffle":
      return shuffle(items, rand);
    case "problems":
      return [...items].sort((a, b) => problemRank(a) - problemRank(b) || byCode(a, b));
    case "reading":
      return [...items].sort((a, b) => Number(b.current_reading ?? -1) - Number(a.current_reading ?? -1) || byCode(a, b));
    default:
      return [...items].sort(byCode);
  }
}
