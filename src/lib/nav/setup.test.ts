import { describe, expect, it } from "vitest";
import { setupSections } from "./setup";

const labels = (userType: Parameters<typeof setupSections>[0]["userType"], flags: ("workshop_lead")[] = []) =>
  setupSections({ userType, flags }).map((s) => s.label);

describe("Setup visibility (docs/10)", () => {
  it("Director sees everything", () => {
    expect(labels("director")).toEqual(["Company", "Assets", "Yards and crews", "Users", "Sign-up link", "Audit log"]);
  });
  it("Office sees assets and pending users (suppliers, compliance come later)", () => {
    expect(labels("office")).toEqual(["Assets", "Users"]);
  });
  it("Supervisor and Crew never see Setup", () => {
    expect(labels("supervisor")).toEqual([]);
    expect(labels("crew")).toEqual([]);
  });
  it("Workshop sees assets (templates/intervals arrive in M2)", () => {
    expect(labels("workshop")).toEqual(["Assets"]);
    expect(labels("workshop", ["workshop_lead"])).toEqual(["Assets"]);
  });
});
