import { afterEach, describe, expect, it, vi } from "vitest";
import { haptic } from "./haptics";

function fakeWindow(opts: { vibrate?: boolean; reduced?: boolean; ua?: string }) {
  const vibrate = vi.fn();
  vi.stubGlobal("window", { matchMedia: () => ({ matches: !!opts.reduced }) });
  vi.stubGlobal("navigator", { userAgent: opts.ua ?? "Android", ...(opts.vibrate ? { vibrate } : {}) });
  return vibrate;
}

afterEach(() => vi.unstubAllGlobals());

describe("haptic", () => {
  it("vibrates with a distinct pattern per kind (Android)", () => {
    const v = fakeWindow({ vibrate: true });
    haptic("tap");
    haptic("success");
    haptic("error");
    expect(v.mock.calls.map((c) => c[0])).toEqual([12, [14, 60, 20], [30, 50, 30, 50, 30]]);
  });

  it("still buzzes with Reduce Motion on (a buzz isn't motion)", () => {
    const v = fakeWindow({ vibrate: true, reduced: true });
    haptic("error");
    expect(v).toHaveBeenCalled();
  });

  it("does nothing on a desktop browser with no vibration", () => {
    fakeWindow({ ua: "Mozilla/5.0 (Windows NT 10.0)" });
    expect(() => haptic("tap")).not.toThrow();
  });
});
