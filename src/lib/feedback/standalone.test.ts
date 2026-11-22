import { describe, expect, it } from "vitest";
import { inBrowserOnIos } from "./standalone";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

describe("inBrowserOnIos", () => {
  it("shows in Safari or another app's browser sheet on an iPhone", () => {
    expect(inBrowserOnIos({ userAgent: IPHONE, standalone: false }, false)).toBe(true);
  });
  it("stays hidden in the installed home-screen app", () => {
    expect(inBrowserOnIos({ userAgent: IPHONE, standalone: true }, false)).toBe(false);
    expect(inBrowserOnIos({ userAgent: IPHONE }, true)).toBe(false);
  });
  it("treats an iPad that reports itself as a Mac as iOS", () => {
    expect(inBrowserOnIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 5 }, false)).toBe(true);
    expect(inBrowserOnIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 0 }, false)).toBe(false);
  });
  it("never shows on Android or desktop", () => {
    expect(inBrowserOnIos({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7)" }, false)).toBe(false);
  });
});
