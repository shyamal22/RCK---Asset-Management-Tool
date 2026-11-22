import { describe, expect, it } from "vitest";
import { backlightFor } from "./backlight";

describe("backlightFor (wheel glow)", () => {
  it("follows the status", () => {
    expect(backlightFor("available")).toBe("green");
    expect(backlightFor("in_use")).toBe("green");
    expect(backlightFor("in_workshop")).toBe("yellow");
    expect(backlightFor("at_subcontractor")).toBe("yellow");
    expect(backlightFor("unusable")).toBe("red");
    expect(backlightFor("parked")).toBe("none");
  });
  it("an open damage report outranks the status", () => {
    expect(backlightFor("in_use", { flag: "yellow" })).toBe("yellow");
    expect(backlightFor("available", { flag: "red" })).toBe("red");
    expect(backlightFor("in_workshop", { flag: "red" })).toBe("red");
  });
});
