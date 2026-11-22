import { describe, expect, it } from "vitest";
import { NO_SIGNAL, safeAction } from "./safe-action";

describe("safeAction", () => {
  it("passes results through", async () => {
    expect(await safeAction(Promise.resolve({ ok: true as const }))).toEqual({ ok: true });
  });
  it("turns a dropped connection into a form error", async () => {
    expect(await safeAction(Promise.reject(new TypeError("Load failed")))).toEqual({ ok: false, error: NO_SIGNAL });
  });
  it("lets Next.js redirects through", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/sign-in;307;" });
    await expect(safeAction(Promise.reject(redirectError))).rejects.toBe(redirectError);
  });
});
