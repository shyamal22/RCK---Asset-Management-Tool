import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./dates";

describe("NZ dates", () => {
  it("formats UTC as Auckland dd/mm/yyyy", () => {
    // 18 Nov 22:30 UTC = 19 Nov 11:30am NZDT
    expect(formatDate("2026-11-18T22:30:00Z")).toBe("19/11/2026");
    expect(formatDateTime("2026-11-18T22:30:00Z")).toBe("19/11/2026 11:30am");
  });
  it("handles NZST in winter", () => {
    expect(formatDateTime("2026-06-30T23:05:00Z")).toBe("01/07/2026 11:05am");
  });
  it("empty for null", () => {
    expect(formatDate(null)).toBe("");
  });
});
