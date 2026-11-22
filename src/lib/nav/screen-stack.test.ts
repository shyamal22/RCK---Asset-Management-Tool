import { describe, expect, it } from "vitest";
import { ScreenStack } from "./screen-stack";

const walk = (...urls: string[]) => {
  const s = new ScreenStack();
  urls.forEach((u) => s.visit(u));
  return s;
};

describe("ScreenStack (where ‹ Back goes)", () => {
  it("goes back to the filtered list it came from", () => {
    expect(walk("/", "/assets?status=available", "/assets/a").backReaches("/assets", "/assets/a")).toBe(true);
  });
  it("opened cold on a screen: no history, so push the parent instead", () => {
    expect(walk("/assets/a").backReaches("/assets", "/assets/a")).toBe(false);
  });
  it("came from somewhere else (Home card): push the parent, don't go back to Home", () => {
    expect(walk("/", "/assets/a").backReaches("/assets", "/assets/a")).toBe(false);
  });
  it("follows the phone's own back gesture (review finding: Home → machine → Assets tab → system back)", () => {
    const s = walk("/", "/assets/a", "/assets", "/assets/a"); // last visit is the system back
    expect(s.backReaches("/assets", "/assets/a")).toBe(false); // below is Home now, so push /assets
  });
  it("two levels deep and back keeps the list filters", () => {
    const s = walk("/assets?view=list", "/assets/a", "/setup/assets/a");
    expect(s.backReaches("/assets/a", "/setup/assets/a")).toBe(true);
    s.visit("/assets/a"); // router.back()
    expect(s.backReaches("/assets", "/assets/a")).toBe(true); // → /assets?view=list via history
  });
  it("Setup → Assets list → a machine goes back to the Setup list", () => {
    expect(walk("/setup", "/setup/assets", "/setup/assets/a").backReaches("/assets/a", "/setup/assets/a")).toBe(true);
    expect(walk("/setup/assets", "/setup/assets/new").backReaches("/assets", "/setup/assets/new")).toBe(true);
  });
  it("first-run setup steps go back to the exact previous step", () => {
    expect(walk("/setup/start?step=company", "/setup/start?step=yards").backReaches("/setup/start?step=company", "/setup/start")).toBe(true);
    expect(walk("/setup/start?step=link").backReaches("/setup/start?step=yards", "/setup/start")).toBe(false);
  });
});
