import { describe, expect, it } from "vitest";
import { clientStatus } from "./status";

describe("clientStatus", () => {
  const base = { suspended_at: null, invite_accepted: true, setup_completed_at: "2026-11-22T00:00:00Z" };
  it("suspended wins over everything", () => {
    expect(clientStatus({ ...base, suspended_at: "x", invite_accepted: false }).label).toBe("On hold");
  });
  it("waits for the Director, then for setup", () => {
    expect(clientStatus({ ...base, invite_accepted: false, setup_completed_at: null }).label).toBe("Director invited");
    expect(clientStatus({ ...base, setup_completed_at: null }).label).toBe("Setting up");
    expect(clientStatus(base)).toEqual({ label: "Active", tone: "green" });
  });
});
