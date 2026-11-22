import { describe, expect, it } from "vitest";
import { setupSections } from "./setup";

const labels = (userType: Parameters<typeof setupSections>[0]["userType"], flags: ("workshop_lead")[] = []) =>
  setupSections({ userType, flags }).map((s) => s.label);

describe("Setup visibility (docs/10)", () => {
  it("Director sees everything", () => {
    expect(labels("director")).toEqual(["Company", "Assets", "Yards and crews", "Users", "Sign-up link", "Audit log"]);
  });
  it("only the Director sees Setup (Sam, 22/11/2026)", () => {
    expect(labels("office")).toEqual([]);
    expect(labels("workshop")).toEqual([]);
    expect(labels("workshop", ["workshop_lead"])).toEqual([]);
    expect(labels("supervisor")).toEqual([]);
    expect(labels("crew")).toEqual([]);
  });
});
