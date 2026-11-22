import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("opens full screen from the phone home screen with KRE icons that exist", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of m.icons ?? []) expect(existsSync(path.join(process.cwd(), "public", i.src)), i.src).toBe(true);
    expect(existsSync(path.join(process.cwd(), "public/icons/apple-touch-icon.png"))).toBe(true);
  });
});
