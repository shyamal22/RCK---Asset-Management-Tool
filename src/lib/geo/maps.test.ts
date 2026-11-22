import { describe, expect, it } from "vitest";
import { mapsHref } from "./maps";

describe("mapsHref", () => {
  it("sends iPhones to Apple Maps with the machine code as the pin label", () => {
    expect(mapsHref(-36.68, 174.45, "PAV-01", "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)")).toBe("https://maps.apple.com/?ll=-36.68,174.45&q=PAV-01");
  });
  it("sends everyone else to Google Maps", () => {
    expect(mapsHref(-36.68, 174.45, "PAV-01", "Mozilla/5.0 (Linux; Android 14)")).toBe("https://www.google.com/maps/search/?api=1&query=-36.68,174.45");
    expect(mapsHref(-36.68, 174.45, "PAV-01", null)).toContain("google.com/maps");
  });
});
