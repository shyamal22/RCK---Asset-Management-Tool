import { describe, expect, it } from "vitest";
import { checkedToday } from "./today";

describe("checkedToday (NZ date)", () => {
  it("uses the New Zealand day, not UTC", () => {
    const now = new Date("2026-11-22T20:00:00Z"); // 9am Mon 23 Nov in NZ (NZDT)
    expect(checkedToday("2026-11-22T19:30:00Z", now)).toBe(true); // 8:30am 23 Nov NZ
    expect(checkedToday("2026-11-22T10:00:00Z", now)).toBe(false); // 11pm 22 Nov NZ
    expect(checkedToday(null, now)).toBe(false);
  });
});
