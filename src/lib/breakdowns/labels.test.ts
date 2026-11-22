import { describe, expect, it } from "vitest";
import { ago, pgTextArray } from "./labels";

describe("ago", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");
  it("reads like a person would say it", () => {
    expect(ago("2026-11-22T11:59:30Z", now)).toBe("Just now");
    expect(ago("2026-11-22T11:30:00Z", now)).toBe("30 minutes ago");
    expect(ago("2026-11-22T11:00:00Z", now)).toBe("1 hour ago");
    expect(ago("2026-11-20T12:00:00Z", now)).toBe("2 days ago");
  });
});

describe("pgTextArray", () => {
  it("quotes and escapes", () => {
    expect(pgTextArray(["a/b.jpg", 'x"y'])).toBe('{"a/b.jpg","x\\"y"}');
  });
});
