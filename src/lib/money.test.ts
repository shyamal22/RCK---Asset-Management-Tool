import { describe, expect, it } from "vitest";
import { formatCents, gstOn, parseDollars } from "./money";

describe("money", () => {
  it("parses dollars to integer cents without float error", () => {
    expect(parseDollars("1,234.5")).toBe(123450);
    expect(parseDollars("$0.10")).toBe(10);
    expect(parseDollars("19.99")).toBe(1999);
    expect(parseDollars("2000")).toBe(200000);
    expect(parseDollars("")).toBeNull();
    expect(() => parseDollars("12.345")).toThrow();
    expect(() => parseDollars("abc")).toThrow();
  });
  it("formats NZD", () => {
    expect(formatCents(123450)).toBe("$1,234.50");
  });
  it("GST at 15%, rounded to the cent", () => {
    expect(gstOn(10000)).toBe(1500);
    expect(gstOn(333)).toBe(50);
  });
});
