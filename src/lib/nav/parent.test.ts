import { describe, expect, it } from "vitest";
import { isTabRoot, parentOf } from "./parent";

describe("parentOf (the ‹ Back target)", () => {
  it("tab roots have no back", () => {
    for (const p of ["/", "/assets", "/reports", "/kre", "/setup", "/me"]) {
      expect(isTabRoot(p)).toBe(true);
      expect(parentOf(p, "", true)).toBeNull();
    }
  });
  it("detail screens go to their list", () => {
    expect(parentOf("/assets/abc", "", false)).toBe("/assets");
    expect(parentOf("/reports/abc", "", false)).toBe("/reports");
    expect(parentOf("/reports/new", "?asset=x", false)).toBe("/reports");
    expect(parentOf("/kre/abc", "", false)).toBe("/kre");
    expect(parentOf("/me/security", "", false)).toBe("/me");
  });
  it("editing a machine goes back to that machine; adding one goes to Assets", () => {
    expect(parentOf("/setup/assets/abc", "", true)).toBe("/assets/abc");
    expect(parentOf("/setup/assets/new", "", true)).toBe("/assets");
  });
  it("setup pages go to Setup, or Home for people without a Setup tab", () => {
    expect(parentOf("/setup/company", "", true)).toBe("/setup");
    expect(parentOf("/setup/users", "", false)).toBe("/");
    expect(parentOf("/setup/users/abc", "", false)).toBe("/setup/users");
  });
  it("first-run setup steps back one step; the first step has no back until setup is done", () => {
    expect(parentOf("/setup/start", "?step=link", false)).toBe("/setup/start?step=yards");
    expect(parentOf("/setup/start", "?step=yards", false)).toBe("/setup/start?step=company");
    expect(parentOf("/setup/start", "", false)).toBeNull();
    expect(parentOf("/setup/start", "", true)).toBe("/setup");
  });
});
