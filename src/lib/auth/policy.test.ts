import { describe, expect, it } from "vitest";
import { isLockedOut, needsSecondStep, validPin } from "./policy";

describe("auth policy", () => {
  it("locks out after 5 failures", () => {
    expect(isLockedOut(4)).toBe(false);
    expect(isLockedOut(5)).toBe(true);
  });
  it("PINs: 4–6 digits, not all-same or a straight run", () => {
    expect(validPin("4826")).toBe(true);
    expect(validPin("482613")).toBe(true);
    expect(validPin("123")).toBe(false);
    expect(validPin("1234567")).toBe(false);
    expect(validPin("1111")).toBe(false);
    expect(validPin("1234")).toBe(false);
    expect(validPin("4321")).toBe(false);
    expect(validPin("12a4")).toBe(false);
  });
  it("second step only for Director and Office", () => {
    expect(needsSecondStep("director")).toBe(true);
    expect(needsSecondStep("office")).toBe(true);
    expect(needsSecondStep("workshop")).toBe(false);
    expect(needsSecondStep("crew")).toBe(false);
    expect(needsSecondStep(null)).toBe(false);
  });
});
