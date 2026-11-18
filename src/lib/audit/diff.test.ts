import { describe, expect, it } from "vitest";
import { diff, toCsv } from "./diff";

describe("audit diff", () => {
  it("lists changed fields only, hiding noise", () => {
    expect(diff({ name: "A", updated_at: "1", crew_id: null }, { name: "B", updated_at: "2", crew_id: "x" })).toEqual([
      { field: "name", from: "A", to: "B" },
      { field: "crew id", from: "", to: "x" },
    ]);
  });
  it("handles create (no before)", () => {
    expect(diff(null, { name: "Westgate" })).toEqual([{ field: "name", from: "", to: "Westgate" }]);
  });
});

describe("toCsv", () => {
  it("quotes commas/quotes and neutralises spreadsheet formulas", () => {
    expect(toCsv([["a,b", 'say "hi"', "=SUM(A1)", null, 3]])).toBe(`"a,b","say ""hi""",'=SUM(A1),,3`);
  });
});
