import { describe, expect, it } from "vitest";
import { reorder, shuffle } from "./shuffle";
import type { ShowItem } from "./showroom";

const item = (code: string, extra: Partial<ShowItem> = {}): ShowItem => ({
  id: code, code, name: code, type_name: "Roller", status: "available", current_reading: null, tracking_unit: "hours", crew_name: null, site_name: null, ...extra,
});

describe("reorder", () => {
  const xs = [item("ROL-10", { current_reading: "50" }), item("ROL-2", { status: "unusable" }), item("PAV-1", { flag: { flag: "yellow", n: 1 }, current_reading: "900" }), item("MIL-1", { status: "in_workshop" })];
  it("A–Z sorts codes naturally (ROL-2 before ROL-10)", () => {
    expect(reorder(xs, "code").map((x) => x.code)).toEqual(["MIL-1", "PAV-1", "ROL-2", "ROL-10"]);
  });
  it("problems first: red/unusable, yellow, in workshop, rest", () => {
    expect(reorder(xs, "problems").map((x) => x.code)).toEqual(["ROL-2", "PAV-1", "MIL-1", "ROL-10"]);
  });
  it("most hours/km first; no reading last", () => {
    expect(reorder(xs, "reading").map((x) => x.code)).toEqual(["PAV-1", "ROL-10", "MIL-1", "ROL-2"]);
  });
  it("shuffle keeps every item once", () => {
    const s = shuffle([1, 2, 3, 4, 5], () => 0);
    expect(s).toEqual([2, 3, 4, 5, 1]);
    expect([...reorder(xs, "shuffle")].map((x) => x.code).sort()).toEqual(xs.map((x) => x.code).sort());
  });
});
