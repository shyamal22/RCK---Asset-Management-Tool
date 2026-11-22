import { describe, expect, it } from "vitest";
import { FAILED, NO_SIGNAL, safeAction } from "./safe-action";

describe("safeAction", () => {
  it("passes results through", async () => {
    expect(await safeAction(Promise.resolve({ ok: true as const }))).toEqual({ ok: true });
  });
  it("a dropped connection becomes a no-signal error that doesn't promise nothing was saved", async () => {
    expect(await safeAction(Promise.reject(new TypeError("Load failed")))).toEqual({ ok: false, error: NO_SIGNAL });
    expect(NO_SIGNAL).toMatch(/couldn't confirm/);
  });
  it("forms can give their own no-signal wording (damage reports can't be sent twice)", async () => {
    expect(await safeAction(Promise.reject(new TypeError("Failed to fetch")), { offline: "x" })).toEqual({ ok: false, error: "x" });
  });
  it("a server failure is not blamed on the signal", async () => {
    expect(await safeAction(Promise.reject(new Error("An error occurred in the Server Components render")))).toEqual({ ok: false, error: FAILED });
  });
  it("lets Next.js redirects through", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/sign-in;307;" });
    await expect(safeAction(Promise.reject(redirectError))).rejects.toBe(redirectError);
  });
});
