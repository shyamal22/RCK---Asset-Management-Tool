import { describe, expect, it } from "vitest";
import { holdRemaining, movedTooFar, PRESS_MIN_HOLD_MS } from "./press";

describe("press controller timing", () => {
  it("keeps a quick tap visible for the minimum hold", () => {
    expect(holdRemaining(1000, 1030)).toBe(PRESS_MIN_HOLD_MS - 30);
    expect(holdRemaining(1000, 1500)).toBe(0);
  });
  it("cancels once the finger moves more than the slop (a scroll, not a tap)", () => {
    expect(movedTooFar(100, 100, 106, 103)).toBe(false);
    expect(movedTooFar(100, 100, 100, 112)).toBe(true);
    expect(movedTooFar(100, 100, 91, 100)).toBe(true);
  });
});
